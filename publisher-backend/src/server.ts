import express, { Request, Response, NextFunction } from "express";
import { verifyToken, clearExpiredTokens } from "./services/tokenService";
import {
  getEarnings,
  recordRead,
  getArticleStats,
  getAllArticleStats,
  getReaderStats,
  getTopArticles,
} from "./services/analyticsService";

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || "development";

// Middleware: Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// Middleware: CORS headers
app.use((req: Request, res: Response, next: NextFunction) => {
  const corsOrigin = process.env.CORS_ORIGIN || "*";
  res.header("Access-Control-Allow-Origin", corsOrigin);
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type,Authorization");
  next();
});

// Clear expired tokens every 5 minutes
setInterval(clearExpiredTokens, 5 * 60 * 1000);

/**
 * POST /verify
 * Verify an access token from a reader
 */
app.post("/verify", async (req, res) => {
  try {
    const { token, contractId } = req.body;

    if (!token || !contractId) {
      return res.status(400).json({ error: "Missing token or contractId" });
    }

    const isValid = await verifyToken(token, contractId);

    res.json({ valid: isValid });
  } catch (error) {
    console.error("Verification error:", error);
    res.status(500).json({ error: "Verification failed" });
  }
});

/**
 * POST /record-read
 * Record a successful article read for analytics
 */
app.post("/record-read", async (req, res) => {
  try {
    const { articleId, readerId, price } = req.body;

    if (!articleId || !readerId || price === undefined) {
      return res
        .status(400)
        .json({ error: "Missing articleId, readerId, or price" });
    }

    await recordRead(articleId, readerId, price);

    res.json({ success: true });
  } catch (error) {
    console.error("Record read error:", error);
    res.status(500).json({ error: "Failed to record read" });
  }
});

/**
 * GET /earnings
 * Get publisher earnings
 */
app.get("/earnings", async (req, res) => {
  try {
    const earnings = await getEarnings();
    res.json(earnings);
  } catch (error) {
    console.error("Earnings error:", error);
    res.status(500).json({ error: "Failed to fetch earnings" });
  }
});

/**
 * GET /articles/:articleId/stats
 * Get stats for a specific article
 */
app.get("/articles/:articleId/stats", async (req, res) => {
  try {
    const { articleId } = req.params;
    const stats = await getArticleStats(articleId);
    res.json(stats);
  } catch (error) {
    console.error("Article stats error:", error);
    res.status(500).json({ error: "Failed to fetch article stats" });
  }
});

/**
 * GET /articles/stats
 * Get stats for all articles
 */
app.get("/articles/stats", async (req, res) => {
  try {
    const stats = await getAllArticleStats();
    res.json(stats);
  } catch (error) {
    console.error("All articles stats error:", error);
    res.status(500).json({ error: "Failed to fetch article stats" });
  }
});

/**
 * GET /readers/:readerId/stats
 * Get stats for a specific reader
 */
app.get("/readers/:readerId/stats", async (req, res) => {
  try {
    const { readerId } = req.params;
    const stats = await getReaderStats(readerId);
    res.json(stats);
  } catch (error) {
    console.error("Reader stats error:", error);
    res.status(500).json({ error: "Failed to fetch reader stats" });
  }
});

/**
 * GET /top-articles
 * Get top performing articles
 */
app.get("/top-articles", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const topArticles = await getTopArticles(limit);
    res.json(topArticles);
  } catch (error) {
    console.error("Top articles error:", error);
    res.status(500).json({ error: "Failed to fetch top articles" });
  }
});

/**
 * Health check
 */
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Byline Publisher Backend running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
