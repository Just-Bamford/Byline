import { useState, useEffect, useCallback } from "react";
import {
  isFreighterInstalled,
  connectFreighter,
  getBalance,
  fundFromFriendbot,
  purchaseArticle,
} from "./lib/wallet";
import { verifyAccess, recordRead } from "./lib/api";

// ── Sample articles (replace with real publisher API in Phase 2) ──

const SAMPLE_ARTICLES = [
  {
    id: "article-001",
    title: "The Future of Decentralised Media",
    author: "Ada Okafor",
    preview:
      "How blockchain-based micropayments are reshaping the relationship between publishers and readers...",
    content:
      "Full article content here. This is the premium content that only paying readers can access. In a world where subscription fatigue is real, micropayments offer a third way — pay only for what you consume, at a price that is fair to both reader and writer...",
    price: 0.002,
    priceLabel: "$0.002",
  },
  {
    id: "article-002",
    title: "Stellar's Role in African Fintech",
    author: "Emeka Nwosu",
    preview:
      "Why low-fee settlement rails are critical infrastructure for emerging markets...",
    content:
      "Full article content. Stellar's 5-second finality and sub-cent fees make it uniquely positioned for fintech applications across Africa, where mobile-first financial inclusion is the dominant paradigm...",
    price: 0.003,
    priceLabel: "$0.003",
  },
  {
    id: "article-003",
    title: "Soroban Smart Contracts: A Developer's View",
    author: "Bamford Just",
    preview:
      "Building the first micropayment protocol on Soroban — lessons from the trenches...",
    content:
      "Full article content. Soroban brings Rust-based smart contract development to the Stellar ecosystem. Here is what we learned building Byline on top of it — the gotchas, the wins, and where the tooling still has room to grow...",
    price: 0.001,
    priceLabel: "$0.001",
  },
];

type Screen = "home" | "wallet" | "article";

