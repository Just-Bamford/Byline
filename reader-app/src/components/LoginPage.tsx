/**
 * LoginPage Component
 * Presents users with choice between email-based custodial wallet or Freighter self-custody
 */

import React, { useState } from "react";
import { useAuth } from "../lib/authContext";
import { isFreighterInstalled } from "../lib/wallet";

type LoginMethod = "email" | "freighter" | null;

interface LoginPageProps {
  onSuccess: () => void;
}

export function LoginPage({ onSuccess }: LoginPageProps) {
  const { error, isLoading, clearError } = useAuth();
  const [method, setMethod] = useState<LoginMethod>(null);
  const [freighterAvailable, setFreighterAvailable] = React.useState(false);

  React.useEffect(() => {
    isFreighterInstalled().then(setFreighterAvailable);
  }, []);

  const handleMethodSelect = (selectedMethod: LoginMethod) => {
    clearError();
    setMethod(selectedMethod);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #fafaf8 0%, #f5f5f3 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
      }}
    >
      <div
        style={{
          maxWidth: 600,
          width: "100%",
          background: "#fff",
          borderRadius: 12,
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
          padding: "3rem 2rem",
        }}
      >
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <h1
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: "#111",
              marginBottom: 8,
            }}
          >
            Welcome to Byline
          </h1>
          <p
            style={{
              fontSize: 14,
              color: "#666",
              maxWidth: 420,
              margin: "0 auto",
            }}
          >
            Read great journalism. Pay per article. Choose how you want to
            manage your wallet.
          </p>
        </div>

        {/* Method Selection */}
        {method === null ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Email Option */}
            <button
              onClick={() => handleMethodSelect("email")}
              disabled={isLoading}
              style={{
                background: "#fff",
                border: "2px solid #e5e5e5",
                borderRadius: 10,
                padding: "1.5rem",
                cursor: isLoading ? "default" : "pointer",
                transition: "all 200ms",
                textAlign: "left",
                opacity: isLoading ? 0.6 : 1,
              }}
              onMouseEnter={(e) => {
                if (!isLoading) e.currentTarget.style.borderColor = "#111";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#e5e5e5";
              }}
            >
              <div
                style={{ display: "flex", alignItems: "flex-start", gap: 12 }}
              >
                <div
                  style={{
                    fontSize: 24,
                    flexShrink: 0,
                  }}
                >
                  ✉️
                </div>
                <div>
                  <h3
                    style={{
                      fontSize: 16,
                      fontWeight: 600,
                      color: "#111",
                      marginBottom: 4,
                    }}
                  >
                    Email Wallet
                  </h3>
                  <p style={{ fontSize: 13, color: "#666" }}>
                    Quick & easy. We manage your Stellar keypair. Read today,
                    export anytime to self-custody.
                  </p>
                </div>
              </div>
            </button>

            {/* Freighter Option */}
            <button
              onClick={() => handleMethodSelect("freighter")}
              disabled={isLoading || !freighterAvailable}
              style={{
                background: "#fff",
                border: "2px solid #e5e5e5",
                borderRadius: 10,
                padding: "1.5rem",
                cursor:
                  isLoading || !freighterAvailable ? "default" : "pointer",
                transition: "all 200ms",
                textAlign: "left",
                opacity: isLoading || !freighterAvailable ? 0.6 : 1,
              }}
              onMouseEnter={(e) => {
                if (!isLoading && freighterAvailable)
                  e.currentTarget.style.borderColor = "#111";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#e5e5e5";
              }}
            >
              <div
                style={{ display: "flex", alignItems: "flex-start", gap: 12 }}
              >
                <div style={{ fontSize: 24, flexShrink: 0 }}>🔐</div>
                <div>
                  <h3
                    style={{
                      fontSize: 16,
                      fontWeight: 600,
                      color: "#111",
                      marginBottom: 4,
                    }}
                  >
                    Freighter Wallet
                  </h3>
                  <p style={{ fontSize: 13, color: "#666" }}>
                    Self-custody. You control your keys. Connect your existing
                    Freighter wallet.
                  </p>
                  {!freighterAvailable && (
                    <p
                      style={{
                        fontSize: 12,
                        color: "#d97706",
                        marginTop: 6,
                      }}
                    >
                      Freighter browser extension not installed
                    </p>
                  )}
                </div>
              </div>
            </button>

            {/* Info box */}
            <div
              style={{
                background: "#f9fafb",
                border: "1px solid #e5e5e5",
                borderRadius: 8,
                padding: "1rem",
                marginTop: "0.5rem",
              }}
            >
              <p style={{ fontSize: 12, color: "#666" }}>
                <strong>Not sure?</strong> Start with email for the fastest
                onboarding. Export to Freighter later for full self-custody.
              </p>
            </div>
          </div>
        ) : method === "email" ? (
          <EmailSignup onSuccess={onSuccess} onBack={() => setMethod(null)} />
        ) : (
          <FreighterConnect
            onSuccess={onSuccess}
            onBack={() => setMethod(null)}
          />
        )}

        {/* Error message */}
        {error && (
          <div
            style={{
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: 8,
              padding: "12px",
              marginTop: "1rem",
              fontSize: 13,
              color: "#991b1b",
            }}
          >
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Email Signup Component ────────────────────────────────────────

interface EmailSignupProps {
  onBack: () => void;
}

function EmailSignup({ onBack }: EmailSignupProps) {
  const { signup, login, isLoading, error: authError } = useAuth();
  const [email, setEmail] = React.useState("");
  const [isNewUser, setIsNewUser] = React.useState(true);
  const [emailSent, setEmailSent] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    try {
      if (isNewUser) {
        await signup(email);
      } else {
        await login(email);
      }
      setEmailSent(true);
    } catch {
      // Error is handled by context
    }
  };

  if (emailSent) {
    return (
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            fontSize: 40,
            marginBottom: "1rem",
          }}
        >
          📧
        </div>
        <h2
          style={{
            fontSize: 18,
            fontWeight: 600,
            color: "#111",
            marginBottom: 8,
          }}
        >
          Check your email
        </h2>
        <p
          style={{
            fontSize: 14,
            color: "#666",
            marginBottom: "1.5rem",
            lineHeight: 1.6,
          }}
        >
          We've sent a magic link to <strong>{email}</strong>. Click it to
          verify and create your managed wallet.
        </p>
        <p style={{ fontSize: 13, color: "#999", marginBottom: "1.5rem" }}>
          Link expires in 15 minutes.
        </p>
        <button
          onClick={() => {
            setEmailSent(false);
            setEmail("");
          }}
          style={{
            width: "100%",
            background: "#111",
            color: "#fff",
            border: "none",
            padding: "10px",
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          ← Try another email
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{ display: "flex", flexDirection: "column", gap: 12 }}
    >
      <div>
        <label
          style={{
            display: "block",
            fontSize: 13,
            fontWeight: 500,
            color: "#333",
            marginBottom: 6,
          }}
        >
          Email Address
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          disabled={isLoading}
          style={{
            width: "100%",
            padding: "10px 12px",
            border: "1px solid #e5e5e5",
            borderRadius: 8,
            fontSize: 14,
            fontFamily: "inherit",
            boxSizing: "border-box",
            transition: "border-color 200ms",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "#111";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "#e5e5e5";
          }}
        />
      </div>

      <div style={{ display: "flex", gap: 8, fontSize: 13, color: "#666" }}>
        <input
          type="checkbox"
          id="new-user"
          checked={isNewUser}
          onChange={(e) => setIsNewUser(e.target.checked)}
          disabled={isLoading}
          style={{ cursor: "pointer" }}
        />
        <label htmlFor="new-user" style={{ cursor: "pointer" }}>
          I'm creating an account for the first time
        </label>
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: "0.5rem" }}>
        <button
          type="submit"
          disabled={isLoading || !email}
          style={{
            flex: 1,
            background: "#111",
            color: "#fff",
            border: "none",
            padding: "10px",
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 500,
            cursor: isLoading || !email ? "default" : "pointer",
            opacity: isLoading || !email ? 0.7 : 1,
          }}
        >
          {isLoading ? "Sending..." : "Send Magic Link"}
        </button>
        <button
          type="button"
          onClick={onBack}
          disabled={isLoading}
          style={{
            background: "#f3f4f6",
            color: "#666",
            border: "none",
            padding: "10px",
            borderRadius: 8,
            fontSize: 14,
            cursor: isLoading ? "default" : "pointer",
            opacity: isLoading ? 0.6 : 1,
          }}
        >
          Back
        </button>
      </div>

      {authError && !authError.includes("Cannot") && (
        <p style={{ fontSize: 12, color: "#dc2626", textAlign: "center" }}>
          {authError}
        </p>
      )}
    </form>
  );
}

