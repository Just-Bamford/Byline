import { useState, useEffect } from "react";
import { WalletManager } from "./lib/wallet";
import { ArticleReader } from "./components/ArticleReader";
import { WalletUI } from "./components/WalletUI";
import "./App.css";

const CONTRACT_ID = "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4";

function App() {
  const [wallet, setWallet] = useState<WalletManager | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  // Load wallet from localStorage on mount
  useEffect(() => {
    const savedSecret = localStorage.getItem("byline-wallet-secret");
    if (savedSecret) {
      try {
        const walletManager = WalletManager.fromSecret(savedSecret);
        setWallet(walletManager);
        updateBalance(walletManager);
      } catch (err) {
        console.error("Failed to load wallet:", err);
        localStorage.removeItem("byline-wallet-secret");
      }
    }
  }, []);

  // Refresh balance periodically
  useEffect(() => {
    if (!wallet) return;

    const interval = setInterval(() => {
      updateBalance(wallet);
    }, 10000); // Refresh every 10 seconds

    return () => clearInterval(interval);
  }, [wallet]);

  const updateBalance = async (walletManager: WalletManager) => {
    try {
      const newBalance = await walletManager.getBalance();
      setBalance(newBalance);
    } catch (err) {
      console.error("Failed to update balance:", err);
    }
  };

  const initializeWallet = async (email: string) => {
    setLoading(true);
    try {
      // Create new wallet
      const newWallet = WalletManager.create();
      const publicKey = newWallet.getPublicKey();

      // Fund wallet via Friendbot (testnet only)
      await newWallet.topUp(0);

      // Save secret to localStorage
      localStorage.setItem(
        "byline-wallet-secret",
        newWallet.getKeypair().secret(),
      );

      setWallet(newWallet);
      await updateBalance(newWallet);
    } catch (err) {
      console.error("Wallet initialization failed:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const topUpWallet = async (amount: number) => {
    if (!wallet) return;

    setLoading(true);
    try {
      // For testnet, use Friendbot
      // For mainnet, integrate with fiat on-ramp
      await wallet.topUp(amount);
      await updateBalance(wallet);
    } catch (err) {
      console.error("Top-up failed:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <h1>📰 Byline Reader</h1>
          <p className="tagline">Pay per article. Not per month.</p>
        </div>
        <WalletUI
          balance={balance}
          onTopUp={topUpWallet}
          onInitialize={initializeWallet}
          isInitialized={wallet !== null}
        />
      </header>

      <main className="app-main">
        {wallet ? (
          <ArticleReader wallet={wallet} contractId={CONTRACT_ID} />
        ) : (
          <div className="login-prompt">
            <div className="prompt-content">
              <h2>Welcome to Byline</h2>
              <p>
                Read quality journalism without subscriptions. Pay only for what
                you read.
              </p>
              <p className="subtext">
                Create a wallet to get started. It takes less than a minute.
              </p>
            </div>
          </div>
        )}
      </main>

      <footer className="app-footer">
        <p>
          Powered by{" "}
          <a
            href="https://stellar.org"
            target="_blank"
            rel="noopener noreferrer"
          >
            Stellar
          </a>
          . Open source. No intermediaries.
        </p>
      </footer>
    </div>
  );
}

export default App;
