/**
 * Soroban RPC client for fetching contract events
 */

import fetch from "node-fetch";
import {
  SorobanRpcResponse,
  SorobanEventResponse,
  SorobanEvent,
} from "./types";
import { logger } from "./logger";

const SOROBAN_RPC_URL =
  process.env.SOROBAN_RPC_URL || "https://soroban-testnet.stellar.org";
const CONTRACT_ID = process.env.STELLAR_CONTRACT_ID || "";

if (!CONTRACT_ID) {
  logger.warn("STELLAR_CONTRACT_ID not set - set it in .env");
}

/**
 * Call Soroban RPC method
 */
async function callRpc<T>(
  method: string,
  params: any[],
): Promise<SorobanRpcResponse<T>> {
  const body = {
    jsonrpc: "2.0",
    id: `${method}-${Date.now()}`,
    method,
    params,
  };

  try {
    const response = await fetch(SOROBAN_RPC_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`RPC Error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as SorobanRpcResponse<T>;
    return data;
  } catch (error) {
    logger.error({ error, method }, "RPC call failed");
    throw error;
  }
}

/**
 * Fetch purchase events from contract
 * topic[0] = "article_purchased" (as Symbol in XDR)
 */
export async function fetchPurchaseEvents(
  startLedger: number = 0,
): Promise<SorobanEvent[]> {
  if (!CONTRACT_ID) {
    logger.warn("Cannot fetch events - CONTRACT_ID not set");
    return [];
  }

  try {
    // Query events for the contract
    const response = await callRpc<SorobanEventResponse>("getEvents", [
      {
        type: "contract",
        contract_ids: [CONTRACT_ID],
        topics: [
          // Topic filter for "article_purchased" events
          [
            "AAAADwAAAAdhcnRpY2xlX3B1cmNoYXNlZA==", // Base64 encoded "article_purchased" as Symbol
          ],
        ],
        limit: 1000,
        cursor: startLedger > 0 ? startLedger.toString() : undefined,
      },
    ]);

    if (response.error) {
      logger.error({ error: response.error }, "RPC error fetching events");
      return [];
    }

    return response.result?.events || [];
  } catch (error) {
    logger.error({ error }, "Failed to fetch purchase events");
    return [];
  }
}

/**
 * Get latest ledger
 */
export async function getLatestLedger(): Promise<number> {
  try {
    const response = await callRpc<{ sequence: number }>("getLedger", []);

    if (response.error) {
      logger.error({ error: response.error }, "Failed to get latest ledger");
      return 0;
    }

    return response.result?.sequence || 0;
  } catch (error) {
    logger.error({ error }, "Failed to fetch latest ledger");
    return 0;
  }
}

/**
 * Parse Soroban event XDR to extract purchase details
 * This is a simplified parser - production version would use Soroban SDK
 */
export function parsePurchaseEvent(event: SorobanEvent): {
  articleId: string;
  reader: string;
  publisher: string;
  price: number;
  priceType: "stroops" | "usdc";
} | null {
  try {
    // The event value.raw contains [articleId, reader, publisher, price]
    const raw = event.value.raw as any[];

    if (!raw || raw.length < 4) {
      logger.warn("Invalid event data structure");
      return null;
    }

    // Extract fields (this is simplified - actual parsing depends on XDR structure)
    const [articleIdObj, readerObj, publisherObj, priceObj] = raw;

    // Soroban SDK would be needed for proper XDR parsing
    // For now, assume the fields are accessible
    const articleId = extractStringFromXdr(articleIdObj);
    const reader = extractAddressFromXdr(readerObj);
    const publisher = extractAddressFromXdr(publisherObj);
    const price = extractNumberFromXdr(priceObj);

    if (!articleId || !reader || !publisher || price === null) {
      logger.warn("Could not parse event fields");
      return null;
    }

    return {
      articleId,
      reader,
      publisher,
      price,
      priceType: "stroops", // Default to stroops, could be determined from event
    };
  } catch (error) {
    logger.error({ error, event }, "Failed to parse event");
    return null;
  }
}

/**
 * Helper: Extract string from XDR
 */
function extractStringFromXdr(xdrValue: any): string {
  if (typeof xdrValue === "string") return xdrValue;
  if (xdrValue?.value) return xdrValue.value;
  return "";
}

/**
 * Helper: Extract address from XDR
 */
function extractAddressFromXdr(xdrValue: any): string {
  if (typeof xdrValue === "string") return xdrValue;
  if (xdrValue?.accountId?.ed25519?.buffer) {
    // Complex nested XDR - would need proper SDK parsing
    return "";
  }
  return "";
}

/**
 * Helper: Extract number from XDR
 */
function extractNumberFromXdr(xdrValue: any): number | null {
  if (typeof xdrValue === "number") return xdrValue;
  if (typeof xdrValue === "string") return parseInt(xdrValue);
  if (xdrValue?.i128?.lo !== undefined) return xdrValue.i128.lo;
  return null;
}
