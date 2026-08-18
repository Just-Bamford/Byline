import { useState, useEffect, useCallback } from "react";
import { AuthProvider } from "./lib/AuthProvider";
import { useAuth } from "./lib/authContext";
import { getBalance, fundFromFriendbot, purchaseArticle } from "./lib/wallet";
import { verifyAccess, recordRead } from "./lib/api";
import { LoginPage } from "./components/LoginPage";
import { MagicLinkVerify } from "./components/MagicLinkVerify";
import { ManagedWalletIndicator } from "./components/ManagedWalletIndicator";
import { WalletExportFlow } from "./components/WalletExportFlow";

// ── Sample articles (replace with real publisher API in Phase 2) ──

const SAMPLE_ARTICLES = [
  {
    id: "article-001",
    title: "The Future of Decentralised Media",
    author: "Ada Okafor",
    preview:
      "How blockchain-based micropayments are reshaping the relationship between publishers and readers...",
    content: [
      {
        type: "intro",
        text: "The mediascape is fracturing. On one side, traditional publishers hemorrhage subscribers as readers balk at paywalls. On the other, creators—journalists, photographers, researchers—watch their labour get commodified into ad impressions and engagement metrics that ultimately flow upstream to platforms they don't control.",
      },
      {
        type: "paragraph",
        text: "There is a third way emerging. One built on the immutable ledger, peer-to-peer settlement, and a radical simplification: direct payment from reader to writer. This is decentralised media.",
      },
      {
        type: "heading",
        text: "The Subscription Model Is Broken",
      },
      {
        type: "paragraph",
        text: "Let's start with the obvious. The subscription economy promised to save journalism. Pay $15/month to the New York Times, $10 to the Financial Times, $8 to your local paper, $12 to Medium, $5 to Substack, $7 to this newsletter. By the time a reader has subscribed to five publications they care about, they've spent $57 monthly—often for content they read once or twice a month.",
      },
      {
        type: "paragraph",
        text: "The math doesn't work. Readers defect. Publishers panic. The industry has fractured into premium publications (Financial Times, Economist), free-with-ads (most digital news), and hybrid models where nobody quite understands what they're paying for.",
      },
      {
        type: "paragraph",
        text: "Publishers, meanwhile, face impossible choices: chase scale through sensationalism, or pursue quality at the cost of reach. The incentives are misaligned. A sustainable economics would mean readers vote directly with their money on the content they value, not on how many ads a publisher can shove into their feed.",
      },
      {
        type: "heading",
        text: "Why Micropayments Failed Before",
      },
      {
        type: "paragraph",
        text: "The idea of paying fractions of a cent per article is not new. Technologists have been evangelising micropayments since the 1990s. Bitcoin, Ethereum, Lightning Network—all were positioned as the infrastructure that would finally make micropayments viable.",
      },
      {
        type: "paragraph",
        text: "Yet they remain niche. Why?",
      },
      {
        type: "subheading",
        text: "Friction and fees.",
      },
      {
        type: "paragraph",
        text: "If an article costs $0.002, and the payment processor takes $0.0015, the math breaks. Even with Lightning, managing custody, routing, and atomic settlement adds friction that makes readers hesitant. Click. Enter payment details. Confirm. Wait. All for an article you might not even finish.",
      },
      {
        type: "subheading",
        text: "Custody problems.",
      },
      {
        type: "paragraph",
        text: "For micropayments to work at scale, most readers need a wallet that's already funded. But wallets historically have been clunky, prone to hacks, and bundled with trading platforms. Few readers want to maintain a balance in yet another payment system.",
      },
      {
        type: "subheading",
        text: "No rails for publishers to cash out.",
      },
      {
        type: "paragraph",
        text: "Even if micropayments worked, publishers faced a new problem: how do you cash out $50 of accumulated micropayments? Traditional banking rails take days and charge minimum withdrawal fees that dwarf the revenue.",
      },
      {
        type: "heading",
        text: "Stellar Changes the Equation",
      },
      {
        type: "paragraph",
        text: "Stellar was designed for emerging markets. Its core insight: payment infrastructure should be cheap, fast, and open.",
      },
      {
        type: "paragraph",
        text: "The facts are stark:",
      },
      {
        type: "list",
        items: [
          "Base transaction fee: 0.00001 XLM (~$0.000001 USD)",
          "Settlement time: 3-5 seconds",
          "Minimum account creation: trivial",
        ],
      },
      {
        type: "paragraph",
        text: "This reframes the micropayment problem entirely. An article at $0.002 XLM (about half a cent USD) now becomes economically viable. The fee is negligible. The reader's wallet can be unfunded until the moment they decide to read—no need to maintain a balance. And when a publisher accumulates earnings, the settlement is instant and the withdrawal fees are sub-cent.",
      },
      {
        type: "paragraph",
        text: "More crucially: Stellar's existing presence in African fintech ecosystems, its partnerships with money transmitters, and its native asset support mean publishers can actually cash out XLM to their local currencies across borders with minimal friction.",
      },
      {
        type: "paragraph",
        text: "This isn't theoretical. It's infrastructure that already works.",
      },
      {
        type: "heading",
        text: "The Protocol Layer",
      },
      {
        type: "paragraph",
        text: "But micropayment infrastructure alone isn't enough. You also need the protocol layer—a way for readers, publishers, and platforms to cryptographically verify that a payment occurred, that access was granted, and that the transaction is non-repudiable.",
      },
      {
        type: "paragraph",
        text: "Enter Soroban smart contracts. A publisher registers an article on-chain, sets a price, and issues access tokens valid for 24 hours. A reader purchases access; the contract deducts the payment, grants the token, and records the transaction immutably. When the reader visits the publisher's site, the browser verifies the token cryptographically. No API calls to a centralised server. No payment processor to call. The Stellar blockchain itself is the source of truth.",
      },
      {
        type: "paragraph",
        text: "This has profound implications:",
      },
      {
        type: "subheading",
        text: "Publishers regain agency.",
      },
      {
        type: "paragraph",
        text: "They set prices dynamically, without negotiating with platforms. They see real-time, verifiable analytics on who reads what. They can run promotions, bundle content, or experiment with pricing tiers—all without intermediaries taking a cut.",
      },
      {
        type: "subheading",
        text: "Readers regain sovereignty.",
      },
      {
        type: "paragraph",
        text: "They control their wallet. They see exactly what they're paying and to whom. They can discover content on any site that supports the protocol, not just on centralised platforms.",
      },
      {
        type: "subheading",
        text: "No single point of failure.",
      },
      {
        type: "paragraph",
        text: "The contract lives on the blockchain. The token is cryptographic. There's no service to go down, no payment processor to sue, no platform to ban you.",
      },
      {
        type: "heading",
        text: "The Path Forward",
      },
      {
        type: "paragraph",
        text: "Decentralised media won't replace traditional publishing overnight. The Financial Times will keep its paywall. Journalists will still work for institutions.",
      },
      {
        type: "paragraph",
        text: "But at the margins—where independent writers, investigative journalists, niche publishers, and creators live—the economics suddenly shift. A writer with 1,000 dedicated readers paying $0.002 per article generates meaningful revenue without needing to build a SaaS platform or court venture capital.",
      },
      {
        type: "paragraph",
        text: "This is already happening. Substack creators know this. So do podcast networks and YouTube creators. The question isn't whether small-scale creators can make a living on direct reader support. It's whether they'll do so on centralised platforms controlled by others or on open infrastructure they can port to at any time.",
      },
      {
        type: "paragraph",
        text: "Decentralised media is emerging not because it's ideologically pure, but because the incentives finally align. Readers get to pay only for what they consume. Publishers get instant, cheap settlement. And the infrastructure—Stellar, Soroban, Freighter wallets—is ready now.",
      },
      {
        type: "paragraph",
        text: "The future of media isn't subscription or ads. It's transaction. And for the first time, the technology makes that possible at scale.",
      },
    ],
    price: 0.002,
    priceLabel: "$0.002",
  },
  {
    id: "article-002",
    title: "Stellar's Role in African Fintech",
    author: "Emeka Nwosu",
    preview:
      "Why low-fee settlement rails are critical infrastructure for emerging markets...",
    content: [
      {
        type: "intro",
        text: "Africa's fintech revolution is real. From M-Pesa in Kenya to Chipper Cash across the continent, digital payments are becoming the default for millions who were historically excluded from traditional banking.",
      },
      {
        type: "paragraph",
        text: "But there's a constraint that nobody talks about: the cost of cross-border settlement.",
      },
      {
        type: "heading",
        text: "The Settlement Problem",
      },
      {
        type: "paragraph",
        text: "When a trader in Lagos sends money to a supplier in Nairobi, the transaction has to clear through international SWIFT networks. The fees are brutal. A $100 transfer costs $10-15 in fees and takes 3-5 days. For small businesses operating on thin margins, that makes cross-border commerce almost unviable.",
      },
      {
        type: "paragraph",
        text: "Stellar was explicitly designed to solve this. Its anchors (regulated financial institutions) can convert local currencies to XLM and back at the point of use. A business in Uganda sends XLM to a business in Ghana. Settlement happens in seconds. The fee is negligible.",
      },
      {
        type: "heading",
        text: "Why This Matters",
      },
      {
        type: "paragraph",
        text: "African trade is moving digital. Goods flow. Money needs to follow. Stellar's low-cost settlement rail makes that possible at scale.",
      },
    ],
    price: 0.003,
    priceLabel: "$0.003",
  },
  {
    id: "article-003",
    title: "Soroban Smart Contracts: A Developer's View",
    author: "Bamford Just",
    preview:
      "Building the first micropayment protocol on Soroban — lessons from the trenches...",
    content: [
      {
        type: "intro",
        text: "Soroban is Stellar's smart contract platform. It's Rust-based, runs on a sidecar, and interacts with the Stellar ledger. If you've built on EVM chains, it will feel familiar. But there are key differences.",
      },
      {
        type: "heading",
        text: "The Sandbox Model",
      },
      {
        type: "paragraph",
        text: "Unlike Ethereum where contracts live permanently on-chain, Soroban contracts execute in a sandbox environment. This sounds exotic, but it has a huge benefit: you can write contracts in pure Rust without worrying about EVM-specific quirks. No opcodes. No gas cost gotchas. Just Rust.",
      },
      {
        type: "heading",
        text: "Lessons from Building Byline",
      },
      {
        type: "paragraph",
        text: "We built a micropayment contract with three core functions: register articles, purchase access, and verify tokens. Here's what we learned:",
      },
      {
        type: "subheading",
        text: "Storage costs are real.",
      },
      {
        type: "paragraph",
        text: "Every entry you store on Soroban has a cost tied to ledger rent. For a high-frequency protocol like Byline, you need to be strategic about what you persist on-chain versus what you keep client-side.",
      },
      {
        type: "subheading",
        text: "The tooling is evolving.",
      },
      {
        type: "paragraph",
        text: "The Stellar CLI, Soroban SDK, and Freighter integration are young but solid. Documentation could be more comprehensive, but the core experience is productive.",
      },
      {
        type: "paragraph",
        text: "For builders: Soroban is worth your time if you're thinking about Stellar-based applications.",
      },
    ],
    price: 0.001,
    priceLabel: "$0.001",
  },
];

