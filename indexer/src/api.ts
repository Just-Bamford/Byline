/**
 * Express API server for activity feed
 */

import express, { Request, Response } from "express";
import {
  getRecentPurchases,
  getArticlePurchases,
  getReaderPurchases,
  countPurchaseEvents,
  getState,
} from "./database";
import { getIndexerStatus } from "./indexer";
import { ActivityFeedItem, PurchaseEvent } from "./types";
import { logger } from "./logger";

const app = express();
app.use(express.json());

/**
 * Format time duration ("5m ago", "2h ago", etc.)
 */
function formatTimeAgo(timestamp: number): string {
  const now = Date.now() / 1000;
  const secondsAgo = Math.floor(now - timestamp);

  if (secondsAgo < 60) return `${secondsAgo}s ago`;
  if (secondsAgo < 3600) return `${Math.floor(secondsAgo / 60)}m ago`;
  if (secondsAgo < 86400) return `${Math.floor(secondsAgo / 3600)}h ago`;
  return `${Math.floor(secondsAgo / 86400)}d ago`;
}

/**
 * Convert stroops to XLM or cents to USD
 */
function formatPrice(
  price: number,
  type: string,
): { amount: number; currency: string } {
  if (type === "usdc") {
    // price is in cents
    return {
      amount: price / 100,
      currency: "USD",
    };
  }
  // stroops to XLM (1 XLM = 10,000,000 stroops)
  return {
    amount: price / 10_000_000,
    currency: "XLM",
  };
}

/**
 * Truncate address for display
 */
function truncateAddress(address: string): string {
  return `${address.substring(0, 8)}...${address.substring(address.length - 4)}`;
}

/**
 * Convert purchase event to activity feed item
 */
function toActivityFeedItem(
  event: PurchaseEvent,
  title?: string,
): ActivityFeedItem {
  const price = formatPrice(event.price, event.priceType);
  return {
    id: event.id,
    articleId: event.articleId,
    articleTitle: title || event.articleId,
    reader: truncateAddress(event.reader),
    publisher: truncateAddress(event.publisher),
    priceAmount: price.amount,
    priceCurrency: price.currency,
    timestamp: event.timestamp * 1000, // Convert to milliseconds
    ago: formatTimeAgo(event.timestamp),
  };
}

/**
 * GET /api/activity-feed
 * Get recent purchase activity
 */
app.get("/api/activity-feed", (_req: Request, res: Response) => {
  try {
    const limit = Math.min(
      Math.max(1, parseInt(_req.query.limit as string) || 50),
      500,
    );
    const purchases = getRecentPurchases(limit);

    const items = purchases.map((p) => toActivityFeedItem(p));

    res.json({
      success: true,
      data: items,
      count: items.length,
    });
  } catch (error) {
    logger.error({ error }, "Failed to fetch activity feed");
    res.status(500).json({
      success: false,
      error: "Failed to fetch activity feed",
    });
  }
});

/**
 * GET /api/articles/:articleId/purchases
 * Get purchases for specific article
 */
app.get("/api/articles/:articleId/purchases", (req: Request, res: Response) => {
  try {
    const { articleId } = req.params;
    const limit = Math.min(
      Math.max(1, parseInt(req.query.limit as string) || 50),
      500,
    );

    const purchases = getArticlePurchases(articleId, limit);
    const items = purchases.map((p) => toActivityFeedItem(p, articleId));

    res.json({
      success: true,
      data: items,
      articleId,
      count: items.length,
    });
  } catch (error) {
    logger.error({ error }, "Failed to fetch article purchases");
    res.status(500).json({
      success: false,
      error: "Failed to fetch article purchases",
    });
  }
});

/**
 * GET /api/readers/:readerAddress/purchases
 * Get purchases by reader
 */
app.get(
  "/api/readers/:readerAddress/purchases",
  (req: Request, res: Response) => {
    try {
      const { readerAddress } = req.params;
      const limit = Math.min(
        Math.max(1, parseInt(req.query.limit as string) || 50),
        500,
      );

      const purchases = getReaderPurchases(readerAddress, limit);
      const items = purchases.map((p) => toActivityFeedItem(p));

      res.json({
        success: true,
        data: items,
        reader: readerAddress,
        count: items.length,
      });
    } catch (error) {
      logger.error({ error }, "Failed to fetch reader purchases");
      res.status(500).json({
        success: false,
        error: "Failed to fetch reader purchases",
      });
    }
  },
);

/**
 * GET /api/stats
 * Get indexer statistics
 */
app.get("/api/stats", (_req: Request, res: Response) => {
  try {
    const state = getState();
    const totalEvents = countPurchaseEvents();

    res.json({
      success: true,
      data: {
        totalPurchases: totalEvents,
        lastLedgerProcessed: state.lastLedger,
        eventsProcessed: state.eventsProcessed,
        uptime: process.uptime(),
      },
    });
  } catch (error) {
    logger.error({ error }, "Failed to fetch stats");
    res.status(500).json({
      success: false,
      error: "Failed to fetch stats",
    });
  }
});

/**
 * GET /api/health
 * Health check endpoint
 */
app.get("/api/health", (_req: Request, res: Response) => {
  try {
    const status = getIndexerStatus();
    res.json({
      success: true,
      data: {
        ...status,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error({ error }, "Health check failed");
    res.status(500).json({
      success: false,
      error: "Health check failed",
    });
  }
});

/**
 * Health check for Kubernetes/Docker
 */
app.get("/health", (_req: Request, res: Response) => {
  res.status(200).send("OK");
});

/**
 * 404 handler
 */
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: "Not found",
  });
});

/**
 * Error handler
 */
app.use((err: Error, _req: Request, res: Response) => {
  logger.error({ error: err }, "Unhandled error");
  res.status(500).json({
    success: false,
    error: "Internal server error",
  });
});

export default app;
