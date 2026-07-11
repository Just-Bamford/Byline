/**
 * Analytics service layer
 * Tracks reads, revenue, and publisher metrics
 * Provides aggregated analytics for dashboards
 */

interface ReadEvent {
  articleId: string;
  readerId: string;
  price: number;
  timestamp: number;
}

interface ArticleStats {
  articleId: string;
  reads: number;
  revenue: number;
  avgPrice: number;
  lastRead: number;
  publishers: number;
}

interface PublisherStats {
  totalReads: number;
  totalRevenue: number;
  uniqueReaders: number;
  avgPricePerArticle: number;
  topArticle: string;
}

// In-memory storage (replace with database in production)
const reads: ReadEvent[] = [];
const articleStats: { [key: string]: ArticleStats } = {};
const readerStats: { [key: string]: { spent: number; reads: number } } = {};

/**
 * Record a read event for analytics
 */
export async function recordRead(
  articleId: string,
  readerId: string,
  price: number,
): Promise<void> {
  const event: ReadEvent = {
    articleId,
    readerId,
    price,
    timestamp: Math.floor(Date.now() / 1000),
  };

  reads.push(event);

  // Update article stats
  if (!articleStats[articleId]) {
    articleStats[articleId] = {
      articleId,
      reads: 0,
      revenue: 0,
      avgPrice: 0,
      lastRead: 0,
      publishers: 0,
    };
  }

  const stats = articleStats[articleId];
  stats.reads += 1;
  stats.revenue += price;
  stats.avgPrice = stats.revenue / stats.reads;
  stats.lastRead = event.timestamp;

  // Update reader stats
  if (!readerStats[readerId]) {
    readerStats[readerId] = { spent: 0, reads: 0 };
  }
  readerStats[readerId].spent += price;
  readerStats[readerId].reads += 1;
}

/**
 * Get total publisher earnings
 */
export async function getEarnings(): Promise<{
  total: number;
  pending: number;
  settled: number;
  lastUpdated: number;
}> {
  const total = reads.reduce((sum, read) => sum + read.price, 0);

  return {
    total,
    pending: 0,
    settled: total,
    lastUpdated: Date.now(),
  };
}

/**
 * Get statistics for a specific article
 */
export async function getArticleStats(
  articleId: string,
): Promise<ArticleStats> {
  return (
    articleStats[articleId] || {
      articleId,
      reads: 0,
      revenue: 0,
      avgPrice: 0,
      lastRead: 0,
      publishers: 0,
    }
  );
}

/**
 * Get statistics for all articles
 */
export async function getAllArticleStats(): Promise<{
  articles: ArticleStats[];
  total: { reads: number; revenue: number };
}> {
  const articles = Object.values(articleStats);
  const total = {
    reads: articles.reduce((sum, a) => sum + a.reads, 0),
    revenue: articles.reduce((sum, a) => sum + a.revenue, 0),
  };

  return { articles, total };
}

/**
 * Get statistics for a specific reader
 */
export async function getReaderStats(readerId: string): Promise<{
  totalSpent: number;
  articlesRead: number;
  avgPrice: number;
  articlesReadList: string[];
}> {
  const readerReads = reads.filter((r) => r.readerId === readerId);
  const totalSpent = readerReads.reduce((sum, r) => sum + r.price, 0);
  const articlesReadList = [...new Set(readerReads.map((r) => r.articleId))];

  return {
    totalSpent,
    articlesRead: readerReads.length,
    avgPrice: readerReads.length > 0 ? totalSpent / readerReads.length : 0,
    articlesReadList,
  };
}

/**
 * Get top performing articles by revenue
 */
export async function getTopArticles(limit: number = 10): Promise<
  Array<{
    articleId: string;
    reads: number;
    revenue: number;
    avgPrice: number;
  }>
> {
  return Object.values(articleStats)
    .map((stats) => ({
      articleId: stats.articleId,
      reads: stats.reads,
      revenue: stats.revenue,
      avgPrice: stats.avgPrice,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
}

/**
 * Get publisher analytics summary
 */
export async function getPublisherStats(): Promise<PublisherStats> {
  const articles = Object.values(articleStats);
  const totalReads = articles.reduce((sum, a) => sum + a.reads, 0);
  const totalRevenue = articles.reduce((sum, a) => sum + a.revenue, 0);
  const uniqueReaders = new Set(reads.map((r) => r.readerId)).size;
  const topArticle =
    articles.length > 0
      ? articles.reduce((top, a) => (a.revenue > top.revenue ? a : top))
          .articleId
      : "";

  return {
    totalReads,
    totalRevenue,
    uniqueReaders,
    avgPricePerArticle:
      articles.length > 0
        ? articles.reduce((sum, a) => sum + a.avgPrice, 0) / articles.length
        : 0,
    topArticle,
  };
}
