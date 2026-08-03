/**
 * Analytics service
 * Records and retrieves article read events and earnings data
 * Backed by PostgreSQL database
 */

import { query, queryOne, queryMany, transaction } from "../db/client";

export interface ReadEvent {
  article_id: string;
  reader_address: string;
  publisher_address: string;
  price_paid: number;
  duration_seconds?: number;
}

export interface ArticleStats {
  article_id: string;
  title?: string;
  read_count: number;
  unique_readers: number;
  total_revenue: number;
  avg_price: number;
}

export interface PublisherEarnings {
  total: number;
  pending: number;
  settled: number;
  read_count: number;
  unique_readers: number;
  last_settlement_at?: number;
}

export interface ReaderStats {
  reader_address: string;
  total_spent: number;
  articles_read: number;
  first_read_at?: number;
  last_read_at?: number;
}

/**
 * Record an article read event
 */
export async function recordRead(event: ReadEvent): Promise<void> {
  const timestamp = Math.floor(Date.now() / 1000);
  const createdAt = Math.floor(Date.now() / 1000);

  await transaction(async (client) => {
    // 1. Record the read event
    await client.query(
      `INSERT INTO read_events 
       (article_id, reader_address, publisher_address, price_paid, duration_seconds, timestamp, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        event.article_id,
        event.reader_address,
        event.publisher_address,
        event.price_paid,
        event.duration_seconds || 0,
        timestamp,
        createdAt,
      ],
    );

    // 2. Update publisher earnings
    await client.query(
      `INSERT INTO publisher_earnings (publisher_address, total_earned, pending_settlement, read_count, updated_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (publisher_address) DO UPDATE SET
         total_earned = publisher_earnings.total_earned + $2,
         pending_settlement = publisher_earnings.pending_settlement + $3,
         read_count = publisher_earnings.read_count + 1,
         updated_at = $5`,
      [
        event.publisher_address,
        event.price_paid,
        event.price_paid,
        1,
        createdAt,
      ],
    );

    // 3. Update reader stats
    await client.query(
      `INSERT INTO reader_stats (reader_address, total_spent, articles_read, first_read_at, last_read_at, updated_at)
       VALUES ($1, $2, 1, $3, $4, $5)
       ON CONFLICT (reader_address) DO UPDATE SET
         total_spent = reader_stats.total_spent + $2,
         articles_read = reader_stats.articles_read + 1,
         last_read_at = $4,
         updated_at = $5`,
      [event.reader_address, event.price_paid, timestamp, timestamp, createdAt],
    );
  });
}

/**
 * Get publisher earnings
 */
export async function getEarnings(
  publisherAddress: string,
): Promise<PublisherEarnings> {
  const result = await queryOne<any>(
    `SELECT total_earned, pending_settlement, settled_amount, read_count, unique_readers, last_settlement_at
     FROM publisher_earnings
     WHERE publisher_address = $1`,
    [publisherAddress],
  );

  return {
    total: result?.total_earned || 0,
    pending: result?.pending_settlement || 0,
    settled: result?.settled_amount || 0,
    read_count: result?.read_count || 0,
    unique_readers: result?.unique_readers || 0,
    last_settlement_at: result?.last_settlement_at,
  };
}

/**
 * Get all earnings (aggregated)
 */
export async function getAggregateEarnings(): Promise<{
  total: number;
  pending: number;
  settled: number;
  total_reads: number;
  unique_readers: number;
}> {
  const result = await queryOne<any>(
    `SELECT 
       SUM(total_earned) as total_earned,
       SUM(pending_settlement) as pending_settlement,
       SUM(settled_amount) as settled_amount,
       SUM(read_count) as total_reads,
       COUNT(DISTINCT publisher_address) as unique_publishers
     FROM publisher_earnings`,
  );

  return {
    total: result?.total_earned || 0,
    pending: result?.pending_settlement || 0,
    settled: result?.settled_amount || 0,
    total_reads: result?.total_reads || 0,
    unique_readers: result?.unique_publishers || 0,
  };
}

/**
 * Get stats for a specific article
 */
export async function getArticleStats(
  articleId: string,
): Promise<ArticleStats> {
  const result = await queryOne<any>(
    `SELECT 
       a.id as article_id,
       a.title,
       COUNT(DISTINCT re.id) as read_count,
       COUNT(DISTINCT re.reader_address) as unique_readers,
       COALESCE(SUM(re.price_paid), 0) as total_revenue,
       COALESCE(AVG(re.price_paid), 0) as avg_price
     FROM articles a
     LEFT JOIN read_events re ON a.id = re.article_id
     WHERE a.id = $1
     GROUP BY a.id, a.title`,
    [articleId],
  );

  if (!result) {
    return {
      article_id: articleId,
      read_count: 0,
      unique_readers: 0,
      total_revenue: 0,
      avg_price: 0,
    };
  }

  return {
    article_id: result.article_id,
    title: result.title,
    read_count: parseInt(result.read_count),
    unique_readers: parseInt(result.unique_readers),
    total_revenue: parseInt(result.total_revenue),
    avg_price: parseFloat(result.avg_price),
  };
}

/**
 * Get stats for all articles
 */
export async function getAllArticleStats(): Promise<ArticleStats[]> {
  const results = await queryMany<any>(
    `SELECT 
       a.id as article_id,
       a.title,
       COUNT(DISTINCT re.id) as read_count,
       COUNT(DISTINCT re.reader_address) as unique_readers,
       COALESCE(SUM(re.price_paid), 0) as total_revenue,
       COALESCE(AVG(re.price_paid), 0) as avg_price
     FROM articles a
     LEFT JOIN read_events re ON a.id = re.article_id
     GROUP BY a.id, a.title
     ORDER BY total_revenue DESC`,
  );

  return results.map((row) => ({
    article_id: row.article_id,
    title: row.title,
    read_count: parseInt(row.read_count),
    unique_readers: parseInt(row.unique_readers),
    total_revenue: parseInt(row.total_revenue),
    avg_price: parseFloat(row.avg_price),
  }));
}

/**
 * Get stats for a specific reader
 */
export async function getReaderStats(
  readerAddress: string,
): Promise<ReaderStats | null> {
  const result = await queryOne<any>(
    `SELECT reader_address, total_spent, articles_read, first_read_at, last_read_at
     FROM reader_stats
     WHERE reader_address = $1`,
    [readerAddress],
  );

  if (!result) return null;

  return {
    reader_address: result.reader_address,
    total_spent: result.total_spent,
    articles_read: result.articles_read,
    first_read_at: result.first_read_at,
    last_read_at: result.last_read_at,
  };
}

/**
 * Get top performing articles
 */
export async function getTopArticles(
  limit: number = 10,
): Promise<ArticleStats[]> {
  const results = await queryMany<any>(
    `SELECT 
       a.id as article_id,
       a.title,
       COUNT(DISTINCT re.id) as read_count,
       COUNT(DISTINCT re.reader_address) as unique_readers,
       COALESCE(SUM(re.price_paid), 0) as total_revenue,
       COALESCE(AVG(re.price_paid), 0) as avg_price
     FROM articles a
     LEFT JOIN read_events re ON a.id = re.article_id
     GROUP BY a.id, a.title
     ORDER BY total_revenue DESC
     LIMIT $1`,
    [limit],
  );

  return results.map((row) => ({
    article_id: row.article_id,
    title: row.title,
    read_count: parseInt(row.read_count),
    unique_readers: parseInt(row.unique_readers),
    total_revenue: parseInt(row.total_revenue),
    avg_price: parseFloat(row.avg_price),
  }));
}

/**
 * Get top readers by spending
 */
export async function getTopReaders(
  limit: number = 10,
): Promise<ReaderStats[]> {
  const results = await queryMany<any>(
    `SELECT reader_address, total_spent, articles_read, first_read_at, last_read_at
     FROM reader_stats
     ORDER BY total_spent DESC
     LIMIT $1`,
    [limit],
  );

  return results.map((row) => ({
    reader_address: row.reader_address,
    total_spent: row.total_spent,
    articles_read: row.articles_read,
    first_read_at: row.first_read_at,
    last_read_at: row.last_read_at,
  }));
}
