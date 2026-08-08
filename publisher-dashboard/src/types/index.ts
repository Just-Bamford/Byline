export interface Article {
  id: string;
  title: string;
  price: number;
  priceType: "stroops" | "usdc";
  reads: number;
  revenue: number;
  createdAt: string;
  publishedAt: string;
}

export interface EarningsData {
  date: string;
  amount: number;
}

export interface Reader {
  address: string;
  readCount: number;
  totalSpent: number;
}

export interface DashboardStats {
  totalEarnings: number;
  totalReads: number;
  articleCount: number;
  topArticle: Article | null;
  recentArticles: Article[];
  readerStats: Reader[];
  earningsHistory: EarningsData[];
}

export interface PublisherProfile {
  address: string;
  name: string;
  bio: string;
  website?: string;
  twitter?: string;
  joinedAt: string;
}

export interface ArticleRegistrationInput {
  articleId: string;
  title: string;
  price: number;
  priceType: "stroops" | "usdc";
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