export default function App() {
  const [screen, setScreen] = useState<Screen>("home");
  const [walletKey, setWalletKey] = useState<string | null>(null);
  const [balance, setBalance] = useState<string>("0.0000");
  const [freighterAvailable, setFreighterAvailable] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [unlockedArticles, setUnlockedArticles] = useState<Set<string>>(
    new Set(),
  );
  const [activeArticle, setActiveArticle] = useState<
    (typeof SAMPLE_ARTICLES)[0] | null
  >(null);

  // Check Freighter on mount
  useEffect(() => {
    isFreighterInstalled().then(setFreighterAvailable);
  }, []);

  // Refresh balance when wallet connects
  const refreshBalance = useCallback(async (key: string) => {
    const bal = await getBalance(key);
    setBalance(bal);
  }, []);

  useEffect(() => {
    if (walletKey) refreshBalance(walletKey);
  }, [walletKey, refreshBalance]);

  async function handleConnectFreighter() {
    setLoading(true);
    setStatusMsg(null);
    try {
      const key = await connectFreighter();
      setWalletKey(key);
      setScreen("wallet");
      setStatusMsg("Wallet connected!");
    } catch (err: any) {
      setStatusMsg(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleFundWallet() {
    if (!walletKey) return;
    setLoading(true);
    setStatusMsg("Requesting testnet XLM from Friendbot...");
    try {
      await fundFromFriendbot(walletKey);
      await refreshBalance(walletKey);
      setStatusMsg("✓ Funded with 10,000 testnet XLM");
    } catch (err: any) {
      setStatusMsg(`Funding failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function handlePurchase(article: (typeof SAMPLE_ARTICLES)[0]) {
    if (!walletKey) return;
    setLoading(true);
    setStatusMsg(`Purchasing access to "${article.title}"...`);
    try {
      const result = await purchaseArticle(walletKey, article.id);
      if (result.success) {
        await recordRead(article.id, walletKey, article.price);
        setUnlockedArticles((prev) => new Set([...prev, article.id]));
        setStatusMsg(`✓ Access granted! Tx: ${result.txHash.slice(0, 12)}...`);
        await refreshBalance(walletKey);
      }
    } catch (err: any) {
      setStatusMsg(`Purchase failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleReadArticle(article: (typeof SAMPLE_ARTICLES)[0]) {
    if (!walletKey) {
      setStatusMsg("Connect your wallet first");
      return;
    }

    if (unlockedArticles.has(article.id)) {
      setActiveArticle(article);
      setScreen("article");
      return;
    }

    // Check on-chain before purchase
    setLoading(true);
    setStatusMsg("Checking on-chain access...");
    try {
      const hasAccess = await verifyAccess(walletKey, article.id);
      if (hasAccess) {
        setUnlockedArticles((prev) => new Set([...prev, article.id]));
        setActiveArticle(article);
        setScreen("article");
        setStatusMsg(null);
      } else {
        setStatusMsg(null);
        await handlePurchase(article);
        if (unlockedArticles.has(article.id)) {
          setActiveArticle(article);
          setScreen("article");
        }
      }
    } catch {
      await handlePurchase(article);
    } finally {
      setLoading(false);
    }
  }

  // ── Render ───────────────────────────────────────────────────────

  const headerKey = walletKey
    ? `${walletKey.slice(0, 6)}...${walletKey.slice(-4)}`
    : null;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#fafaf8",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      {/* Header */}
      <header
        style={{
          background: "#fff",
          borderBottom: "1px solid #e5e5e5",
          padding: "0 2rem",
        }}
      >
        <div
          style={{
            maxWidth: 860,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            height: 56,
          }}
        >
          <button
            onClick={() => {
              setScreen("home");
              setActiveArticle(null);
            }}
            style={{
              background: "none",
              border: "none",
              fontSize: 18,
              fontWeight: 600,
              cursor: "pointer",
              color: "#111",
            }}
          >
            Byline
          </button>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            {walletKey ? (
              <>
                <span style={{ fontSize: 13, color: "#666" }}>
                  {balance} XLM
                </span>
                <span
                  style={{
                    fontSize: 12,
                    background: "#f0f0f0",
                    padding: "4px 10px",
                    borderRadius: 20,
                    color: "#333",
                  }}
                >
                  {headerKey}
                </span>
                <button
                  onClick={() => setScreen("wallet")}
                  style={{
                    fontSize: 13,
                    background: "none",
                    border: "1px solid #ddd",
                    padding: "4px 12px",
                    borderRadius: 6,
                    cursor: "pointer",
                  }}
                >
                  Wallet
                </button>
              </>
            ) : (
              <button
                onClick={handleConnectFreighter}
                disabled={loading}
                style={{
                  fontSize: 13,
                  background: "#111",
                  color: "#fff",
                  border: "none",
                  padding: "6px 14px",
                  borderRadius: 6,
                  cursor: "pointer",
                }}
              >
                Connect Wallet
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Status bar */}
      {statusMsg && (
        <div
          style={{
            background:
              statusMsg.startsWith("Error") ||
              statusMsg.startsWith("Purchase failed")
                ? "#fef2f2"
                : "#f0fdf4",
            borderBottom: "1px solid #e5e5e5",
            padding: "8px 2rem",
            fontSize: 13,
            color:
              statusMsg.startsWith("Error") ||
              statusMsg.startsWith("Purchase failed")
                ? "#991b1b"
                : "#166534",
            textAlign: "center",
          }}
        >
          {statusMsg}
        </div>
      )}

      <main style={{ maxWidth: 860, margin: "0 auto", padding: "2rem" }}>
        {/* Home screen */}
        {screen === "home" && (
          <div>
            <div style={{ marginBottom: "2.5rem" }}>
              <h1
                style={{
                  fontSize: 32,
                  fontWeight: 700,
                  color: "#111",
                  marginBottom: 8,
                }}
              >
                Pay per article.
                <br />
                Not per month.
              </h1>
              <p style={{ fontSize: 16, color: "#666", maxWidth: 480 }}>
                Byline uses Stellar micropayments to let you read what you want,
                when you want. Fractions of a cent per article. No subscription.
                No ads.
              </p>
              {!walletKey && (
                <div style={{ marginTop: "1.5rem", display: "flex", gap: 12 }}>
                  <button
                    onClick={handleConnectFreighter}
                    disabled={loading}
                    style={{
                      background: "#111",
                      color: "#fff",
                      border: "none",
                      padding: "10px 20px",
                      borderRadius: 8,
                      fontSize: 14,
                      cursor: "pointer",
                    }}
                  >
                    {freighterAvailable
                      ? "Connect Freighter"
                      : "Install Freighter"}
                  </button>
                </div>
              )}
            </div>

            {/* Article list */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {SAMPLE_ARTICLES.map((article) => (
                <div
                  key={article.id}
                  style={{
                    background: "#fff",
                    border: "1px solid #e5e5e5",
                    borderRadius: 10,
                    padding: "1.25rem 1.5rem",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: 16,
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <p
                        style={{ fontSize: 12, color: "#888", marginBottom: 4 }}
                      >
                        {article.author}
                      </p>
                      <h2
                        style={{
                          fontSize: 17,
                          fontWeight: 600,
                          color: "#111",
                          marginBottom: 6,
                        }}
                      >
                        {article.title}
                      </h2>
                      <p
                        style={{ fontSize: 14, color: "#555", lineHeight: 1.6 }}
                      >
                        {article.preview}
                      </p>
                    </div>
                    <button
                      onClick={() => handleReadArticle(article)}
                      disabled={loading}
                      style={{
                        background: unlockedArticles.has(article.id)
                          ? "#f0fdf4"
                          : "#111",
                        color: unlockedArticles.has(article.id)
                          ? "#166534"
                          : "#fff",
                        border: unlockedArticles.has(article.id)
                          ? "1px solid #bbf7d0"
                          : "none",
                        padding: "8px 16px",
                        borderRadius: 7,
                        fontSize: 13,
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                        flexShrink: 0,
                      }}
                    >
                      {unlockedArticles.has(article.id)
                        ? "✓ Read"
                        : `Buy ${article.priceLabel}`}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Wallet screen */}
        {screen === "wallet" && walletKey && (
          <div style={{ maxWidth: 480 }}>
            <h2
              style={{ fontSize: 22, fontWeight: 600, marginBottom: "1.5rem" }}
            >
              Your Wallet
            </h2>
            <div
              style={{
                background: "#fff",
                border: "1px solid #e5e5e5",
                borderRadius: 10,
                padding: "1.5rem",
                marginBottom: 16,
              }}
            >
              <p style={{ fontSize: 12, color: "#888", marginBottom: 4 }}>
                Stellar Address
              </p>
              <p
                style={{
                  fontSize: 13,
                  fontFamily: "monospace",
                  color: "#333",
                  wordBreak: "break-all",
                }}
              >
                {walletKey}
              </p>
            </div>
            <div
              style={{
                background: "#fff",
                border: "1px solid #e5e5e5",
                borderRadius: 10,
                padding: "1.5rem",
                marginBottom: 24,
              }}
            >
              <p style={{ fontSize: 12, color: "#888", marginBottom: 4 }}>
                XLM Balance
              </p>
              <p style={{ fontSize: 28, fontWeight: 600, color: "#111" }}>
                {balance}
              </p>
              <p style={{ fontSize: 12, color: "#aaa" }}>Testnet</p>
            </div>
            <button
              onClick={handleFundWallet}
              disabled={loading}
              style={{
                width: "100%",
                background: "#111",
                color: "#fff",
                border: "none",
                padding: "12px",
                borderRadius: 8,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              Fund from Friendbot (Testnet)
            </button>
          </div>
        )}

        {/* Article screen */}
        {screen === "article" && activeArticle && (
          <div style={{ maxWidth: 640 }}>
            <button
              onClick={() => setScreen("home")}
              style={{
                background: "none",
                border: "none",
                color: "#666",
                fontSize: 13,
                cursor: "pointer",
                marginBottom: "1.5rem",
                padding: 0,
              }}
            >
              ← Back to articles
            </button>
            <p style={{ fontSize: 12, color: "#888", marginBottom: 4 }}>
              {activeArticle.author}
            </p>
            <h1
              style={{
                fontSize: 26,
                fontWeight: 700,
                color: "#111",
                marginBottom: "1.5rem",
                lineHeight: 1.3,
              }}
            >
              {activeArticle.title}
            </h1>
            <div
              style={{
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                borderRadius: 8,
                padding: "10px 14px",
                marginBottom: "1.5rem",
                fontSize: 13,
                color: "#166534",
              }}
            >
              ✓ Access purchased on Stellar testnet · Paid{" "}
              {activeArticle.priceLabel}
            </div>
            <p style={{ fontSize: 16, color: "#333", lineHeight: 1.8 }}>
              {activeArticle.content}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
