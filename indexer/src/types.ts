/**
 * Type definitions for Byline Indexer
 */

export interface PurchaseEvent {
  id: string; // Unique event ID (ledger_seq + tx_hash)
  ledger: number;
  transactionHash: string;
  timestamp: number; // Unix timestamp
  articleId: string;
  reader: string; // Stellar address (G...)
  publisher: string; // Stellar address (G...)
  price: number; // In stroops or cents depending on currency
  priceType: "stroops" | "usdc"; // Native XLM or USDC
  blockTime: number; // Block timestamp in seconds
}

export interface ActivityFeedItem {
  id: string;
  articleId: string;
  articleTitle?: string;
  reader: string;
  publisher: string;
  priceAmount: number;
  priceCurrency: string; // "XLM" or "USD"
  timestamp: number; // Unix timestamp in milliseconds
  ago: string; // Human-readable "5m ago", "2h ago", etc
}

export interface IndexerState {
  lastLedger: number;
  lastChecked: number; // Unix timestamp
  eventsProcessed: number;
  totalEvents: number;
}

export interface SorobanEvent {
  id: string;
  ledger: number;
  tx_hash: string;
  created_at: string;
  type: string;
  contract: string;
  topic: string[];
  value: {
    xdr: string;
    raw: unknown[];
  };
}

export interface SorobanRpcResponse<T> {
  jsonrpc: string;
  id: string;
  result?: T;
  error?: {
    code: number;
    message: string;
  };
}

export interface SorobanEventResponse {
  events: SorobanEvent[];
  latest_ledger: number;
}
