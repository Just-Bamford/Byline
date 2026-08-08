import axios, { AxiosInstance } from "axios";
import {
  DashboardStats,
  PublisherProfile,
  ArticleRegistrationInput,
  ApiResponse,
  Article,
} from "../types";

const API_BASE_URL = process.env.REACT_APP_API_URL || "/api";

class PublisherApi {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
    });

    // Add auth token to requests if available
    this.client.interceptors.request.use((config) => {
      const token = localStorage.getItem("auth_token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
  }

  /**
   * Get publisher profile
   */
  async getProfile(publisherAddress: string): Promise<PublisherProfile> {
    const response = await this.client.get<ApiResponse<PublisherProfile>>(
      `/publishers/${publisherAddress}/profile`,
    );
    if (!response.data.success) {
      throw new Error(response.data.error || "Failed to fetch profile");
    }
    return response.data.data!;
  }

  /**
   * Get dashboard stats (earnings, reads, top readers, etc.)
   */
  async getDashboardStats(publisherAddress: string): Promise<DashboardStats> {
    const response = await this.client.get<ApiResponse<DashboardStats>>(
      `/publishers/${publisherAddress}/stats`,
    );
    if (!response.data.success) {
      throw new Error(response.data.error || "Failed to fetch stats");
    }
    return response.data.data!;
  }

  /**
   * Get articles for publisher
   */
  async getArticles(publisherAddress: string): Promise<Article[]> {
    const response = await this.client.get<ApiResponse<Article[]>>(
      `/publishers/${publisherAddress}/articles`,
    );
    if (!response.data.success) {
      throw new Error(response.data.error || "Failed to fetch articles");
    }
    return response.data.data!;
  }

  /**
   * Register new article on-chain
   * Calls Soroban smart contract via backend
   */
  async registerArticle(
    publisherAddress: string,
    input: ArticleRegistrationInput,
  ): Promise<{ transactionId: string; articleId: string }> {
    const response = await this.client.post<
      ApiResponse<{ transactionId: string; articleId: string }>
    >(`/publishers/${publisherAddress}/articles/register`, {
      articleId: input.articleId,
      title: input.title,
      price: input.price,
      priceType: input.priceType,
    });
    if (!response.data.success) {
      throw new Error(response.data.error || "Failed to register article");
    }
    return response.data.data!;
  }

  /**
   * Update article price on-chain
   */
  async updateArticlePrice(
    publisherAddress: string,
    articleId: string,
    newPrice: number,
  ): Promise<{ transactionId: string }> {
    const response = await this.client.put<
      ApiResponse<{ transactionId: string }>
    >(`/publishers/${publisherAddress}/articles/${articleId}/price`, {
      newPrice,
    });
    if (!response.data.success) {
      throw new Error(response.data.error || "Failed to update price");
    }
    return response.data.data!;
  }

  /**
   * Get earnings history for chart
   */
  async getEarningsHistory(
    publisherAddress: string,
    days: number = 30,
  ): Promise<Array<{ date: string; amount: number }>> {
    const response = await this.client.get<
      ApiResponse<Array<{ date: string; amount: number }>>
    >(`/publishers/${publisherAddress}/earnings-history`, {
      params: { days },
    });
    if (!response.data.success) {
      throw new Error(
        response.data.error || "Failed to fetch earnings history",
      );
    }
    return response.data.data!;
  }

  /**
   * Get top readers for publisher
   */
  async getTopReaders(
    publisherAddress: string,
    limit: number = 10,
  ): Promise<
    Array<{ address: string; readCount: number; totalSpent: number }>
  > {
    const response = await this.client.get<
      ApiResponse<
        Array<{ address: string; readCount: number; totalSpent: number }>
      >
    >(`/publishers/${publisherAddress}/top-readers`, {
      params: { limit },
    });
    if (!response.data.success) {
      throw new Error(response.data.error || "Failed to fetch top readers");
    }
    return response.data.data!;
  }
}

export const publisherApi = new PublisherApi();