// ── Freighter Connect Component ───────────────────────────────────

interface FreighterConnectProps {
  onSuccess: () => void;
  onBack: () => void;
}

function FreighterConnect({ onSuccess, onBack }: FreighterConnectProps) {
  const { connectFreighter, isLoading } = useAuth();

  const handleConnect = async () => {
    try {
      await connectFreighter();
      onSuccess();
    } catch {
      // Error handled by context
    }
  };

  return (
    <div style={{ textAlign: "center" }}>
      <div
        style={{
          fontSize: 40,
          marginBottom: "1rem",
        }}
      >
        🔐
      </div>
      <h2
        style={{
          fontSize: 18,
          fontWeight: 600,
          color: "#111",
          marginBottom: 12,
        }}
      >
        Connect Freighter
      </h2>
      <p
        style={{
          fontSize: 14,
          color: "#666",
          marginBottom: "2rem",
          lineHeight: 1.6,
        }}
      >
        You'll be able to use your existing Stellar wallet to read articles on
        Byline.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <button
          onClick={handleConnect}
          disabled={isLoading}
          style={{
            background: "#111",
            color: "#fff",
            border: "none",
            padding: "12px",
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 500,
            cursor: isLoading ? "default" : "pointer",
            opacity: isLoading ? 0.7 : 1,
          }}
        >
          {isLoading ? "Connecting..." : "Open Freighter"}
        </button>
        <button
          onClick={onBack}
          disabled={isLoading}
          style={{
            background: "#f3f4f6",
            color: "#666",
            border: "none",
            padding: "12px",
            borderRadius: 8,
            fontSize: 14,
            cursor: isLoading ? "default" : "pointer",
            opacity: isLoading ? 0.6 : 1,
          }}
        >
          Back
        </button>
      </div>
    </div>
  );
}
