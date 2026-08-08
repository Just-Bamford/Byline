import React, { useState } from "react";
import { AlertCircle, Loader } from "lucide-react";

interface LoginPageProps {}

export const LoginPage: React.FC<LoginPageProps> = () => {
  const [publisherAddress, setPublisherAddress] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!publisherAddress.trim()) {
      setError("Please enter your Stellar address");
      return;
    }

    if (!publisherAddress.startsWith("G")) {
      setError("Invalid Stellar address format");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      // In production, this would authenticate with the backend
      // For now, we just store the address
      const mockToken = `token_${Date.now()}`;

      localStorage.setItem("auth_token", mockToken);
      localStorage.setItem("publisher_address", publisherAddress);

      // Refresh page to load dashboard
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to authenticate");
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundImage:
          "linear-gradient(to bottom right, rgb(37, 99, 235), rgb(29, 78, 216))",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
      }}
    >
      <div style={{ width: "100%", maxWidth: "28rem" }}>
        <div
          style={{
            backgroundColor: "white",
            borderRadius: "0.5rem",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
            padding: "2rem",
          }}
        >
          {/* Logo/Title */}
          <div style={{ textAlign: "center", marginBottom: "2rem" }}>
            <h1
              style={{
                fontSize: "1.875rem",
                fontWeight: "bold",
                color: "#111827",
              }}
            >
              Byline
            </h1>
            <p style={{ marginTop: "0.5rem", color: "#4b5563" }}>
              Publisher Dashboard
            </p>
          </div>

          {/* Form */}
          <form
            onSubmit={handleSubmit}
            style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}
          >
            <div>
              <label
                htmlFor="address"
                style={{
                  display: "block",
                  fontSize: "0.875rem",
                  fontWeight: "500",
                  color: "#374151",
                  marginBottom: "0.5rem",
                }}
              >
                Stellar Address
              </label>
              <input
                type="text"
                id="address"
                value={publisherAddress}
                onChange={(e) => setPublisherAddress(e.target.value)}
                placeholder="GABC...XYZ"
                disabled={isLoading}
                style={{
                  width: "100%",
                  padding: "0.5rem 1rem",
                  border: "1px solid #d1d5db",
                  borderRadius: "0.375rem",
                  fontFamily: "monospace",
                  fontSize: "0.875rem",
                  opacity: isLoading ? 0.5 : 1,
                  cursor: isLoading ? "not-allowed" : "auto",
                }}
              />
              <p
                style={{
                  marginTop: "0.25rem",
                  fontSize: "0.75rem",
                  color: "#6b7280",
                }}
              >
                Your Stellar account that publishes articles
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div
                style={{
                  padding: "0.75rem",
                  backgroundColor: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: "0.375rem",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "0.5rem",
                }}
              >
                <AlertCircle
                  style={{
                    height: "1.25rem",
                    width: "1.25rem",
                    color: "#dc2626",
                    flexShrink: 0,
                    marginTop: "0.125rem",
                  }}
                />
                <p style={{ fontSize: "0.875rem", color: "#991b1b" }}>
                  {error}
                </p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: "100%",
                backgroundColor: isLoading ? "#9ca3af" : "#2563eb",
                color: "white",
                fontWeight: "600",
                padding: "0.5rem",
                borderRadius: "0.375rem",
                cursor: isLoading ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                border: "none",
              }}
            >
              {isLoading && (
                <Loader
                  style={{
                    height: "1rem",
                    width: "1rem",
                    animation: "spin 1s linear infinite",
                  }}
                />
              )}
              {isLoading ? "Connecting..." : "Connect Wallet"}
            </button>
          </form>

          {/* Info */}
          <div
            style={{
              marginTop: "2rem",
              paddingTop: "1.5rem",
              borderTop: "1px solid #e5e7eb",
            }}
          >
            <p
              style={{
                fontSize: "0.75rem",
                color: "#4b5563",
                textAlign: "center",
              }}
            >
              Connect with your Stellar account to manage your published
              articles, track earnings, and register new content.
            </p>
          </div>
        </div>

        {/* Footer */}
        <p
          style={{
            textAlign: "center",
            color: "white",
            fontSize: "0.75rem",
            marginTop: "2rem",
          }}
        >
          © 2026 Byline. A decentralized publishing platform on Stellar.
        </p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};
