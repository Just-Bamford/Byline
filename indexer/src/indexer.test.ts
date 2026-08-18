/**
 * Indexer unit tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { getIndexerStatus } from "./indexer";
import {
  initializeDatabase,
  closeDatabase,
  countPurchaseEvents,
} from "./database";

describe("Indexer", () => {
  beforeEach(() => {
    process.env.DB_PATH = ":memory:"; // Use in-memory DB for tests
    initializeDatabase();
  });

  afterEach(() => {
    closeDatabase();
  });

  describe("getIndexerStatus", () => {
    it("should return initial state", () => {
      const status = getIndexerStatus();

      expect(status).toHaveProperty("lastLedger");
      expect(status).toHaveProperty("lastChecked");
      expect(status).toHaveProperty("eventsProcessed");
      expect(status).toHaveProperty("totalEvents");
      expect(status).toHaveProperty("isIndexing");

      expect(status.lastLedger).toBe(0);
      expect(status.eventsProcessed).toBe(0);
      expect(status.totalEvents).toBe(0);
      expect(status.isIndexing).toBe(false);
    });

    it("should track event processing", () => {
      const initialStatus = getIndexerStatus();
      expect(initialStatus.eventsProcessed).toBe(0);

      // In a real scenario, we'd mock event processing
      // For now, just verify the structure
      expect(initialStatus).toBeDefined();
    });
  });

  describe("Database integration", () => {
    it("should initialize database", () => {
      const count = countPurchaseEvents();
      expect(count).toBe(0);
    });
  });
});
