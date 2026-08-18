/**
 * Main indexer logic - polls Soroban RPC and processes events
 */

import {
  fetchPurchaseEvents,
  getLatestLedger,
  parsePurchaseEvent,
} from "./soroban";
import {
  savePurchaseEvent,
  getState,
  updateState,
  countPurchaseEvents,
} from "./database";
import { PurchaseEvent } from "./types";
import { logger } from "./logger";

let isIndexing = false;

/**
 * Start the indexer polling loop
 */
export async function startIndexer(
  pollIntervalMs: number = 5000,
): Promise<void> {
  logger.info({ interval: pollIntervalMs }, "Starting indexer");

  const interval = setInterval(() => {
    indexOnce().catch((error) => {
      logger.error({ error }, "Indexing error");
    });
  }, pollIntervalMs);

  // Run once immediately
  await indexOnce();

  // Handle graceful shutdown
  process.on("SIGINT", () => {
    logger.info("Shutting down indexer");
    clearInterval(interval);
    process.exit(0);
  });
}

/**
 * Perform a single indexing cycle
 */
export async function indexOnce(): Promise<void> {
  if (isIndexing) {
    logger.debug("Indexing already in progress");
    return;
  }

  isIndexing = true;

  try {
    const state = getState();
    logger.debug({ state }, "Starting indexing cycle");

    // Get latest ledger
    const latestLedger = await getLatestLedger();
    if (latestLedger === 0) {
      logger.warn("Could not fetch latest ledger");
      isIndexing = false;
      return;
    }

    logger.debug(
      { lastProcessed: state.lastLedger, latest: latestLedger },
      "Ledger range",
    );

    // Fetch events from last processed ledger
    const events = await fetchPurchaseEvents(state.lastLedger);
    logger.debug({ count: events.length }, "Fetched events");

    if (events.length === 0) {
      isIndexing = false;
      return;
    }

    // Process each event
    let processedCount = 0;
    let errorCount = 0;

    for (const event of events) {
      try {
        const parsed = parsePurchaseEvent(event);

        if (!parsed) {
          logger.debug({ eventId: event.id }, "Could not parse event");
          errorCount++;
          continue;
        }

        const purchaseEvent: PurchaseEvent = {
          id: event.id,
          ledger: event.ledger,
          transactionHash: event.tx_hash,
          timestamp: Math.floor(new Date(event.created_at).getTime() / 1000),
          articleId: parsed.articleId,
          reader: parsed.reader,
          publisher: parsed.publisher,
          price: parsed.price,
          priceType: parsed.priceType,
          blockTime: event.ledger,
        };

        await savePurchaseEvent(purchaseEvent);
        processedCount++;

        logger.debug(
          {
            articleId: parsed.articleId,
            reader: parsed.reader.substring(0, 10),
            price: parsed.price,
          },
          "Processed purchase event",
        );
      } catch (error) {
        logger.error({ error, eventId: event.id }, "Error processing event");
        errorCount++;
      }
    }

    // Update state
    const newLastLedger = Math.max(
      state.lastLedger,
      Math.max(...events.map((e) => e.ledger)),
    );
    await updateState(newLastLedger, state.eventsProcessed + processedCount);

    logger.info(
      {
        processed: processedCount,
        errors: errorCount,
        total: countPurchaseEvents(),
        latestLedger: newLastLedger,
      },
      "Indexing cycle complete",
    );
  } catch (error) {
    logger.error({ error }, "Fatal indexing error");
  } finally {
    isIndexing = false;
  }
}

/**
 * Get current indexer status
 */
export function getIndexerStatus() {
  const state = getState();
  return {
    ...state,
    isIndexing,
  };
}
