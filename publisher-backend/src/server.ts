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
import {
  loggingMiddleware,
  errorLoggingMiddleware,
} from "./middleware/logging";
import { logger } from "./utils/logger";

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || "development";

// Middleware: Structured logging
app.use(loggingMiddleware);

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
  const logger = req.logger || logger;
  logger.error("Unhandled error", err, {
    path: req.path,
    method: req.method,
  });

  res.status(500).json({
    error: "Internal server error",
    code: "SERVER_ERROR",
    request_id: req.id,
    message: NODE_ENV === "development" ? err.message : undefined,
  });
});

// Middleware: Error logging
app.use(errorLoggingMiddleware);

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
      req.logger.warn("Verification request missing required fields");
      return res.status(400).json({
        error: "Missing token or contractId",
        code: "INVALID_REQUEST",
      });
    }

    req.logger.debug("Verifying token", { articleId });
    const isValid = await verifyToken(token, contractId);

    req.logger.info("Token verification completed", {
      valid: isValid,
      articleId,
    });

    res.json({
      valid: isValid,
      articleId: articleId || token?.article_id,
      expiresAt: token?.expiry,
      timestamp: Date.now(),
    });
  } catch (error) {
    req.logger.error("Token verification failed", error);
    res.status(500).json({
      error: "Verification failed",
      code: "VERIFICATION_ERROR",
      request_id: req.id,
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
      req.logger.warn("Record-read request missing required fields");
      return res.status(400).json({
        error: "Missing articleId, readerId, publisherId, or price",
        code: "INVALID_REQUEST",
      });
    }

    if (price < 0) {
      req.logger.warn("Record-read request has negative price");
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

    req.logger.info("Read event recorded", { articleId, publisherId, price });

    res.json({
      success: true,
      recordedAt: Date.now(),
      articleId,
      readerId,
    });
  } catch (error) {
    req.logger.error("Failed to record read", error);
    res.status(500).json({
      error: "Failed to record read",
      code: "RECORD_ERROR",
      request_id: req.id,
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

    req.logger.debug("Fetching earnings", { publisherAddress });

    let earnings;
    if (publisherAddress) {
      earnings = await getEarnings(publisherAddress);
    } else {
      earnings = await getAggregateEarnings();
    }

    req.logger.info("Earnings fetched successfully", {
      publisherAddress,
      total: earnings.total,
    });

    res.json({
      ...earnings,
      currency: "XLM",
      timestamp: Date.now(),
    });
  } catch (error) {
    req.logger.error("Failed to fetch earnings", error);
    res.status(500).json({
      error: "Failed to fetch earnings",
      code: "EARNINGS_ERROR",
      request_id: req.id,
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
      req.logger.warn("Article stats request missing article ID");
      return res.status(400).json({
        error: "Article ID is required",
        code: "MISSING_ARTICLE_ID",
      });
    }

    const stats = await getArticleStats(articleId);
    req.logger.info("Article stats fetched", {
      articleId,
      read_count: stats.read_count,
    });

    res.json({
      ...stats,
      currency: "XLM",
    });
  } catch (error) {
    req.logger.error("Failed to fetch article stats", error);
    res.status(500).json({
      error: "Failed to fetch article stats",
      code: "STATS_ERROR",
      request_id: req.id,
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
    req.logger.info("All article stats fetched", { count: stats.length });
    res.json({
      articles: stats,
      currency: "XLM",
      timestamp: Date.now(),
    });
  } catch (error) {
    req.logger.error("Failed to fetch all article stats", error);
    res.status(500).json({
      error: "Failed to fetch article stats",
      code: "STATS_ERROR",
      request_id: req.id,
    });
  }
});

/**
 * GET /readers/:readerId/stats
 * Get stats for a specific reader
 */
app.get("/readers/:readerId/stats", async (req: Request, res: Response) => {
  try {
    const { readerId } = req.params;
    req.logger.debug("Fetching reader stats", { readerId });

    const stats = await getReaderStats(readerId);

    if (!stats) {
      req.logger.info("No stats found for reader", { readerId });
      return res.status(404).json({
        error: "Reader not found",
        code: "READER_NOT_FOUND",
      });
    }

    req.logger.info("Reader stats fetched", {
      readerId,
      articles_read: stats.articles_read,
    });

    res.json(stats);
  } catch (error) {
    req.logger.error("Failed to fetch reader stats", error);
    res.status(500).json({
      error: "Failed to fetch reader stats",
      code: "STATS_ERROR",
      request_id: req.id,
    });
  }
});

/**
 * GET /top-articles
 * Get top performing articles
 */
app.get("/top-articles", async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    req.logger.debug("Fetching top articles", { limit });

    const topArticles = await getTopArticles(limit);

    req.logger.info("Top articles fetched", { count: topArticles.length });
    res.json(topArticles);
  } catch (error) {
    req.logger.error("Failed to fetch top articles", error);
    res.status(500).json({
      error: "Failed to fetch top articles",
      code: "STATS_ERROR",
      request_id: req.id,
    });
  }
});

/**
 * GET /health
 * Health check endpoint
 * Returns: { status: 'ok', uptime: number, timestamp: string }
 */
app.get("/health", (req: Request, res: Response) => {
  req.logger.debug("Health check");
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
    logger.info("Server started successfully", {
      port: PORT,
      environment: NODE_ENV,
    });
  } catch (error) {
    logger.error(
      "Failed to start server: database initialization failed",
      error,
    );
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
  logger.info("SIGTERM received, shutting down gracefully");
  await closeDatabase();
  process.exit(0);
});

process.on("SIGINT", async () => {
  logger.info("SIGINT received, shutting down gracefully");
  await closeDatabase();
  process.exit(0);
});
