import express from "express";
import cors from "cors";
import * as dotenv from "dotenv";
import { Request, Response } from "express";
import { verifyAccess, getArticlePrice, getTotalReads } from "./stellar";
import authRoutes from "./routes/authRoutes";
import {
  verifySessionToken,
  getSecretKeyForSigning,
  getWalletByEmail,
} from "./services/custodialWalletService";
import {
  SorobanRpc,
  Contract,
  Networks,
  TransactionBuilder,
  BASE_FEE,
  Keypair,
  nativeToScVal,
  Address,
} from "@stellar/stellar-sdk";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT ?? 3000;
const RPC_URL =
  process.env.STELLAR_RPC_URL ?? "https://soroban-testnet.stellar.org";
const CONTRACT_ID = process.env.CONTRACT_ID ?? "";
const NETWORK_PASSPHRASE = Networks.TESTNET;

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

/**
 * POST /purchase
 * Purchase access for a custodial wallet user.
 * Requires Bearer token (session token) in Authorization header.
 */
app.post("/purchase", async (req: Request, res: Response) => {
  try {
    const sessionToken = req.headers.authorization?.replace("Bearer ", "");
    const { articleId, walletAddress } = req.body;

    if (!sessionToken) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    if (!articleId || !walletAddress) {
      return res
        .status(400)
        .json({ error: "articleId and walletAddress required" });
    }

    // Verify session
    const auth = await verifySessionToken(sessionToken);
    if (!auth) {
      return res.status(401).json({ error: "Session expired" });
    }

    // Verify the wallet belongs to this user
    const wallet = await getWalletByEmail(auth.email);
    if (!wallet || wallet.publicKey !== walletAddress) {
      return res.status(403).json({ error: "Wallet does not belong to user" });
    }

    // Get the secret key for signing
    const secretKey = await getSecretKeyForSigning(auth.email);
    const keypair = Keypair.fromSecret(secretKey);

    // Build and sign the purchase transaction
    const rpc = new SorobanRpc.Server(RPC_URL, { allowHttp: false });
    const contract = new Contract(CONTRACT_ID);

    const account = await rpc.getAccount(walletAddress);

    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        contract.call(
          "purchase_access",
          new Address(walletAddress).toScVal(),
          nativeToScVal(articleId, { type: "string" }),
        ),
      )
      .setTimeout(30)
      .build();

    // Simulate the transaction
    const simResult = await rpc.simulateTransaction(tx);
    if (SorobanRpc.Api.isSimulationError(simResult)) {
      return res.status(400).json({
        error: "Purchase simulation failed",
        details: simResult.error,
      });
    }

    // Assemble and sign
    const preparedTx = SorobanRpc.assembleTransaction(
      tx,
      simResult as SorobanRpc.Api.SimulateTransactionSuccessResponse,
    ).build();

    preparedTx.sign(keypair);

    // Send transaction
    const sendResult = await rpc.sendTransaction(preparedTx);

    if (sendResult.status === "ERROR") {
      return res.status(400).json({
        error: "Transaction submission failed",
        details: sendResult.errorResult,
      });
    }

    // Poll for confirmation
    let getResult = await rpc.getTransaction(sendResult.hash);
    let attempts = 0;
    while (
      getResult.status === SorobanRpc.Api.GetTransactionStatus.NOT_FOUND &&
      attempts < 12
    ) {
      await new Promise((r) => setTimeout(r, 1000));
      getResult = await rpc.getTransaction(sendResult.hash);
      attempts++;
    }

    if (getResult.status === SorobanRpc.Api.GetTransactionStatus.SUCCESS) {
      res.json({
        success: true,
        txHash: sendResult.hash,
        message: "Purchase successful",
      });
    } else {
      res.status(500).json({
        error: "Transaction did not confirm",
        status: getResult.status,
      });
    }
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error("Purchase error:", err.message);
    res.status(500).json({
      error: "Purchase failed",
      details: err.message,
    });
  }
});

// ── Auth Routes ─────────────────────────────────────────────────────

app.use("/auth", authRoutes);

// ── Start ────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`Byline publisher backend running on port ${PORT}`);
  console.log(`Contract: ${process.env.CONTRACT_ID}`);
  console.log(`Network: testnet`);
});
