import express from "express";
import cors from "cors";
import * as dotenv from "dotenv";
import { verifyAccess, getArticlePrice, getTotalReads } from "./stellar";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT ?? 3000;

// In-memory read log (replace with Postgres in Phase 2 pilot)
interface ReadRecord {
  articleId: string;
  readerId: string;
  price: number;
  timestamp: number;
}
const readLog: ReadRecord[] = [];

// ── Routes ──────────────────────────────────────────────────────────

/**
 * GET /health
 * Health check — also verifies contract connection.
 */
app.get("/health", async (_req, res) => {
  try {
    const totalReads = await getTotalReads();
    res.json({
      status: "ok",
      contract: process.env.CONTRACT_ID,
      network: "testnet",
      totalReads,
    });
  } catch (err: any) {
    res.status(503).json({ status: "error", message: err.message });
  }
});

/**
 * POST /verify
 * Verify a reader has access to an article.
 * Calls the Soroban contract directly — no mocking.
 *
 * Body: { reader: string, article_id: string }
 */
app.post("/verify", async (req, res) => {
  const { reader, article_id } = req.body;

  if (!reader || !article_id) {
    return res.status(400).json({ error: "reader and article_id required" });
  }

  try {
    const valid = await verifyAccess(reader, article_id);
    res.json({ valid });
  } catch (err: any) {
    console.error("verify error:", err.message);
    res
      .status(500)
      .json({ error: "contract verification failed", details: err.message });
  }
});

/**
 * POST /record-read
 * Record a confirmed article read for analytics.
 *
 * Body: { articleId: string, readerId: string, price: number }
 */
app.post("/record-read", async (req, res) => {
  const { articleId, readerId, price } = req.body;

  if (!articleId || !readerId) {
    return res.status(400).json({ error: "articleId and readerId required" });
  }

  // Double-check access is valid on-chain before recording
  try {
    const valid = await verifyAccess(readerId, articleId);
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

/**
 * GET /earnings
 * Total earnings summary.
 */
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

/**
 * GET /articles/:articleId/stats
 * Per-article read + revenue stats.
 */
app.get("/articles/:articleId/stats", async (req, res) => {
  const { articleId } = req.params;

  const articleReads = readLog.filter((r) => r.articleId === articleId);
  const revenue = articleReads.reduce((sum, r) => sum + r.price, 0);

  let priceOnChain: bigint | null = null;
  try {
    priceOnChain = await getArticlePrice(articleId);
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

/**
 * GET /readers/:readerId/stats
 * Per-reader spend stats.
 */
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

/**
 * GET /top-articles?limit=10
 * Top articles by revenue.
 */
app.get("/top-articles", (req, res) => {
  const limit = parseInt((req.query.limit as string) ?? "10");
  const grouped: Record<string, { reads: number; revenue: number }> = {};

  for (const r of readLog) {
    if (!grouped[r.articleId]) grouped[r.articleId] = { reads: 0, revenue: 0 };
    grouped[r.articleId].reads++;
    grouped[r.articleId].revenue += r.price;
  }

  const ranked = Object.entries(grouped)
    .map(([articleId, stats]) => ({ articleId, ...stats }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);

  res.json(ranked);
});

/**
 * GET /contract
 * Return the deployed contract info publicly.
 */
app.get("/contract", (_req, res) => {
  res.json({
    contractId: process.env.CONTRACT_ID,
    network: "testnet",
    explorerUrl: `https://stellar.expert/explorer/testnet/contract/${process.env.CONTRACT_ID}`,
  });
});

// ── Start ────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`Byline publisher backend running on port ${PORT}`);
  console.log(`Contract: ${process.env.CONTRACT_ID}`);
  console.log(`Network: testnet`);
});
