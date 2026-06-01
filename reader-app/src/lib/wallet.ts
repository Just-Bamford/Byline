import {
  Keypair,
  Account,
  TransactionBuilder,
  Networks,
  Operation,
  Server,
  nativeAsset,
  xdr,
} from "stellar-sdk";
import axios from "axios";

export interface AccessToken {
  reader: string;
  article_id: string;
  price: number;
  timestamp: number;
  expiry: number;
  signature: string;
}

export class WalletManager {
  private keypair: Keypair;
  private publicKey: string;
  private server: Server;
  private account: Account | null = null;
  private network: string = "testnet";

  constructor(keypair?: Keypair) {
    this.keypair = keypair || Keypair.random();
    this.publicKey = this.keypair.publicKey();
    this.server = new Server(
      this.network === "testnet"
        ? "https://horizon-testnet.stellar.org"
        : "https://horizon.stellar.org",
    );
  }

  getPublicKey(): string {
    return this.publicKey;
  }

  getKeypair(): Keypair {
    return this.keypair;
  }

  async getBalance(): Promise<number> {
    try {
      const account = await this.server
        .accounts()
        .accountId(this.publicKey)
        .call();
      const nativeBalance = account.balances.find(
        (b) => b.asset_type === "native",
      );
      return parseFloat(nativeBalance?.balance || "0");
    } catch (error) {
      console.error("Failed to fetch balance:", error);
      return 0;
    }
  }

  async ensureAccount(): Promise<Account> {
    if (this.account) return this.account;

    try {
      this.account = await this.server.loadAccount(this.publicKey);
      return this.account;
    } catch (error) {
      console.error("Failed to load account:", error);
      throw new Error("Account not found on network");
    }
  }

  async purchaseArticle(
    contractId: string,
    articleId: string,
    price: number,
    publisherAddress: string,
  ): Promise<AccessToken> {
    try {
      const account = await this.ensureAccount();

      // Convert price to stroops (1 XLM = 10,000,000 stroops)
      const priceStroops = Math.floor(price * 10000000);

      const transaction = new TransactionBuilder(account, {
        fee: "100",
        networkPassphrase:
          this.network === "testnet"
            ? Networks.TESTNET_NETWORK_PASSPHRASE
            : Networks.PUBLIC_NETWORK_PASSPHRASE,
      })
        .addOperation(
          Operation.invokeHostFunction({
            func: xdr.HostFunction.hostFunctionTypeInvokeContract(
              xdr.InvokeContractArgs.contractInvoke(
                xdr.ContractIdPreimage.contractIdFromSourceAccount(
                  xdr.ContractIdPreimageFromSourceAccount.contractIdPreimageFromSourceAccount(
                    Keypair.fromPublicKey(contractId).rawPublicKey(),
                    xdr.SequenceNumber.sequenceNumber(
                      xdr.Int64.fromString("0"),
                    ),
                  ),
                ),
                xdr.ScSymbol.scSymbol(Buffer.from("purchase_access")),
                xdr.ScVal.scVecScVal([
                  xdr.ScVal.scVecScVal([]),
                  xdr.ScVal.scVecScVal([]),
                  xdr.ScVal.scVecScVal([]),
                  xdr.ScVal.scVecScVal([]),
                ]),
              ),
            ),
          }),
        )
        .setTimeout(30)
        .build();

      transaction.sign(this.keypair);

      const result = await this.server.submitTransaction(transaction);

      const token: AccessToken = {
        reader: this.publicKey,
        article_id: articleId,
        price,
        timestamp: Math.floor(Date.now() / 1000),
        expiry: Math.floor(Date.now() / 1000) + 86400,
        signature: result.hash,
      };

      return token;
    } catch (error) {
      console.error("Purchase failed:", error);
      throw new Error("Failed to purchase article");
    }
  }

  async topUp(amount: number): Promise<string> {
    try {
      // Use Friendbot for testnet funding
      const fundingUrl = `https://friendbot.stellar.org?addr=${this.publicKey}`;
      const response = await axios.get(fundingUrl);
      return response.data.hash;
    } catch (error) {
      console.error("Top-up failed:", error);
      throw new Error("Failed to top up wallet");
    }
  }

  async transfer(
    destination: string,
    amount: number,
    memo?: string,
  ): Promise<string> {
    try {
      const account = await this.ensureAccount();

      const builder = new TransactionBuilder(account, {
        fee: "100",
        networkPassphrase:
          this.network === "testnet"
            ? Networks.TESTNET_NETWORK_PASSPHRASE
            : Networks.PUBLIC_NETWORK_PASSPHRASE,
      })
        .addOperation(
          Operation.payment({
            destination,
            asset: nativeAsset(),
            amount: amount.toString(),
          }),
        )
        .setTimeout(30);

      if (memo) {
        builder.addMemo({ type: "text", value: memo });
      }

      const tx = builder.build();
      tx.sign(this.keypair);

      const result = await this.server.submitTransaction(tx);
      return result.hash;
    } catch (error) {
      console.error("Transfer failed:", error);
      throw new Error("Failed to transfer funds");
    }
  }

  static fromSecret(secret: string): WalletManager {
    const keypair = Keypair.fromSecret(secret);
    return new WalletManager(keypair);
  }

  static create(): WalletManager {
    return new WalletManager();
  }
}
