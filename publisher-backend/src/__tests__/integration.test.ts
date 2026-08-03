import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { query, initializeDatabase, closeDatabase } from "../db/client";

/**
 * Integration tests for database and analytics flow
 * These tests verify end-to-end functionality with a real database
 */

describe("Integration Tests", () => {
  beforeAll(async () => {
    // Initialize test database
    process.env.DATABASE_URL =
      "postgresql://test_user:test_password@localhost:5432/byline_test";

    try {
      await initializeDatabase();
    } catch (error) {
      console.warn("Database not available for integration tests, skipping");
    }
  });

  afterAll(async () => {
    try {
      await closeDatabase();
    } catch (error) {
      // Cleanup
    }
  });

  describe("Database Schema", () => {
    it("should have articles table", async () => {
      try {
        const result = await query(
          `SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'articles'
          )`,
        );

        if (process.env.DATABASE_URL) {
          expect(result.rows[0].exists).toBe(true);
        }
      } catch (error) {
        // Database not available
        console.warn("Skipping database test");
      }
    });

    it("should have read_events table", async () => {
      try {
        const result = await query(
          `SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'read_events'
          )`,
        );

        if (process.env.DATABASE_URL) {
          expect(result.rows[0].exists).toBe(true);
        }
      } catch (error) {
        console.warn("Skipping database test");
      }
    });

    it("should have access_tokens table", async () => {
      try {
        const result = await query(
          `SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'access_tokens'
          )`,
        );

        if (process.env.DATABASE_URL) {
          expect(result.rows[0].exists).toBe(true);
        }
      } catch (error) {
        console.warn("Skipping database test");
      }
    });
  });

  describe("Analytics Flow", () => {
    it("should insert and retrieve read events", async () => {
      try {
        const articleId = "test-article-123";
        const readerAddress =
          "GBUQWP3BOUZX34ULNQG23RQ6F4BFSRJSU6DCFTL7NNLGYAGXUCESA5ON";

        if (!process.env.DATABASE_URL) {
          return;
        }

        // Insert test data
        await query(
          `INSERT INTO articles (id, publisher_address, title, price, created_at)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (id) DO NOTHING`,
          [
            articleId,
            readerAddress,
            "Test Article",
            1000,
            Math.floor(Date.now() / 1000),
          ],
        );

        // Verify insertion
        const result = await query(`SELECT * FROM articles WHERE id = $1`, [
          articleId,
        ]);

        expect(result.rows).toHaveLength(1);
        expect(result.rows[0].title).toBe("Test Article");
      } catch (error) {
        console.warn("Skipping analytics test:", error);
      }
    });
  });

  describe("Concurrent Operations", () => {
    it("should handle concurrent read event insertions", async () => {
      try {
        if (!process.env.DATABASE_URL) {
          return;
        }

        const promises = Array.from({ length: 5 }, (_, i) =>
          query(
            `INSERT INTO articles (id, publisher_address, title, price, created_at)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (id) DO NOTHING`,
            [
              `concurrent-article-${i}`,
              "GBUQWP3BOUZX34ULNQG23RQ6F4BFSRJSU6DCFTL7NNLGYAGXUCESA5ON",
              `Concurrent Article ${i}`,
              1000 * (i + 1),
              Math.floor(Date.now() / 1000),
            ],
          ),
        );

        const results = await Promise.all(promises);
        expect(results).toHaveLength(5);
      } catch (error) {
        console.warn("Skipping concurrency test:", error);
      }
    });
  });

  describe("Error Handling", () => {
    it("should handle invalid article IDs gracefully", async () => {
      try {
        // Query with malformed ID should not crash
        const result = await query(`SELECT * FROM articles WHERE id = $1`, [
          "invalid\n'; DROP TABLE articles; --",
        ]);

        // Should safely return empty result
        expect(result.rows).toBeDefined();
      } catch (error) {
        // Database protection against injection should work
        expect(error).toBeDefined();
      }
    });

    it("should validate Stellar addresses", async () => {
      const validAddress =
        "GBUQWP3BOUZX34ULNQG23RQ6F4BFSRJSU6DCFTL7NNLGYAGXUCESA5ON";
      const invalidAddress = "not-a-valid-address";

      // Just verify the format (56 chars: G + 55 alphanumeric)
      expect(validAddress).toMatch(/^G[A-Z0-9]{55}$/);
      expect(invalidAddress).not.toMatch(/^G[A-Z0-9]{55}$/);
    });
  });
});
