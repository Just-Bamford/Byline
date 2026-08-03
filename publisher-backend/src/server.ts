import express, { Request, Response, NextFunction } from "express";
import { verifyToken, clearExpiredTokens } from "./services/tokenService";
import {
  getEarnings,
  getArticleStats,
  getAllArticleStats,
  getReaderStats,
  getTopArticles,
  getAggregateEarnings,
  recordRead,
  type ReadEvent,
} from "./services/analyticsService";
import { initializeDatabase, closeDatabase } from "./db/client";

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

// Middleware: Request validation
app.use((req: Request, res: Response, next: NextFunction) => {
  if (
    req.method === "POST" &&
    !req.get("Content-Type")?.includes("application/json")
  ) {
    return res.status(400).json({
      error: "Content-Type must be application/json",
      code: "INVALID_CONTENT_TYPE",
    });
  }
  next();
});

// Middleware: Global error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    error: "Internal server error",
    code: "SERVER_ERROR",
    message: NODE_ENV === "development" ? err.message : undefined,
  });
});

// Clear expired tokens every 5 minutes
setInterval(clearExpiredTokens, 5 * 60 * 1000);

/**
 * POST /verify
 * Verify an access token from a reader
 * Body: { token, contractId, articleId }
 * Returns: { valid: boolean, articleId?: string, expiresAt?: number }
 */
app.post("/verify", async (req: Request, res: Response) => {
  try {
    const { token, contractId, articleId } = req.body;

    if (!token || !contractId) {
      return res.status(400).json({
        error: "Missing token or contractId",
        code: "INVALID_REQUEST",
      });
    }

    const isValid = await verifyToken(token, contractId);

    res.json({
      valid: isValid,
      articleId: articleId || token?.article_id,
      expiresAt: token?.expiry,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("Verification error:", error);
    res.status(500).json({
      error: "Verification failed",
      code: "VERIFICATION_ERROR",
    });
  }
});

/**
 * POST /record-read
 * Record a successful article read for analytics
 * Body: { articleId, readerId, publisherId, price, duration? }
 * Returns: { success: boolean, recordedAt: number }
 */
app.post("/record-read", async (req: Request, res: Response) => {
  try {
    const { articleId, readerId, publisherId, price, duration } = req.body;

    if (!articleId || !readerId || !publisherId || price === undefined) {
      return res.status(400).json({
        error: "Missing articleId, readerId, publisherId, or price",
        code: "INVALID_REQUEST",
      });
    }

    if (price < 0) {
      return res.status(400).json({
        error: "Price cannot be negative",
        code: "INVALID_PRICE",
      });
    }

    const event: ReadEvent = {
      article_id: articleId,
      reader_address: readerId,
      publisher_address: publisherId,
      price_paid: price,
      duration_seconds: duration,
    };

    await recordRead(event);

    res.json({
      success: true,
      recordedAt: Date.now(),
      articleId,
      readerId,
    });
  } catch (error) {
    console.error("Record read error:", error);
    res.status(500).json({
      error: "Failed to record read",
      code: "RECORD_ERROR",
    });
  }
});

/**
 * GET /earnings
 * Get publisher earnings summary
 * Query: ?publisherAddress=... (optional, if not provided returns aggregate)
 * Returns: { total, pending, settled, lastUpdated }
 */
app.get("/earnings", async (req: Request, res: Response) => {
  try {
    const publisherAddress = req.query.publisherAddress as string;

    let earnings;
    if (publisherAddress) {
      earnings = await getEarnings(publisherAddress);
    } else {
      earnings = await getAggregateEarnings();
    }

    res.json({
      ...earnings,
      currency: "XLM",
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("Earnings error:", error);
    res.status(500).json({
      error: "Failed to fetch earnings",
      code: "EARNINGS_ERROR",
    });
  }
});

/**
 * GET /articles/:articleId/stats
 * Get revenue and read stats for a specific article
 */
app.get("/articles/:articleId/stats", async (req: Request, res: Response) => {
  try {
    const { articleId } = req.params;

    if (!articleId) {
      return res.status(400).json({
        error: "Article ID is required",
        code: "MISSING_ARTICLE_ID",
      });
    }

    const stats = await getArticleStats(articleId);
    res.json({
      ...stats,
      currency: "XLM",
    });
  } catch (error) {
    console.error("Article stats error:", error);
    res.status(500).json({
      error: "Failed to fetch article stats",
      code: "STATS_ERROR",
    });
  }
});

/**
 * GET /articles/stats
 * Get revenue stats for all articles
 */
app.get("/articles/stats", async (req: Request, res: Response) => {
  try {
    const stats = await getAllArticleStats();
    res.json({
      ...stats,
      currency: "XLM",
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("All articles stats error:", error);
    res.status(500).json({
      error: "Failed to fetch article stats",
      code: "STATS_ERROR",
    });
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
 * GET /health
 * Health check endpoint
 * Returns: { status: 'ok', uptime: number, timestamp: string }
 */
app.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
  });
});

app.listen(PORT, async () => {
  try {
    await initializeDatabase();
  } catch (error) {
    console.error("Failed to start server: database initialization failed");
    process.exit(1);
  }

  console.log(`
╔══════════════════════════════════════════╗
║   Byline Publisher Backend                ║
╚══════════════════════════════════════════╝

Port:       ${PORT}
Environment: ${NODE_ENV}
CORS:       ${process.env.CORS_ORIGIN || "*"}

Endpoints:
  POST   /verify              - Verify access token
  POST   /record-read         - Record article read
  GET    /earnings            - Get publisher earnings
  GET    /articles/stats      - Get all article stats
  GET    /articles/:id/stats  - Get article stats
  GET    /readers/:id/stats   - Get reader stats
  GET    /top-articles        - Get top articles
  GET    /health              - Health check

Health:     http://localhost:${PORT}/health
Docs:       https://github.com/yourusername/byline/docs

Ready to accept requests ✓
  `);
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received, shutting down gracefully");
  await closeDatabase();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("SIGINT received, shutting down gracefully");
  await closeDatabase();
  process.exit(0);
});
