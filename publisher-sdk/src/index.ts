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
   * Set article price on contract
   */
  async setArticlePrice(articleId: string, priceXlm: number): Promise<void> {
    try {
      if (priceXlm < 0) {
        throw new Error("Price cannot be negative");
      }

      // TODO: Call Soroban contract to set price
      // For now, log the action
      console.log(
        `[Byline SDK] Setting price for article ${articleId}: ${priceXlm} XLM`,
      );
    } catch (error) {
      console.error("Failed to set article price:", error);
      throw error;
    }
  }

  /**
   * Get article price from contract
   */
  async getArticlePrice(articleId: string): Promise<number> {
    try {
      // TODO: Query Soroban contract for current price
      // For now, return default
      console.log(`[Byline SDK] Getting price for article ${articleId}`);
      return 0.002; // 0.002 XLM default
    } catch (error) {
      console.error("Failed to get article price:", error);
      return 0;
    }
  }

  /**
   * Get multiple article prices
   */
  async getArticlePrices(articleIds: string[]): Promise<Map<string, number>> {
    const prices = new Map<string, number>();

    for (const articleId of articleIds) {
      try {
        const price = await this.getArticlePrice(articleId);
        prices.set(articleId, price);
      } catch (error) {
        console.error(`Failed to get price for article ${articleId}:`, error);
        prices.set(articleId, 0);
      }
    }

    return prices;
  }

  /**
   * Register article on contract
   */
  async registerArticle(
    articleId: string,
    title: string,
    price: number,
  ): Promise<void> {
    try {
      if (!articleId || !title) {
        throw new Error("articleId and title are required");
      }
      if (price < 0) {
        throw new Error("Price cannot be negative");
      }

      // TODO: Call contract to register article
      console.log(
        `[Byline SDK] Registering article: ${articleId} (${title}) at ${price} XLM`,
      );
    } catch (error) {
      console.error("Failed to register article:", error);
      throw error;
    }
  }

  /**
   * Get publisher earnings
   */
  async getEarnings(): Promise<{
    total: number;
    pending: number;
    settled: number;
    currency: string;
    lastUpdated: number;
  }> {
    try {
      const response = await this.httpClient.get("/earnings");
      return {
        ...response.data,
        currency: response.data.currency || "XLM",
        lastUpdated: Date.now(),
      };
    } catch (error) {
      console.error("Failed to get earnings:", error);
      return {
        total: 0,
        pending: 0,
        settled: 0,
        currency: "XLM",
        lastUpdated: Date.now(),
      };
    }
  }

  /**
   * Get analytics for a specific article
   */
  async getArticleAnalytics(articleId: string): Promise<{
    reads: number;
    revenue: number;
    avgPrice: number;
  }> {
    try {
      const response = await this.httpClient.get(`/articles/${articleId}/stats`);
      return {
        reads: response.data.reads || 0,
        revenue: response.data.revenue || 0,
        avgPrice: response.data.avgPrice || 0,
      };
    } catch (error) {
      console.error(`Failed to get analytics for article ${articleId}:`, error);
      return { reads: 0, revenue: 0, avgPrice: 0 };
    }
  }

  /**
   * Get analytics for all articles
   */
  async getAllArticleAnalytics(): Promise<{
    articles: Array<{ articleId: string; reads: number; revenue: number }>;
    total: { reads: number; revenue: number };
  }> {
    try {
      const response = await this.httpClient.get("/articles/stats");
      return {
        articles: response.data.articles || [],
        total: response.data.total || { reads: 0, revenue: 0 },
      };
    } catch (error) {
      console.error("Failed to get article analytics:", error);
      return { articles: [], total: { reads: 0, revenue: 0 } };
    }
  }

  /**
   * Get reader statistics
   */
  async getReaderAnalytics(readerId: string): Promise<{
    totalSpent: number;
    articlesRead: number;
    avgPrice: number;
  }> {
    try {
      const response = await this.httpClient.get(`/readers/${readerId}/stats`);
      return {
        totalSpent: response.data.totalSpent || 0,
        articlesRead: response.data.articlesRead || 0,
        avgPrice: response.data.avgPrice || 0,
      };
    } catch (error) {
      console.error(`Failed to get analytics for reader ${readerId}:`, error);
      return { totalSpent: 0, articlesRead: 0, avgPrice: 0 };
    }
  }

  /**
   * Get top performing articles
   */
  async getTopArticles(limit: number = 10): Promise<
    Array<{ articleId: string; reads: number; revenue: number; avgPrice: number }>
  > {
    try {
      const response = await this.httpClient.get("/top-articles", {
        params: { limit },
      });
      return response.data || [];
    } catch (error) {
      console.error("Failed to get top articles:", error);
      return [];
    }
  }

  /**
   * Record a read event
   */
  async recordRead(articleId: string, readerId: string, price: number): Promise<void> {
    try {
      if (!articleId || !readerId) {
        throw new Error("articleId and readerId are required");
      }
      if (price < 0) {
        throw new Error("Price cannot be negative");
      }

      await this.httpClient.post("/record-read", {
        articleId,
        readerId,
        price,
      });
    } catch (error) {
      console.error("Failed to record read:", error);
      throw error;
    }
  }

export default BylinePublisher;

/**
 * ============================================================================
 * SDK USAGE EXAMPLES
 * ============================================================================
 *
 * Basic Setup:
 * ```typescript
 * import BylinePublisher from "@byline/publisher-sdk";
 *
 * const byline = new BylinePublisher({
 *   contractId: "CBVG3Z4VBW34DGRVW5YSQQ2XYGOWXHVCM25LJKSM2PQBKGXQJNFRHR7",
 *   verificationServiceUrl: "http://localhost:3000",
 *   publisherAddress: "GBUQWP3BOUZX34ULNQG23RQ6F4BVDERBSUM2QYU5WRAPPER5OINANIBJLQ",
 * });
 * ```
 *
 * From Environment Variables:
 * ```typescript
 * const byline = BylinePublisher.fromEnv();
 * ```
 *
 * Verify Token:
 * ```typescript
 * const token = {
 *   reader: "GBQCEJBGX5XNNXKHWVWPNZ3EXIPY3GBDKWQKFQ5QGBP2J4VKQCN5Q2O",
 *   article_id: "article-123",
 *   price: 500000,
 *   timestamp: 1705100000,
 *   expiry: 1705186400,
 * };
 *
 * const isValid = await byline.verifyToken(token);
 * if (isValid) {
 *   console.log("Access granted!");
 * }
 * ```
 *
 * Check Token Expiry:
 * ```typescript
 * const timeRemaining = byline.getTokenTimeRemaining(token);
 * console.log(`Token valid for ${timeRemaining} more seconds`);
 * ```
 *
 * Get Earnings:
 * ```typescript
 * const earnings = await byline.getEarnings();
 * console.log(`Total earnings: ${earnings.total} XLM`);
 * ```
 *
 * Get Article Stats:
 * ```typescript
 * const stats = await byline.getArticleAnalytics("article-123");
 * console.log(`Reads: ${stats.reads}, Revenue: ${stats.revenue} XLM`);
 * ```
 *
 * Record Read Event:
 * ```typescript
 * await byline.recordRead("article-123", "reader-id", 0.005);
 * ```
 *
 * ============================================================================
 */
