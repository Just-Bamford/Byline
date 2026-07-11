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
   * Get current configuration
   */
  getConfig(): Readonly<BylineConfig> {
    return Object.freeze({ ...this.config });
  }

  /**
   * Update configuration at runtime
   */
  updateConfig(updates: Partial<BylineConfig>): void {
    const newConfig = { ...this.config, ...updates };
    this.validateConfig(newConfig);
    this.config = newConfig;
  }

  /**
   * Clear token cache
   */
  clearCache(): void {
    this.tokenCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.tokenCache.size,
      entries: Array.from(this.tokenCache.keys()),
    };
  }

  /**
   * Initialize SDK with default configuration
   * Used for easy setup
   */
  static create(config: BylineConfig): BylinePublisher {
    return new BylinePublisher(config);
  }

  /**
   * Create SDK with environment variables
   */
  static fromEnv(): BylinePublisher {
    const contractId = process.env.STELLAR_CONTRACT_ID;
    const verificationServiceUrl = process.env.PUBLISHER_API_URL;
    const publisherAddress = process.env.PUBLISHER_ADDRESS;
    const apiKey = process.env.PUBLISHER_API_KEY;

    if (!contractId || !verificationServiceUrl || !publisherAddress) {
      throw new Error(
        "Missing required environment variables: STELLAR_CONTRACT_ID, PUBLISHER_API_URL, PUBLISHER_ADDRESS",
      );
    }

    return new BylinePublisher({
      contractId,
      verificationServiceUrl,
      publisherAddress,
      apiKey,
    });
  }

  /**
   * Verify an access token from a reader
   * Returns true if valid, false otherwise
   */
  async verifyToken(token: AccessToken): Promise<boolean> {
    try {
      // Check cache first
      const cacheKey = `${token.reader}:${token.article_id}`;
      const cached = this.tokenCache.get(cacheKey);
      if (cached && Date.now() < cached.expiry) {
        return cached.valid;
      }

      const response = await this.httpClient.post("/verify", {
        token,
        contractId: this.config.contractId,
        articleId: token.article_id,
      });

      const isValid = response.data.valid;

      // Cache result
      this.tokenCache.set(cacheKey, {
        valid: isValid,
        expiry: token.expiry * 1000 || Date.now() + 5 * 60 * 1000,
      });

      return isValid;
    } catch (error) {
      console.error("Token verification failed:", error);
      return false;
    }
  }

  /**
   * Verify token and get detailed information
   */
  async verifyTokenDetailed(token: AccessToken): Promise<{
    valid: boolean;
    articleId?: string;
    expiresAt?: number;
    error?: string;
  }> {
    try {
      const response = await this.httpClient.post("/verify", {
        token,
        contractId: this.config.contractId,
      });

      return {
        valid: response.data.valid,
        articleId: response.data.articleId,
        expiresAt: response.data.expiresAt,
      };
    } catch (error: any) {
      return {
        valid: false,
        error: error.message || "Verification failed",
      };
    }
  }

  /**
   * Check if token is expired
   */
  isTokenExpired(token: AccessToken): boolean {
    const currentTime = Math.floor(Date.now() / 1000);
    return currentTime > token.expiry;
  }

  /**
   * Get token remaining validity in seconds
   */
  getTokenTimeRemaining(token: AccessToken): number {
    const currentTime = Math.floor(Date.now() / 1000);
    const remaining = token.expiry - currentTime;
    return Math.max(0, remaining);
  }

  /**
   * Grant access to article (after verification)
   * Helper method for publishers
   */
  async grantAccess(
    token: AccessToken,
  ): Promise<{ granted: boolean; articleId: string }> {
    const isValid = await this.verifyToken(token);
    return {
      granted: isValid,
      articleId: token.article_id,
    };
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
