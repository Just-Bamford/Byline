/**
 * Analytics service
 * Tracks reads, revenue, and publisher metrics
 */

interface ReadEvent {
  articleId: string;
  readerId: string;
  price: number;
  timestamp: number;
}

interface ArticleStats {
  reads: number;
  revenue: number;
  avgPrice: number;
  lastRead: number;
}

// TODO: Replace with actual database
const reads: ReadEvent[] = [];
const articleStats: { [key: string]: ArticleStats } = {};

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
      reads: 0,
      revenue: 0,
      avgPrice: 0,
      lastRead: 0,
    };
  }

  const stats = articleStats[articleId];
  stats.reads += 1;
  stats.revenue += price;
  stats.avgPrice = stats.revenue / stats.reads;
  stats.lastRead = event.timestamp;
}

export async function getEarnings(): Promise<{
  total: number;
  pending: number;
  settled: number;
}> {
  const total = reads.reduce((sum, read) => sum + read.price, 0);

  return {
    total,
    pending: 0, // TODO: Track pending vs settled
    settled: total,
  };
}

export async function getArticleStats(
  articleId: string,
): Promise<ArticleStats> {
  return (
    articleStats[articleId] || {
      reads: 0,
      revenue: 0,
      avgPrice: 0,
      lastRead: 0,
    }
  );
}

export async function getAllArticleStats(): Promise<{
  [key: string]: ArticleStats;
}> {
  return articleStats;
}

export async function getReaderStats(readerId: string): Promise<{
  totalSpent: number;
  articlesRead: number;
  avgPrice: number;
}> {
  const readerReads = reads.filter((r) => r.readerId === readerId);
  const totalSpent = readerReads.reduce((sum, r) => sum + r.price, 0);

  return {
    totalSpent,
    articlesRead: readerReads.length,
    avgPrice: readerReads.length > 0 ? totalSpent / readerReads.length : 0,
  };
}

export async function getTopArticles(limit: number = 10): Promise<
  Array<{
    articleId: string;
    reads: number;
    revenue: number;
  }>
> {
  return Object.entries(articleStats)
    .map(([articleId, stats]) => ({
      articleId,
      reads: stats.reads,
      revenue: stats.revenue,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
}
