import axios, { AxiosInstance } from "axios";

export interface ArticleStats {
  articleId: string;
  reads: number;
  revenue: number;
  avgPrice: number;
}

export interface PublisherStats {
  totalReads: number;
  totalRevenue: number;
  uniqueReaders: number;
  avgPricePerArticle: number;
  topArticle: string;
}

export interface ReaderStats {
  totalSpent: number;
  articlesRead: number;
  avgPrice: number;
}

const API_BASE_URL = process.env.VITE_API_URL || "http://localhost:3000";

class AnalyticsService {
  private httpClient: AxiosInstance;

  constructor(apiUrl: string = API_BASE_URL) {
    this.httpClient = axios.create({
      baseURL: apiUrl,
      timeout: 5000,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  /**
   * Get overall earnings
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
      return response.data;
    } catch (error) {
      console.error("Failed to fetch earnings:", error);
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
   * Get stats for specific article
   */
  async getArticleStats(articleId: string): Promise<ArticleStats> {
    try {
      const response = await this.httpClient.get(
        `/articles/${articleId}/stats`,
      );
      return {
        articleId,
        reads: response.data.reads || 0,
        revenue: response.data.revenue || 0,
        avgPrice: response.data.avgPrice || 0,
      };
    } catch (error) {
      console.error(`Failed to fetch stats for article ${articleId}:`, error);
      return { articleId, reads: 0, revenue: 0, avgPrice: 0 };
    }
  }

  /**
   * Get stats for all articles
   */
  async getAllArticleStats(): Promise<{
    articles: ArticleStats[];
    total: { reads: number; revenue: number };
  }> {
    try {
      const response = await this.httpClient.get("/articles/stats");
      return {
        articles: response.data.articles || [],
        total: response.data.total || { reads: 0, revenue: 0 },
      };
    } catch (error) {
      console.error("Failed to fetch all article stats:", error);
      return { articles: [], total: { reads: 0, revenue: 0 } };
    }
  }

  /**
   * Get stats for specific reader
   */
  async getReaderStats(readerId: string): Promise<ReaderStats> {
    try {
      const response = await this.httpClient.get(`/readers/${readerId}/stats`);
      return {
        totalSpent: response.data.totalSpent || 0,
        articlesRead: response.data.articlesRead || 0,
        avgPrice: response.data.avgPrice || 0,
      };
    } catch (error) {
      console.error(`Failed to fetch stats for reader ${readerId}:`, error);
      return { totalSpent: 0, articlesRead: 0, avgPrice: 0 };
    }
  }

  /**
   * Get top performing articles
   */
  async getTopArticles(limit: number = 10): Promise<
    Array<{
      articleId: string;
      reads: number;
      revenue: number;
      avgPrice: number;
    }>
  > {
    try {
      const response = await this.httpClient.get("/top-articles", {
        params: { limit },
      });
      return response.data || [];
    } catch (error) {
      console.error("Failed to fetch top articles:", error);
      return [];
    }
  }

  /**
   * Record a read event
   */
  async recordRead(
    articleId: string,
    readerId: string,
    price: number,
  ): Promise<void> {
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

  /**
   * Get analytics summary with caching
   */
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  async getCachedEarnings(): Promise<any> {
    const cacheKey = "earnings";
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    const data = await this.getEarnings();
    this.cache.set(cacheKey, { data, timestamp: Date.now() });
    return data;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

export const analyticsService = new AnalyticsService();
