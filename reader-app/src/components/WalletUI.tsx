import { useState, useEffect } from "react";
import "./WalletUI.css";

interface WalletUIProps {
  balance: number;
  onTopUp: (amount: number) => Promise<void>;
  onInitialize: (email: string) => Promise<void>;
  isInitialized: boolean;
}

export function WalletUI({
  balance,
  onTopUp,
  onInitialize,
  isInitialized,
}: WalletUIProps) {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleTopUp = async (amount: number) => {
    setLoading(true);
    setError(null);
    try {
      await onTopUp(amount);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Top-up failed");
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
            {loading ? "Creating..." : "Create Wallet"}
          </button>
        </form>
        {error && <p className="error">{error}</p>}
      </div>
    );
  }

  return (
    <div className="wallet-ui">
      <div className="balance-display">
        <span className="label">Balance</span>
        <span className="amount">${balance.toFixed(4)} XLM</span>
      </div>

      <div className="topup-buttons">
        <button
          className="btn btn-topup"
          onClick={() => handleTopUp(10)}
          disabled={loading}
        >
          {loading ? "Processing..." : "+ $10"}
        </button>
        <button
          className="btn btn-topup"
          onClick={() => handleTopUp(50)}
          disabled={loading}
        >
          {loading ? "Processing..." : "+ $50"}
        </button>
        <button
          className="btn btn-topup"
          onClick={() => handleTopUp(100)}
          disabled={loading}
        >
          {loading ? "Processing..." : "+ $100"}
        </button>
      </div>

      {error && <p className="error">{error}</p>}
    </div>
  );
}
