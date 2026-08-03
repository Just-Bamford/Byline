import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  recordRead,
  getArticleStats,
  getReaderStats,
  type ReadEvent,
} from "./analyticsService";

// Mock the database client
vi.mock("../db/client", () => ({
  query: vi.fn(),
  queryOne: vi.fn(),
  queryMany: vi.fn(),
  transaction: vi.fn((callback) => callback({ query: vi.fn() })),
}));

describe("Analytics Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("recordRead", () => {
    it("should accept valid read event", async () => {
      const event: ReadEvent = {
        article_id: "article-1",
        reader_address:
          "GBUQWP3BOUZX34ULNQG23RQ6F4BFSRJSU6DCFTL7NNLGYAGXUCESA5ON",
        publisher_address:
          "GBUQWP3BOUZX34ULNQG23RQ6F4BFSRJSU6DCFTL7NNLGYAGXUCESA5ON",
        price_paid: 1000,
        duration_seconds: 300,
      };

      // Should not throw
      await expect(recordRead(event)).resolves.not.toThrow();
    });

    it("should handle events without duration", async () => {
      const event: ReadEvent = {
        article_id: "article-1",
        reader_address:
          "GBUQWP3BOUZX34ULNQG23RQ6F4BFSRJSU6DCFTL7NNLGYAGXUCESA5ON",
        publisher_address:
          "GBUQWP3BOUZX34ULNQG23RQ6F4BFSRJSU6DCFTL7NNLGYAGXUCESA5ON",
        price_paid: 1000,
      };

      // Should not throw
      await expect(recordRead(event)).resolves.not.toThrow();
    });
  });

  describe("getArticleStats", () => {
    it("should return zero stats for non-existent article", async () => {
      const { queryOne } = await import("../db/client");
      vi.mocked(queryOne).mockResolvedValueOnce(null);

      const stats = await getArticleStats("non-existent");

      expect(stats).toEqual({
        article_id: "non-existent",
        read_count: 0,
        unique_readers: 0,
        total_revenue: 0,
        avg_price: 0,
      });
    });

    it("should parse article stats correctly", async () => {
      const { queryOne } = await import("../db/client");
      vi.mocked(queryOne).mockResolvedValueOnce({
        article_id: "article-1",
        title: "Test Article",
        read_count: "5",
        unique_readers: "3",
        total_revenue: "5000",
        avg_price: "1000",
      });

      const stats = await getArticleStats("article-1");

      expect(stats.article_id).toBe("article-1");
      expect(stats.read_count).toBe(5);
      expect(stats.unique_readers).toBe(3);
      expect(stats.total_revenue).toBe(5000);
      expect(stats.avg_price).toBe(1000);
    });
  });

  describe("getReaderStats", () => {
    it("should return null for non-existent reader", async () => {
      const { queryOne } = await import("../db/client");
      vi.mocked(queryOne).mockResolvedValueOnce(null);

      const stats = await getReaderStats("GBUQWP3...");

      expect(stats).toBeNull();
    });

    it("should parse reader stats correctly", async () => {
      const { queryOne } = await import("../db/client");
      vi.mocked(queryOne).mockResolvedValueOnce({
        reader_address: "GBUQWP3...",
        total_spent: "10000",
        articles_read: 5,
        first_read_at: 1000000000,
        last_read_at: 1000000100,
      });

      const stats = await getReaderStats("GBUQWP3...");

      expect(stats).not.toBeNull();
      expect(stats?.articles_read).toBe(5);
      expect(stats?.total_spent).toBe("10000");
    });
  });

  describe("data validation", () => {
    it("should validate article IDs", async () => {
      const invalidArticles = ["", null, undefined];

      for (const articleId of invalidArticles) {
        // Should handle gracefully
        await expect(
          getArticleStats(articleId as string),
        ).resolves.toBeDefined();
      }
    });

    it("should validate reader addresses", async () => {
      const invalidReaders = ["", null, undefined];

      for (const readerAddr of invalidReaders) {
        // Should handle gracefully (return null or empty)
        const result = await getReaderStats(readerAddr as string);
        expect(result === null || result === undefined).toBeTruthy();
      }
    });
  });
});
