import { useState, useEffect } from "react";
import "./WalletUI.css";

interface WalletUIProps {
  balance: number;
  onTopUp: (amount: number) => Promise<void>;
  onInitialize: (email: string) => Promise<void>;
  onLogout?: () => void;
  isInitialized: boolean;
}

export function WalletUI({
  balance,
  onTopUp,
  onInitialize,
  onLogout,
  isInitialized,
}: WalletUIProps) {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showWalletInfo, setShowWalletInfo] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string>("");
  const [topUpStatus, setTopUpStatus] = useState<string>("");
  const [transactions, setTransactions] = useState<
    Array<{ type: string; amount: number; timestamp: number }>
  >([]);

  // Load wallet address from localStorage
  useEffect(() => {
    if (isInitialized) {
      const savedSecret = localStorage.getItem("byline-wallet-secret");
      if (savedSecret) {
        // In production, derive address from secret
        const addr = savedSecret.substring(0, 16) + "...";
        setWalletAddress(addr);
      }
    }
  }, [isInitialized]);

  const handleTopUp = async (amount: number) => {
    setLoading(true);
    setError(null);
    setTopUpStatus(`Adding ${amount} XLM...`);
    try {
      await onTopUp(amount);
      setTopUpStatus(`✅ Added ${amount} XLM to your account`);
      setTransactions((prev) => [
        ...prev,
        { type: "topup", amount, timestamp: Date.now() },
      ]);
      setTimeout(() => setTopUpStatus(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Top-up failed");
      setTopUpStatus(`❌ Top-up failed`);
      setTimeout(() => setTopUpStatus(""), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleInitialize = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await onInitialize(email);
      setEmail("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Initialization failed");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    const savedSecret = localStorage.getItem("byline-wallet-secret");
    if (savedSecret) {
      navigator.clipboard.writeText(savedSecret);
      alert("Wallet secret copied to clipboard");
    }
  };

  if (!isInitialized) {
    return (
      <div className="wallet-ui wallet-login">
        <h3>Create Your Byline Wallet</h3>
        <form onSubmit={handleInitialize}>
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
          />
          <button type="submit" disabled={loading}>
            {loading ? "Creating..." : "🔐 Create Wallet"}
          </button>
        </form>
        {error && <p className="error">❌ {error}</p>}
        <p className="wallet-info">
          Your wallet will be funded with testnet tokens automatically.
        </p>
      </div>
    );
  }

  return (
    <div className="wallet-ui wallet-connected">
      <div className="balance-container">
        <div className="balance-display">
          <span className="label">Balance</span>
          <span className="amount">{balance.toFixed(4)} XLM</span>
        </div>

        <button
          className="wallet-info-btn"
          onClick={() => setShowWalletInfo(!showWalletInfo)}
          title="Show wallet info"
        >
          ℹ️
        </button>
      </div>

      {showWalletInfo && (
        <div className="wallet-info-panel">
          <div className="info-item">
            <span className="label">Wallet Address</span>
            <span className="value">{walletAddress}</span>
          </div>
          <button className="btn btn-small" onClick={copyToClipboard}>
            Copy Secret Key
          </button>
          <p className="warning">⚠️ Never share your secret key with anyone</p>

          {transactions.length > 0 && (
            <div className="transaction-history">
              <h4>Recent Transactions</h4>
              <ul>
                {transactions
                  .slice(-5)
                  .reverse()
                  .map((tx, idx) => (
                    <li key={idx}>
                      <span className="tx-type">
                        {tx.type === "topup" ? "➕" : "➖"}
                      </span>
                      <span className="tx-amount">{tx.amount} XLM</span>
                      <span className="tx-time">
                        {new Date(tx.timestamp).toLocaleDateString()}
                      </span>
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="topup-buttons">
        <button
          className="btn btn-topup"
          onClick={() => handleTopUp(10)}
          disabled={loading}
        >
          {loading ? "..." : "+ 10 XLM"}
        </button>
        <button
          className="btn btn-topup"
          onClick={() => handleTopUp(50)}
          disabled={loading}
        >
          {loading ? "..." : "+ 50 XLM"}
        </button>
        <button
          className="btn btn-topup"
          onClick={() => handleTopUp(100)}
          disabled={loading}
        >
          {loading ? "..." : "+ 100 XLM"}
        </button>
      </div>

      {onLogout && (
        <button className="btn btn-logout" onClick={onLogout}>
          🚪 Logout
        </button>
      )}

      {error && <p className="error">❌ {error}</p>}
    </div>
  );
}
