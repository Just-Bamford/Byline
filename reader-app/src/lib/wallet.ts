import {
  isConnected,
  getPublicKey,
  signTransaction,
  requestAccess,
} from "@stellar/freighter-api";
import {
  SorobanRpc,
  Contract,
  Networks,
  TransactionBuilder,
  BASE_FEE,
  nativeToScVal,
  Address,
} from "@stellar/stellar-sdk";

const RPC_URL =
  import.meta.env.VITE_STELLAR_RPC_URL ?? "https://soroban-testnet.stellar.org";
const CONTRACT_ID = import.meta.env.VITE_CONTRACT_ID ?? "";
const NETWORK_PASSPHRASE = Networks.TESTNET;

export interface WalletState {
  connected: boolean;
  publicKey: string | null;
  type: "freighter" | "custodial" | null;
}

/**
 * Check if Freighter is installed in the browser.
 */
export async function isFreighterInstalled(): Promise<boolean> {
  try {
    return await isConnected();
  } catch {
    return false;
  }
}

/**
 * Connect Freighter wallet and return the public key.
 */
export async function connectFreighter(): Promise<string> {
  await requestAccess();
  const publicKey = await getPublicKey();
  if (!publicKey) throw new Error("Freighter returned no public key");
  return publicKey;
}

/**
 * Get XLM balance for a wallet address from Horizon.
 */
export async function getBalance(publicKey: string): Promise<string> {
  const rpc = new SorobanRpc.Server(RPC_URL);
  try {
    const account = await rpc.getAccount(publicKey);
    // account.balances is available via Horizon — use fetch fallback
    const resp = await fetch(
      `https://horizon-testnet.stellar.org/accounts/${publicKey}`,
    );
    const data = await resp.json();
    const xlm = data.balances?.find((b: any) => b.asset_type === "native");
    return xlm ? parseFloat(xlm.balance).toFixed(4) : "0.0000";
  } catch {
    return "0.0000";
  }
}

/**
 * Fund a testnet wallet from Friendbot.
 */
export async function fundFromFriendbot(publicKey: string): Promise<void> {
  const resp = await fetch(`https://friendbot.stellar.org?addr=${publicKey}`);
  if (!resp.ok) throw new Error("Friendbot funding failed");
}

/**
 * Purchase article access via the Byline Soroban contract.
 * Uses Freighter to sign the transaction.
 */
export async function purchaseArticle(
  readerPublicKey: string,
  articleId: string,
): Promise<{ success: boolean; txHash: string }> {
  const rpc = new SorobanRpc.Server(RPC_URL, { allowHttp: false });
  const contract = new Contract(CONTRACT_ID);

  const account = await rpc.getAccount(readerPublicKey);

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      contract.call(
        "purchase_access",
        new Address(readerPublicKey).toScVal(),
        nativeToScVal(articleId, { type: "string" }),
      ),
    )
    .setTimeout(30)
    .build();

  const simResult = await rpc.simulateTransaction(tx);
  if (SorobanRpc.Api.isSimulationError(simResult)) {
    throw new Error(`Simulation failed: ${simResult.error}`);
  }

  const preparedTx = SorobanRpc.assembleTransaction(
    tx,
    simResult as SorobanRpc.Api.SimulateTransactionSuccessResponse,
  ).build();

  // Sign with Freighter
  const signedXdr = await signTransaction(preparedTx.toXDR(), {
    networkPassphrase: NETWORK_PASSPHRASE,
  });

  const signedTx = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);
  const sendResult = await rpc.sendTransaction(signedTx);

  if (sendResult.status === "ERROR") {
    throw new Error("Transaction submission failed");
  }

  // Poll for confirmation
  let result = await rpc.getTransaction(sendResult.hash);
  let attempts = 0;
  while (
    result.status === SorobanRpc.Api.GetTransactionStatus.NOT_FOUND &&
    attempts < 12
  ) {
    await new Promise((r) => setTimeout(r, 1000));
    result = await rpc.getTransaction(sendResult.hash);
    attempts++;
  }

  if (result.status === SorobanRpc.Api.GetTransactionStatus.SUCCESS) {
    return { success: true, txHash: sendResult.hash };
  }

  throw new Error(`Transaction failed: ${result.status}`);
}
