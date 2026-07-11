import axios, { AxiosInstance } from "axios";

/**
 * Access token returned by the Byline contract
 */
export interface AccessToken {
  reader: string;
  article_id: string;
  price: number;
  timestamp: number;
  expiry: number;
  nonce?: number;
  signature?: string;
}

/**
 * SDK configuration
 */
export interface BylineConfig {
  contractId: string;
  verificationServiceUrl: string;
  publisherAddress: string;
  apiKey?: string;
}

/**
 * Byline Publisher SDK
 * Drop-in integration for publishers to verify tokens and track analytics
 */
export class BylinePublisher {
  private config: BylineConfig;
  private httpClient: AxiosInstance;
  private tokenCache: Map<string, { valid: boolean; expiry: number }>;

  /**
   * Initialize SDK with configuration
   */
  constructor(config: BylineConfig) {
    this.validateConfig(config);
    this.config = config;
    this.tokenCache = new Map();

    // Setup HTTP client
    this.httpClient = axios.create({
      baseURL: config.verificationServiceUrl,
      timeout: 5000,
      headers: {
        "Content-Type": "application/json",
        ...(config.apiKey && { Authorization: `Bearer ${config.apiKey}` }),
      },
    });
  }

  /**
   * Validate configuration
   */
  private validateConfig(config: BylineConfig): void {
    if (!config.contractId) {
      throw new Error("contractId is required");
    }
    if (!config.verificationServiceUrl) {
      throw new Error("verificationServiceUrl is required");
    }
    if (!config.publisherAddress) {
      throw new Error("publisherAddress is required");
    }
  }

  /**
   * Verify an access token from a reader
   * Returns true if valid, false otherwise
   */
  async verifyToken(token: AccessToken): Promise<boolean> {
    try {
      const response = await axios.post(
        `${this.config.verificationServiceUrl}/verify`,
        {
          token,
          contractId: this.config.contractId,
        },
      );
      return response.data.valid;
    } catch (error) {
      console.error("Token verification failed:", error);
      return false;
    }
  }

  /**
   * Set article price (in USD, converted to XLM by contract)
   */
  async setArticlePrice(articleId: string, priceUsd: number): Promise<void> {
    // TODO: Call contract to set price
    console.log(`Setting price for ${articleId}: $${priceUsd}`);
  }

  /**
   * Get article price
   */
  async getArticlePrice(articleId: string): Promise<number> {
    // TODO: Query contract for price
    return 0.002;
  }

  /**
   * Get publisher earnings
   */
  async getEarnings(): Promise<{
    total: number;
    pending: number;
    settled: number;
  }> {
    // TODO: Query backend for earnings
    return { total: 0, pending: 0, settled: 0 };
  }
}

export default BylinePublisher;
