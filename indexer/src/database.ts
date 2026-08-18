/**
 * Simple file-based event store (for CI compatibility)
 * In production, use PostgreSQL or proper SQLite
 */

import { promises as fs } from "fs";
import path from "path";
import { PurchaseEvent, IndexerState } from "./types";
import { logger } from "./logger";

const DB_PATH = process.env.DB_PATH || "./data/events.json";
const EVENTS_FILE = path.join(path.dirname(DB_PATH), "events.json");
const STATE_FILE = path.join(path.dirname(DB_PATH), "state.json");

interface EventStore {
  events: PurchaseEvent[];
  state: IndexerState;
}

let eventStore: EventStore = {
  events: [],
  state: {
    lastLedger: 0,
    lastChecked: Date.now(),
    eventsProcessed: 0,
    totalEvents: 0,
  },
};

/**
 * Initialize database
 */
export async function initializeDatabase(): Promise<void> {
  try {
    // Create data directory
    const dir = path.dirname(EVENTS_FILE);
    await fs.mkdir(dir, { recursive: true });

    // Load existing events
    try {
      const eventsData = await fs.readFile(EVENTS_FILE, "utf-8");
      eventStore.events = JSON.parse(eventsData);
    } catch {
      eventStore.events = [];
    }

    // Load existing state
    try {
      const stateData = await fs.readFile(STATE_FILE, "utf-8");
      eventStore.state = JSON.parse(stateData);
    } catch {
      eventStore.state = {
        lastLedger: 0,
        lastChecked: Date.now(),
        eventsProcessed: 0,
        totalEvents: eventStore.events.length,
      };
    }

    logger.info({ eventsFile: EVENTS_FILE }, "Event store initialized");
  } catch (error) {
    logger.error({ error }, "Failed to initialize event store");
    throw error;
  }
}

/**
 * Save all data to disk
 */
async function persist(): Promise<void> {
  try {
    const dir = path.dirname(EVENTS_FILE);
    await fs.mkdir(dir, { recursive: true });

    await fs.writeFile(EVENTS_FILE, JSON.stringify(eventStore.events, null, 2));
    await fs.writeFile(STATE_FILE, JSON.stringify(eventStore.state, null, 2));
  } catch (error) {
    logger.error({ error }, "Failed to persist event store");
  }
}

/**
 * Close store (save and cleanup)
 */
export async function closeDatabase(): Promise<void> {
  await persist();
  logger.info("Event store closed");
}

/**
 * Add or update a purchase event
 */
export async function savePurchaseEvent(event: PurchaseEvent): Promise<void> {
  // Check for duplicates
  const existing = eventStore.events.find((e) => e.id === event.id);
  if (!existing) {
    eventStore.events.push(event);
    eventStore.state.totalEvents = eventStore.events.length;
    await persist();
  }
}

/**
 * Get recent purchase events for activity feed
 */
export function getRecentPurchases(limit: number = 50): PurchaseEvent[] {
  return eventStore.events
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit);
}

/**
 * Get purchases for a specific article
 */
export function getArticlePurchases(
  articleId: string,
  limit: number = 50,
): PurchaseEvent[] {
  return eventStore.events
    .filter((e) => e.articleId === articleId)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit);
}

/**
 * Get purchases by reader
 */
export function getReaderPurchases(
  reader: string,
  limit: number = 50,
): PurchaseEvent[] {
  return eventStore.events
    .filter((e) => e.reader === reader)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit);
}

/**
 * Get indexer state
 */
export function getState(): IndexerState {
  return {
    ...eventStore.state,
    lastChecked: Date.now(),
  };
}

/**
 * Update indexer state
 */
export async function updateState(
  lastLedger: number,
  eventsProcessed: number,
): Promise<void> {
  eventStore.state.lastLedger = lastLedger;
  eventStore.state.eventsProcessed = eventsProcessed;
  eventStore.state.totalEvents = eventStore.events.length;
  await persist();
}

/**
 * Count total purchase events
 */
export function countPurchaseEvents(): number {
  return eventStore.events.length;
}

/**
 * Get purchase events in date range
 */
export function getPurchasesInRange(
  startTime: number,
  endTime: number,
  limit: number = 1000,
): PurchaseEvent[] {
  return eventStore.events
    .filter((e) => e.timestamp >= startTime && e.timestamp <= endTime)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit);
}
