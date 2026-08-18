/**
 * MagicLinkVerify Component
 * Handles magic link token verification from email
 */

import React, { useEffect, useState } from "react";
import { useAuth } from "../lib/authContext";

interface MagicLinkVerifyProps {
  token: string;
  onSuccess: () => void;
}

export function MagicLinkVerify({ token, onSuccess }: MagicLinkVerifyProps) {
  const { verifyMagicLink } = useAuth();
  const [verified, setVerified] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  useEffect(() => {
    const verify = async () => {
      try {
        await verifyMagicLink(token);
        setVerified(true);
        // Navigate after successful verification
        setTimeout(onSuccess, 2000);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Verification failed";
        setVerifyError(message);
      }
    };

    verify();
  }, [token, verifyMagicLink, onSuccess]);

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
          maxWidth: 400,
          width: "100%",
          background: "#fff",
          borderRadius: 12,
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
          padding: "3rem 2rem",
          textAlign: "center",
        }}
      >
        {verified ? (
          <>
            <div style={{ fontSize: 40, marginBottom: "1rem" }}>✓</div>
            <h2
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: "#166534",
                marginBottom: 8,
              }}
            >
              Email verified!
            </h2>
            <p style={{ fontSize: 14, color: "#666", marginBottom: "1.5rem" }}>
              Your managed wallet is ready. Redirecting...
            </p>
            <div
              style={{
                display: "inline-block",
                width: 32,
                height: 32,
                border: "3px solid #ddd",
                borderTop: "3px solid #111",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
              }}
            />
          </>
        ) : verifyError ? (
          <>
            <div style={{ fontSize: 40, marginBottom: "1rem" }}>✗</div>
            <h2
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: "#dc2626",
                marginBottom: 8,
              }}
            >
              Verification failed
            </h2>
            <p style={{ fontSize: 14, color: "#666", marginBottom: "1rem" }}>
              {verifyError}
            </p>
            <p style={{ fontSize: 12, color: "#999", marginBottom: "1.5rem" }}>
              The link may have expired. Please request a new one.
            </p>
            <button
              onClick={() => (window.location.href = "/")}
              style={{
                background: "#111",
                color: "#fff",
                border: "none",
                padding: "10px 20px",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Back to login
            </button>
          </>
        ) : (
          <>
            <div
              style={{
                display: "inline-block",
                width: 32,
                height: 32,
                border: "3px solid #ddd",
                borderTop: "3px solid #111",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
                marginBottom: "1rem",
              }}
            />
            <h2
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: "#111",
                marginBottom: 8,
              }}
            >
              Verifying email...
            </h2>
            <p style={{ fontSize: 14, color: "#666" }}>
              Setting up your managed wallet
            </p>
          </>
        )}

        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
}