type Screen = "home" | "wallet" | "article";

interface AppContentProps {
  walletAddress: string;
}

function AppContent({ walletAddress }: AppContentProps) {
  const { logout, walletType } = useAuth();
  const [showExport, setShowExport] = useState(false);
  const [screen, setScreen] = useState<Screen>("home");
  const [balance, setBalance] = useState<string>("0.0000");
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  // Pre-unlock first article for demo purposes
  const [unlockedArticles, setUnlockedArticles] = useState<Set<string>>(
    new Set(["article-001"]),
  );
  const [activeArticle, setActiveArticle] = useState<
    (typeof SAMPLE_ARTICLES)[0] | null
  >(null);

  // Refresh balance when wallet connects
  const refreshBalance = useCallback(async (key: string) => {
    const bal = await getBalance(key);
    setBalance(bal);
  }, []);

  useEffect(() => {
    if (walletAddress) refreshBalance(walletAddress);
  }, [walletAddress, refreshBalance]);

  async function handleFundWallet() {
    if (!walletAddress) return;
    setLoading(true);
    setStatusMsg("Requesting testnet XLM from Friendbot...");
    try {
      await fundFromFriendbot(walletAddress);
      await refreshBalance(walletAddress);
      setStatusMsg("✓ Funded with 10,000 testnet XLM");
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      setStatusMsg(`Funding failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function handlePurchase(article: (typeof SAMPLE_ARTICLES)[0]) {
    if (!walletAddress) return;
    setLoading(true);
    setStatusMsg(`Purchasing access to "${article.title}"...`);
    try {
      const result = await purchaseArticle(walletAddress, article.id);
      if (result.success) {
        await recordRead(article.id, walletAddress, article.price);
        setUnlockedArticles((prev) => new Set([...prev, article.id]));
        setStatusMsg(`✓ Access granted! Tx: ${result.txHash.slice(0, 12)}...`);
        await refreshBalance(walletAddress);
      }
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      setStatusMsg(`Purchase failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleReadArticle(article: (typeof SAMPLE_ARTICLES)[0]) {
    // Allow viewing demo article without wallet
    if (unlockedArticles.has(article.id)) {
      setActiveArticle(article);
      setScreen("article");
      return;
    }

    if (!walletAddress) {
      setStatusMsg("Connect your wallet to purchase articles");
      return;
    }

    // Check on-chain before purchase
    setLoading(true);
    setStatusMsg("Checking on-chain access...");
    try {
      const hasAccess = await verifyAccess(walletAddress, article.id);
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

  const headerKey = walletAddress
    ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
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
            {walletAddress ? (
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
                <button
                  onClick={() => logout()}
                  style={{
                    fontSize: 13,
                    background: "none",
                    border: "1px solid #ddd",
                    padding: "4px 12px",
                    borderRadius: 6,
                    cursor: "pointer",
                  }}
                >
                  Logout
                </button>
              </>
            ) : (
              <button
                onClick={() => logout()}
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
                Logout
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
              {walletAddress && walletType === "custodial" && (
                <ManagedWalletIndicator
                  onOpenExport={() => setShowExport(true)}
                />
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
        {screen === "wallet" && walletAddress && (
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
                {walletAddress}
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
          <div style={{ maxWidth: 680 }}>
            <button
              onClick={() => setScreen("home")}
              style={{
                background: "none",
                border: "none",
                color: "#666",
                fontSize: 13,
                cursor: "pointer",
                marginBottom: "2rem",
                padding: 0,
              }}
            >
              ← Back to articles
            </button>
            <p style={{ fontSize: 12, color: "#888", marginBottom: 8 }}>
              {activeArticle.author}
            </p>
            <h1
              style={{
                fontSize: 28,
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
                padding: "12px 14px",
                marginBottom: "2rem",
                fontSize: 13,
                color: "#166534",
              }}
            >
              ✓ Access purchased on Stellar testnet · Paid{" "}
              {activeArticle.priceLabel}
            </div>

            {/* Render structured article content */}
            <div style={{ lineHeight: 1.8, fontSize: 16 }}>
              {Array.isArray(activeArticle.content) &&
                activeArticle.content.map(
                  (
                    section: {
                      type: string;
                      text?: string;
                      items?: string[];
                    },
                    idx: number,
                  ) => {
                    if (section.type === "intro") {
                      return (
                        <p
                          key={idx}
                          style={{
                            fontSize: 18,
                            fontWeight: 500,
                            color: "#222",
                            marginBottom: "1.5rem",
                            lineHeight: 1.7,
                          }}
                        >
                          {section.text}
                        </p>
                      );
                    }
                    if (section.type === "heading") {
                      return (
                        <h2
                          key={idx}
                          style={{
                            fontSize: 22,
                            fontWeight: 700,
                            color: "#111",
                            marginTop: "2rem",
                            marginBottom: "1rem",
                            lineHeight: 1.3,
                          }}
                        >
                          {section.text}
                        </h2>
                      );
                    }
                    if (section.type === "subheading") {
                      return (
                        <p
                          key={idx}
                          style={{
                            fontSize: 16,
                            fontWeight: 600,
                            color: "#222",
                            marginTop: "1.25rem",
                            marginBottom: "0.75rem",
                          }}
                        >
                          {section.text}
                        </p>
                      );
                    }
                    if (section.type === "paragraph") {
                      return (
                        <p
                          key={idx}
                          style={{
                            color: "#333",
                            marginBottom: "1.25rem",
                            lineHeight: 1.8,
                          }}
                        >
                          {section.text}
                        </p>
                      );
                    }
                    if (section.type === "list") {
                      return (
                        <ul
                          key={idx}
                          style={{
                            marginBottom: "1.5rem",
                            marginLeft: "1.5rem",
                            color: "#333",
                          }}
                        >
                          {section.items.map((item: string, i: number) => (
                            <li
                              key={i}
                              style={{
                                marginBottom: "0.5rem",
                                lineHeight: 1.7,
                              }}
                            >
                              {item}
                            </li>
                          ))}
                        </ul>
                      );
                    }
                    return null;
                  },
                )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// ── Wrapper component that uses auth context ──

function AppWithAuth() {
  const auth = useAuth();
  const [showExport, setShowExport] = useState(false);

  // Check if there's a magic link token in the URL
  const urlParams = new URLSearchParams(window.location.search);
  const magicLinkToken = urlParams.get("token");

  if (magicLinkToken) {
    return (
      <MagicLinkVerify
        token={magicLinkToken}
        onSuccess={() => {
          // Remove token from URL
          window.history.replaceState(
            {},
            document.title,
            window.location.pathname,
          );
        }}
      />
    );
  }

  // Show login page if not authenticated and not loading
  if (!auth.isAuthenticated && !auth.isLoading) {
    return <LoginPage onSuccess={() => {}} />;
  }

  // Show loading state
  if (auth.isLoading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#fafaf8",
        }}
      >
        <div
          style={{
            display: "inline-block",
            width: 32,
            height: 32,
            border: "3px solid #e5e5e5",
            borderTop: "3px solid #111",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <>
      <AppContent walletAddress={auth.walletAddress || ""} />
      {showExport && <WalletExportFlow onClose={() => setShowExport(false)} />}
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppWithAuth />
    </AuthProvider>
  );
}
