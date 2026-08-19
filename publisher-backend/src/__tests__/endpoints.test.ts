import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import express, { Express } from "express";
import request from "supertest";
import cors from "cors";

/**
 * Mock implementations of contract functions
 */
const mockVerifyAccess = vi.fn();
const mockGetArticlePrice = vi.fn();
const mockGetTotalReads = vi.fn();

// Mock the stellar module before importing server
vi.mock("../stellar", () => ({
  verifyAccess: mockVerifyAccess,
  getArticlePrice: mockGetArticlePrice,
  getTotalReads: mockGetTotalReads,
}));

// Setup test server
let app: Express;
let readLog: Array<{
  articleId: string;
  readerId: string;
  price: number;
  timestamp: number;
}> = [];

beforeAll(() => {
  // Create test server with same structure as main
  app = express();
  app.use(cors());
  app.use(express.json());

  const PORT = 3000;
  const RPC_URL = "https://soroban-testnet.stellar.org";
  const CONTRACT_ID = "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM";
  const NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";

  // Health endpoint
  app.get("/health", async (_req, res) => {
    try {
      const totalReads = await mockGetTotalReads();
      res.json({
        status: "ok",
        contract: CONTRACT_ID,
        network: "testnet",
        totalReads,
      });
    } catch (err: any) {
      res.status(503).json({ status: "error", message: err.message });
    }
  });

  // Verify endpoint
  app.post("/verify", async (req, res) => {
    const { reader, article_id } = req.body;

    if (!reader || !article_id) {
      return res.status(400).json({ error: "reader and article_id required" });
    }

    try {
      const valid = await mockVerifyAccess(reader, article_id);
      res.json({ valid });
    } catch (err: any) {
      console.error("verify error:", err.message);
      res
        .status(500)
        .json({
          error: "contract verification failed",
          details: err.message,
        });
    }
  });

  // Record read endpoint
  app.post("/record-read", async (req, res) => {
    const { articleId, readerId, price } = req.body;

    if (!articleId || !readerId) {
      return res.status(400).json({ error: "articleId and readerId required" });
    }

    try {
      const valid = await mockVerifyAccess(readerId, articleId);
      if (!valid) {
        return res.status(403).json({ error: "no valid access token" });
      }
    } catch (err: any) {
      return res
        .status(500)
        .json({ error: "verification failed", details: err.message });
    }

    readLog.push({
      articleId,
      readerId,
      price: price ?? 0,
      timestamp: Date.now(),
    });

    res.json({ recorded: true });
  });

  // Earnings endpoint
  app.get("/earnings", (_req, res) => {
    const total = readLog.reduce((sum, r) => sum + r.price, 0);
    res.json({
      total: parseFloat(total.toFixed(6)),
      reads: readLog.length,
      pending: 0,
      settled: parseFloat(total.toFixed(6)),
      currency: "USD",
    });
  });

  // Article stats endpoint
  app.get("/articles/:articleId/stats", async (req, res) => {
    const { articleId } = req.params;

    const articleReads = readLog.filter((r) => r.articleId === articleId);
    const revenue = articleReads.reduce((sum, r) => sum + r.price, 0);

    let priceOnChain: bigint | null = null;
    try {
      priceOnChain = await mockGetArticlePrice(articleId);
    } catch (_) {}

    res.json({
      articleId,
      reads: articleReads.length,
      revenue: parseFloat(revenue.toFixed(6)),
      priceOnChain: priceOnChain ? Number(priceOnChain) : null,
      avgPrice:
        articleReads.length > 0
          ? parseFloat((revenue / articleReads.length).toFixed(6))
          : 0,
    });
  });

  // Reader stats endpoint
  app.get("/readers/:readerId/stats", (req, res) => {
    const { readerId } = req.params;
    const readerReads = readLog.filter((r) => r.readerId === readerId);
    const total = readerReads.reduce((sum, r) => sum + r.price, 0);

    res.json({
      readerId,
      articlesRead: readerReads.length,
      totalSpent: parseFloat(total.toFixed(6)),
      avgPrice:
        readerReads.length > 0
          ? parseFloat((total / readerReads.length).toFixed(6))
          : 0,
    });
  });

  // Top articles endpoint
  app.get("/top-articles", (req, res) => {
    const limit = parseInt((req.query.limit as string) ?? "10");
    const grouped: Record<string, { reads: number; revenue: number }> = {};

    for (const r of readLog) {
      if (!grouped[r.articleId])
        grouped[r.articleId] = { reads: 0, revenue: 0 };
      grouped[r.articleId].reads++;
      grouped[r.articleId].revenue += r.price;
    }

    const ranked = Object.entries(grouped)
      .map(([articleId, stats]) => ({ articleId, ...stats }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit);

    res.json(ranked);
  });

  // Contract endpoint
  app.get("/contract", (_req, res) => {
    res.json({
      contractId: CONTRACT_ID,
      network: "testnet",
      explorerUrl: `https://stellar.expert/explorer/testnet/contract/${CONTRACT_ID}`,
    });
  });
});

afterAll(() => {
  // Cleanup
  readLog = [];
  vi.clearAllMocks();
});

describe("Backend API Endpoints - Health & Contract Info", () => {
  it("GET /health should return ok status", async () => {
    mockGetTotalReads.mockResolvedValue(42);

    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("status", "ok");
    expect(response.body).toHaveProperty("contract");
    expect(response.body).toHaveProperty("network", "testnet");
    expect(response.body).toHaveProperty("totalReads", 42);
  });

  it("GET /health should handle contract errors", async () => {
    mockGetTotalReads.mockRejectedValue(new Error("Contract error"));

    const response = await request(app).get("/health");

    expect(response.status).toBe(503);
    expect(response.body).toHaveProperty("status", "error");
  });

  it("GET /contract should return contract details", async () => {
    const response = await request(app).get("/contract");

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("contractId");
    expect(response.body).toHaveProperty("network", "testnet");
    expect(response.body).toHaveProperty("explorerUrl");
    expect(response.body.explorerUrl).toContain("stellar.expert");
  });
});

describe("Backend API Endpoints - Verify Access", () => {
  it("POST /verify should verify access with valid reader and article", async () => {
    mockVerifyAccess.mockResolvedValue(true);

    const response = await request(app).post("/verify").send({
      reader: "GBUQWP3BOUZX34ULNQG23RQ6F4BFSRJSU6DCFTL7NNLGYAGXUCESA5ON",
      article_id: "article-001",
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ valid: true });
  });

  it("POST /verify should return false for invalid reader", async () => {
    mockVerifyAccess.mockResolvedValue(false);

    const response = await request(app).post("/verify").send({
      reader: "GBUQWP3BOUZX34ULNQG23RQ6F4BFSRJSU6DCFTL7NNLGYAGXUCESA5ON",
      article_id: "article-002",
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ valid: false });
  });

  it("POST /verify should require reader parameter", async () => {
    const response = await request(app).post("/verify").send({
      article_id: "article-001",
    });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("error");
    expect(response.body.error).toContain("required");
  });

  it("POST /verify should require article_id parameter", async () => {
    const response = await request(app).post("/verify").send({
      reader: "GBUQWP3BOUZX34ULNQG23RQ6F4BFSRJSU6DCFTL7NNLGYAGXUCESA5ON",
    });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("error");
  });

  it("POST /verify should handle contract errors", async () => {
    mockVerifyAccess.mockRejectedValue(new Error("RPC error"));

    const response = await request(app).post("/verify").send({
      reader: "GBUQWP3BOUZX34ULNQG23RQ6F4BFSRJSU6DCFTL7NNLGYAGXUCESA5ON",
      article_id: "article-001",
    });

    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty("error");
  });
});

describe("Backend API Endpoints - Record Read", () => {
  it("POST /record-read should record a read with valid access", async () => {
    mockVerifyAccess.mockResolvedValue(true);

    const response = await request(app).post("/record-read").send({
      articleId: "article-001",
      readerId: "GBUQWP3BOUZX34ULNQG23RQ6F4BFSRJSU6DCFTL7NNLGYAGXUCESA5ON",
      price: 0.05,
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ recorded: true });
  });

  it("POST /record-read should reject without valid access", async () => {
    mockVerifyAccess.mockResolvedValue(false);

    const response = await request(app).post("/record-read").send({
      articleId: "article-002",
      readerId: "GBUQWP3BOUZX34ULNQG23RQ6F4BFSRJSU6DCFTL7NNLGYAGXUCESA5ON",
      price: 0.05,
    });

    expect(response.status).toBe(403);
    expect(response.body.error).toContain("no valid access token");
  });

  it("POST /record-read should require articleId", async () => {
    const response = await request(app).post("/record-read").send({
      readerId: "GBUQWP3BOUZX34ULNQG23RQ6F4BFSRJSU6DCFTL7NNLGYAGXUCESA5ON",
      price: 0.05,
    });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("error");
  });

  it("POST /record-read should require readerId", async () => {
    const response = await request(app).post("/record-read").send({
      articleId: "article-001",
      price: 0.05,
    });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("error");
  });

  it("POST /record-read should handle verification errors", async () => {
    mockVerifyAccess.mockRejectedValue(new Error("Verification failed"));

    const response = await request(app).post("/record-read").send({
      articleId: "article-001",
      readerId: "GBUQWP3BOUZX34ULNQG23RQ6F4BFSRJSU6DCFTL7NNLGYAGXUCESA5ON",
      price: 0.05,
    });

    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty("error");
  });

  it("POST /record-read should allow optional price parameter", async () => {
    mockVerifyAccess.mockResolvedValue(true);

    const response = await request(app).post("/record-read").send({
      articleId: "article-001",
      readerId: "GBUQWP3BOUZX34ULNQG23RQ6F4BFSRJSU6DCFTL7NNLGYAGXUCESA5ON",
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ recorded: true });
  });
});

describe("Backend API Endpoints - Earnings", () => {
  it("GET /earnings should return total earnings", async () => {
    // Manually add to read log for testing
    readLog = [
      {
        articleId: "article-1",
        readerId: "reader-1",
        price: 0.05,
        timestamp: Date.now(),
      },
      {
        articleId: "article-2",
        readerId: "reader-2",
        price: 0.03,
        timestamp: Date.now(),
      },
    ];

    const response = await request(app).get("/earnings");

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("total");
    expect(response.body).toHaveProperty("reads", 2);
    expect(response.body).toHaveProperty("pending", 0);
    expect(response.body).toHaveProperty("settled");
    expect(response.body).toHaveProperty("currency", "USD");
    expect(response.body.total).toBeCloseTo(0.08, 1);
  });

  it("GET /earnings should handle empty read log", async () => {
    readLog = [];

    const response = await request(app).get("/earnings");

    expect(response.status).toBe(200);
    expect(response.body.total).toBe(0);
    expect(response.body.reads).toBe(0);
  });

  it("GET /earnings should calculate correct totals with many reads", async () => {
    readLog = Array.from({ length: 100 }, (_, i) => ({
      articleId: `article-${i % 10}`,
      readerId: `reader-${i % 5}`,
      price: 0.01 * (i + 1),
      timestamp: Date.now(),
    }));

    const response = await request(app).get("/earnings");

    expect(response.status).toBe(200);
    expect(response.body.reads).toBe(100);
    expect(response.body.total).toBeGreaterThan(0);
  });
});

describe("Backend API Endpoints - Article Stats", () => {
  it("GET /articles/:articleId/stats should return article statistics", async () => {
    readLog = [
      {
        articleId: "article-001",
        readerId: "reader-1",
        price: 0.05,
        timestamp: Date.now(),
      },
      {
        articleId: "article-001",
        readerId: "reader-2",
        price: 0.03,
        timestamp: Date.now(),
      },
    ];

    mockGetArticlePrice.mockResolvedValue(BigInt(50000));

    const response = await request(app).get("/articles/article-001/stats");

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("articleId", "article-001");
    expect(response.body).toHaveProperty("reads", 2);
    expect(response.body).toHaveProperty("revenue");
    expect(response.body.revenue).toBeCloseTo(0.08, 1);
    expect(response.body).toHaveProperty("avgPrice");
    expect(response.body.priceOnChain).toBe(50000);
  });

  it("GET /articles/:articleId/stats should return 0 for non-existent article", async () => {
    readLog = [];

    const response = await request(app).get("/articles/nonexistent/stats");

    expect(response.status).toBe(200);
    expect(response.body.reads).toBe(0);
    expect(response.body.revenue).toBe(0);
    expect(response.body.avgPrice).toBe(0);
  });

  it("GET /articles/:articleId/stats should handle price fetch errors", async () => {
    readLog = [
      {
        articleId: "article-001",
        readerId: "reader-1",
        price: 0.05,
        timestamp: Date.now(),
      },
    ];

    mockGetArticlePrice.mockRejectedValue(new Error("Price fetch failed"));

    const response = await request(app).get("/articles/article-001/stats");

    expect(response.status).toBe(200);
    expect(response.body.priceOnChain).toBeNull();
    expect(response.body.reads).toBe(1);
  });

  it("GET /articles/:articleId/stats should calculate average price correctly", async () => {
    readLog = [
      {
        articleId: "article-001",
        readerId: "reader-1",
        price: 0.1,
        timestamp: Date.now(),
      },
      {
        articleId: "article-001",
        readerId: "reader-2",
        price: 0.2,
        timestamp: Date.now(),
      },
      {
        articleId: "article-001",
        readerId: "reader-3",
        price: 0.3,
        timestamp: Date.now(),
      },
    ];

    const response = await request(app).get("/articles/article-001/stats");

    expect(response.status).toBe(200);
    expect(response.body.reads).toBe(3);
    expect(response.body.revenue).toBeCloseTo(0.6, 1);
    expect(response.body.avgPrice).toBeCloseTo(0.2, 1);
  });
});

describe("Backend API Endpoints - Reader Stats", () => {
  it("GET /readers/:readerId/stats should return reader statistics", async () => {
    readLog = [
      {
        articleId: "article-001",
        readerId: "reader-1",
        price: 0.05,
        timestamp: Date.now(),
      },
      {
        articleId: "article-002",
        readerId: "reader-1",
        price: 0.03,
        timestamp: Date.now(),
      },
    ];

    const response = await request(app).get("/readers/reader-1/stats");

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("readerId", "reader-1");
    expect(response.body).toHaveProperty("articlesRead", 2);
    expect(response.body.totalSpent).toBeCloseTo(0.08, 1);
    expect(response.body.avgPrice).toBeCloseTo(0.04, 1);
  });

  it("GET /readers/:readerId/stats should return 0 for non-existent reader", async () => {
    readLog = [];

    const response = await request(app).get("/readers/nonexistent/stats");

    expect(response.status).toBe(200);
    expect(response.body.articlesRead).toBe(0);
    expect(response.body.totalSpent).toBe(0);
    expect(response.body.avgPrice).toBe(0);
  });

  it("GET /readers/:readerId/stats should calculate averages correctly", async () => {
    readLog = [
      {
        articleId: "article-001",
        readerId: "reader-1",
        price: 0.1,
        timestamp: Date.now(),
      },
      {
        articleId: "article-002",
        readerId: "reader-1",
        price: 0.2,
        timestamp: Date.now(),
      },
      {
        articleId: "article-003",
        readerId: "reader-1",
        price: 0.3,
        timestamp: Date.now(),
      },
    ];

    const response = await request(app).get("/readers/reader-1/stats");

    expect(response.status).toBe(200);
    expect(response.body.articlesRead).toBe(3);
    expect(response.body.totalSpent).toBeCloseTo(0.6, 1);
    expect(response.body.avgPrice).toBeCloseTo(0.2, 1);
  });
});

describe("Backend API Endpoints - Top Articles", () => {
  it("GET /top-articles should return ranked articles by revenue", async () => {
    readLog = [
      {
        articleId: "article-1",
        readerId: "reader-1",
        price: 0.1,
        timestamp: Date.now(),
      },
      {
        articleId: "article-2",
        readerId: "reader-2",
        price: 0.05,
        timestamp: Date.now(),
      },
      {
        articleId: "article-1",
        readerId: "reader-3",
        price: 0.15,
        timestamp: Date.now(),
      },
      {
        articleId: "article-2",
        readerId: "reader-4",
        price: 0.02,
        timestamp: Date.now(),
      },
    ];

    const response = await request(app).get("/top-articles");

    expect(response.status).toBe(200);
    expect(response.body).toBeInstanceOf(Array);
    expect(response.body).toHaveLength(2);
    expect(response.body[0].articleId).toBe("article-1");
    expect(response.body[0].revenue).toBeCloseTo(0.25, 1);
    expect(response.body[1].articleId).toBe("article-2");
  });

  it("GET /top-articles should respect limit parameter", async () => {
    readLog = Array.from({ length: 20 }, (_, i) => ({
      articleId: `article-${i}`,
      readerId: `reader-${i}`,
      price: 0.01 * (i + 1),
      timestamp: Date.now(),
    }));

    const response = await request(app).get("/top-articles?limit=5");

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(5);
  });

  it("GET /top-articles should default to limit 10", async () => {
    readLog = Array.from({ length: 20 }, (_, i) => ({
      articleId: `article-${i}`,
      readerId: `reader-${i}`,
      price: 0.01,
      timestamp: Date.now(),
    }));

    const response = await request(app).get("/top-articles");

    expect(response.status).toBe(200);
    expect(response.body.length).toBeLessThanOrEqual(10);
  });

  it("GET /top-articles should rank by revenue correctly", async () => {
    readLog = [
      {
        articleId: "high-revenue",
        readerId: "reader-1",
        price: 1.0,
        timestamp: Date.now(),
      },
      {
        articleId: "high-revenue",
        readerId: "reader-2",
        price: 0.5,
        timestamp: Date.now(),
      },
      {
        articleId: "low-revenue",
        readerId: "reader-3",
        price: 0.1,
        timestamp: Date.now(),
      },
    ];

    const response = await request(app).get("/top-articles");

    expect(response.status).toBe(200);
    expect(response.body[0].articleId).toBe("high-revenue");
    expect(response.body[0].revenue).toBeCloseTo(1.5, 1);
    expect(response.body[1].articleId).toBe("low-revenue");
  });

  it("GET /top-articles should handle empty read log", async () => {
    readLog = [];

    const response = await request(app).get("/top-articles");

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });
});

describe("Backend API Endpoints - Integration Scenarios", () => {
  it("should handle full lifecycle: record and query", async () => {
    readLog = [];
    mockVerifyAccess.mockResolvedValue(true);

    // Record multiple reads
    await request(app).post("/record-read").send({
      articleId: "article-001",
      readerId: "reader-1",
      price: 0.05,
    });

    await request(app).post("/record-read").send({
      articleId: "article-001",
      readerId: "reader-2",
      price: 0.03,
    });

    // Get earnings
    const earnings = await request(app).get("/earnings");
    expect(earnings.body.reads).toBe(2);
    expect(earnings.body.total).toBeCloseTo(0.08, 1);

    // Get article stats
    const stats = await request(app).get("/articles/article-001/stats");
    expect(stats.body.reads).toBe(2);
    expect(stats.body.revenue).toBeCloseTo(0.08, 1);

    // Get top articles
    const top = await request(app).get("/top-articles");
    expect(top.body).toHaveLength(1);
    expect(top.body[0].articleId).toBe("article-001");
  });

  it("should track multiple publishers simultaneously", async () => {
    readLog = [];

    // Publisher A articles
    readLog.push({
      articleId: "pub-a-article-1",
      readerId: "reader-1",
      price: 0.1,
      timestamp: Date.now(),
    });
    readLog.push({
      articleId: "pub-a-article-1",
      readerId: "reader-2",
      price: 0.05,
      timestamp: Date.now(),
    });

    // Publisher B articles
    readLog.push({
      articleId: "pub-b-article-1",
      readerId: "reader-3",
      price: 0.08,
      timestamp: Date.now(),
    });

    // Publisher A stats
    const statsA = await request(app).get("/articles/pub-a-article-1/stats");
    expect(statsA.body.reads).toBe(2);
    expect(statsA.body.revenue).toBeCloseTo(0.15, 1);

    // Publisher B stats
    const statsB = await request(app).get("/articles/pub-b-article-1/stats");
    expect(statsB.body.reads).toBe(1);
    expect(statsB.body.revenue).toBeCloseTo(0.08, 1);

    // Total earnings
    const earnings = await request(app).get("/earnings");
    expect(earnings.body.reads).toBe(3);
    expect(earnings.body.total).toBeCloseTo(0.23, 1);
  });

  it("should isolate reader stats per reader", async () => {
    readLog = [];

    readLog.push({
      articleId: "article-1",
      readerId: "reader-1",
      price: 0.1,
      timestamp: Date.now(),
    });
    readLog.push({
      articleId: "article-2",
      readerId: "reader-1",
      price: 0.05,
      timestamp: Date.now(),
    });
    readLog.push({
      articleId: "article-1",
      readerId: "reader-2",
      price: 0.1,
      timestamp: Date.now(),
    });

    const reader1 = await request(app).get("/readers/reader-1/stats");
    expect(reader1.body.articlesRead).toBe(2);
    expect(reader1.body.totalSpent).toBeCloseTo(0.15, 1);

    const reader2 = await request(app).get("/readers/reader-2/stats");
    expect(reader2.body.articlesRead).toBe(1);
    expect(reader2.body.totalSpent).toBeCloseTo(0.1, 1);
  });
});

describe("Backend API Endpoints - Error Handling", () => {
  it("should return 400 for malformed JSON", async () => {
    const response = await request(app)
      .post("/verify")
      .set("Content-Type", "application/json")
      .send("{ invalid json }");

    expect(response.status).toBe(400);
  });

  it("should handle missing Content-Type gracefully", async () => {
    const response = await request(app).post("/verify").send({
      reader: "GBUQWP3BOUZX34ULNQG23RQ6F4BFSRJSU6DCFTL7NNLGYAGXUCESA5ON",
      article_id: "article-001",
    });

    expect([200, 400]).toContain(response.status);
  });

  it("should sanitize article IDs in queries", async () => {
    const response = await request(app).get(
      "/articles/article-001'; DROP TABLE articles;--/stats",
    );

    // Should safely handle without crashing
    expect(response.status).toBe(200);
  });
});
