import {
  SorobanRpc,
  Contract,
  Networks,
  TransactionBuilder,
  BASE_FEE,
  Keypair,
  nativeToScVal,
  scValToNative,
  Address,
  xdr,
} from "@stellar/stellar-sdk";
import * as dotenv from "dotenv";
dotenv.config();

const RPC_URL = process.env.STELLAR_RPC_URL!;
const CONTRACT_ID = process.env.CONTRACT_ID!;
const NETWORK_PASSPHRASE =
  process.env.STELLAR_NETWORK_PASSPHRASE ?? Networks.TESTNET;
const PUBLISHER_SECRET = process.env.PUBLISHER_SECRET_KEY!;

export const rpc = new SorobanRpc.Server(RPC_URL, { allowHttp: false });
export const contract = new Contract(CONTRACT_ID);

/**
 * Call a read-only contract method (no transaction needed).
 * Uses simulateTransaction for cheap, instant reads.
 */
export async function contractQuery(
  method: string,
  ...args: xdr.ScVal[]
): Promise<xdr.ScVal> {
  const keypair = Keypair.fromSecret(PUBLISHER_SECRET);
  const account = await rpc.getAccount(keypair.publicKey());

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build();

  const result = await rpc.simulateTransaction(tx);

  if (SorobanRpc.Api.isSimulationError(result)) {
    throw new Error(`Contract query failed: ${result.error}`);
  }

  const simResult = result as SorobanRpc.Api.SimulateTransactionSuccessResponse;
  if (!simResult.result?.retval) {
    throw new Error("No return value from contract");
  }

  return simResult.result.retval;
}

/**
 * Submit a state-changing transaction to the contract.
 */
export async function contractInvoke(
  method: string,
  ...args: xdr.ScVal[]
): Promise<xdr.ScVal | null> {
  const keypair = Keypair.fromSecret(PUBLISHER_SECRET);
  const account = await rpc.getAccount(keypair.publicKey());

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
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

  preparedTx.sign(keypair);

  const sendResult = await rpc.sendTransaction(preparedTx);

  if (sendResult.status === "ERROR") {
    throw new Error(`Transaction failed: ${sendResult.errorResult}`);
  }

  // Poll for confirmation
  let getResult = await rpc.getTransaction(sendResult.hash);
  let attempts = 0;
  while (
    getResult.status === SorobanRpc.Api.GetTransactionStatus.NOT_FOUND &&
    attempts < 10
  ) {
    await new Promise((r) => setTimeout(r, 1000));
    getResult = await rpc.getTransaction(sendResult.hash);
    attempts++;
  }

  if (getResult.status === SorobanRpc.Api.GetTransactionStatus.SUCCESS) {
    return getResult.returnValue ?? null;
  }

  throw new Error(`Transaction did not confirm: ${getResult.status}`);
}

/**
 * Verify reader access by calling verify_token on the contract.
 */
export async function verifyAccess(
  readerAddress: string,
  articleId: string,
): Promise<boolean> {
  const result = await contractQuery(
    "verify_token",
    new Address(readerAddress).toScVal(),
    nativeToScVal(articleId, { type: "string" }),
  );
  return scValToNative(result) as boolean;
}

/**
 * Get article price in stroops from the contract.
 */
export async function getArticlePrice(articleId: string): Promise<bigint> {
  const result = await contractQuery(
    "get_article_price",
    nativeToScVal(articleId, { type: "string" }),
  );
  return scValToNative(result) as bigint;
}

/**
 * Get total reads count from the contract.
 */
export async function getTotalReads(): Promise<number> {
  const result = await contractQuery("get_total_reads");
  return Number(scValToNative(result));
}
