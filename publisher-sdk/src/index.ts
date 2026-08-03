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

/**
 * Byline SDK configuration
 */
export interface BylineConfig {
  contractId: string;
  rpcUrl: string;
  networkPassphrase?: string;
  publisherSecretKey?: string;
}

/**
 * Byline Publisher SDK
 * Query and interact with Soroban smart contract for token verification and pricing
 */
export class BylineSDK {
  private contractId: string;
  private rpc: SorobanRpc.Server;
  private contract: Contract;
  private networkPassphrase: string;
  private publisherSecretKey?: string;

  /**
   * Initialize SDK with configuration
   */
  constructor(config: BylineConfig) {
    this.validateConfig(config);
    this.contractId = config.contractId;
    this.networkPassphrase = config.networkPassphrase ?? Networks.TESTNET;
    this.publisherSecretKey = config.publisherSecretKey;

    this.rpc = new SorobanRpc.Server(config.rpcUrl, { allowHttp: false });
    this.contract = new Contract(this.contractId);
  }

  /**
   * Validate configuration
   */
  private validateConfig(config: BylineConfig): void {
    if (!config.contractId) {
      throw new Error("contractId is required");
    }
    if (!config.rpcUrl) {
      throw new Error("rpcUrl is required");
    }
  }

  /**
   * Create SDK with environment variables
   */
  static fromEnv(): BylineSDK {
    const contractId = process.env.STELLAR_CONTRACT_ID;
    const rpcUrl = process.env.STELLAR_RPC_URL;
    const networkPassphrase = process.env.STELLAR_NETWORK_PASSPHRASE;
    const publisherSecretKey = process.env.PUBLISHER_SECRET_KEY;

    if (!contractId || !rpcUrl) {
      throw new Error(
        "Missing required environment variables: STELLAR_CONTRACT_ID, STELLAR_RPC_URL",
      );
    }

    return new BylineSDK({
      contractId,
      rpcUrl,
      networkPassphrase,
      publisherSecretKey,
    });
  }

  /**
   * Verify reader access via Soroban contract simulation
   * Returns true if reader has valid access token for the article
   */
  async verify(readerAddress: string, articleId: string): Promise<boolean> {
    try {
      if (!readerAddress || !articleId) {
        throw new Error("readerAddress and articleId are required");
      }

      // Create a dummy account for simulation (doesn't need to be real)
      const tempKeypair = Keypair.random();
      const account = await this.rpc.getAccount(tempKeypair.publicKey());

      const tx = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(
          this.contract.call(
            "verify_token",
            new Address(readerAddress).toScVal(),
            nativeToScVal(articleId, { type: "string" }),
          ),
        )
        .setTimeout(30)
        .build();

      const result = await this.rpc.simulateTransaction(tx);

      if (SorobanRpc.Api.isSimulationError(result)) {
        console.error(
          `[BylineSDK] Contract simulation error for verify_token: ${result.error}`,
        );
        return false;
      }

      const simResult =
        result as SorobanRpc.Api.SimulateTransactionSuccessResponse;
      if (!simResult.result?.retval) {
        console.error(
          "[BylineSDK] No return value from verify_token contract call",
        );
        return false;
      }

      return scValToNative(simResult.result.retval) as boolean;
    } catch (error) {
      console.error("[BylineSDK] Verification failed:", error);
      throw error;
    }
  }

  /**
   * Get article price in stroops from contract
   * Returns the price as a bigint (stroops, 1 XLM = 10_000_000 stroops)
   */
  async getPrice(articleId: string): Promise<bigint> {
    try {
      if (!articleId) {
        throw new Error("articleId is required");
      }

      const tempKeypair = Keypair.random();
      const account = await this.rpc.getAccount(tempKeypair.publicKey());

      const tx = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(
          this.contract.call(
            "get_article_price",
            nativeToScVal(articleId, { type: "string" }),
          ),
        )
        .setTimeout(30)
        .build();

      const result = await this.rpc.simulateTransaction(tx);

      if (SorobanRpc.Api.isSimulationError(result)) {
        console.error(
          `[BylineSDK] Contract simulation error for get_article_price: ${result.error}`,
        );
        return 0n;
      }

      const simResult =
        result as SorobanRpc.Api.SimulateTransactionSuccessResponse;
      if (!simResult.result?.retval) {
        console.error(
          "[BylineSDK] No return value from get_article_price contract call",
        );
        return 0n;
      }

      return scValToNative(simResult.result.retval) as bigint;
    } catch (error) {
      console.error("[BylineSDK] Price query failed:", error);
      throw error;
    }
  }

  /**
   * Get total reads count from contract
   */
  async getTotalReads(): Promise<number> {
    try {
      const tempKeypair = Keypair.random();
      const account = await this.rpc.getAccount(tempKeypair.publicKey());

      const tx = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(this.contract.call("get_total_reads"))
        .setTimeout(30)
        .build();

      const result = await this.rpc.simulateTransaction(tx);

      if (SorobanRpc.Api.isSimulationError(result)) {
        console.error(
          `[BylineSDK] Contract simulation error for get_total_reads: ${result.error}`,
        );
        return 0;
      }

      const simResult =
        result as SorobanRpc.Api.SimulateTransactionSuccessResponse;
      if (!simResult.result?.retval) {
        console.error(
          "[BylineSDK] No return value from get_total_reads contract call",
        );
        return 0;
      }

      return Number(scValToNative(simResult.result.retval));
    } catch (error) {
      console.error("[BylineSDK] Total reads query failed:", error);
      throw error;
    }
  }

  /**
   * Get contract info
   */
  getContractInfo(): {
    contractId: string;
    networkPassphrase: string;
    rpcUrl: string;
  } {
    return {
      contractId: this.contractId,
      networkPassphrase: this.networkPassphrase,
      rpcUrl: this.rpc.serverURL.toString(),
    };
  }

  /**
   * Helper to convert stroops to XLM
   */
  static stroopsToXlm(stroops: bigint | number): number {
    const val = typeof stroops === "bigint" ? stroops : BigInt(stroops);
    return Number(val) / 10_000_000;
  }

  /**
   * Helper to convert XLM to stroops
   */
  static xlmToStroops(xlm: number): bigint {
    return BigInt(Math.round(xlm * 10_000_000));
  }
}

export default BylineSDK;
