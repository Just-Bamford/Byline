/**
 * WalletExportFlow Component
 * 5-step export flow with security warnings and Freighter import guidance
 */

import React, { useState } from "react";
import { useAuth } from "../lib/authContext";

type ExportStep = "intro" | "warning" | "keys" | "import" | "complete";

interface WalletExportFlowProps {
  onClose: () => void;
}

export function WalletExportFlow({ onClose }: WalletExportFlowProps) {
  const { getExportKey, isLoading } = useAuth();
  const [step, setStep] = useState<ExportStep>("intro");
  const [keys, setKeys] = useState<{
    publicKey: string;
    secretKey: string;
  } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const handleExport = async () => {
    setExportError(null);
    try {
      const data = await getExportKey();
      setKeys(data);
      setStep("warning");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Export failed";
      setExportError(message);
    }
  };

  const copyToClipboard = (text: string, type: "public" | "secret") => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  // Render based on step
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        zIndex: 1000,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && step !== "keys") {
          onClose();
        }
      }}
    >
      <div
        style={{
          maxWidth: 500,
          width: "100%",
          background: "#fff",
          borderRadius: 12,
          boxShadow: "0 20px 25px rgba(0, 0, 0, 0.15)",
          padding: "2rem",
        }}
      >
        {/* Progress indicator */}
        <div
          style={{
            display: "flex",
            gap: 8,
            marginBottom: "2rem",
            justifyContent: "center",
          }}
        >
          {(
            ["intro", "warning", "keys", "import", "complete"] as ExportStep[]
          ).map((s, idx) => (
            <div
              key={s}
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background:
                  ["intro", "warning", "keys", "import", "complete"].indexOf(
                    step,
                  ) >= idx
                    ? "#111"
                    : "#e5e5e5",
                transition: "all 200ms",
              }}
            />
          ))}
        </div>

        {/* Step: Intro */}
        {step === "intro" && (
          <div>
            <h2
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: "#111",
                marginBottom: 12,
              }}
            >
              Export to Freighter
            </h2>
            <p
              style={{
                fontSize: 14,
                color: "#666",
                marginBottom: "1.5rem",
                lineHeight: 1.6,
              }}
            >
              Your keypair will be exported from Byline to Freighter.
              You&apos;ll manage your Stellar wallet yourself, with full control
              and responsibility.
            </p>
            <div
              style={{
                background: "#f3f4f6",
                border: "1px solid #e5e5e5",
                borderRadius: 8,
                padding: "12px",
                marginBottom: "1.5rem",
                fontSize: 12,
                color: "#555",
                lineHeight: 1.5,
              }}
            >
              <strong>What happens:</strong>
              <ul style={{ margin: "8px 0 0 0", paddingLeft: 16 }}>
                <li>Your secret key will be displayed</li>
                <li>Freighter becomes your primary wallet</li>
                <li>Byline will no longer manage access</li>
              </ul>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={handleExport}
                disabled={isLoading}
                style={{
                  flex: 1,
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
                {isLoading ? "Exporting..." : "Continue"}
              </button>
              <button
                onClick={onClose}
                disabled={isLoading}
                style={{
                  flex: 1,
                  background: "#f3f4f6",
                  color: "#666",
                  border: "none",
                  padding: "12px",
                  borderRadius: 8,
                  fontSize: 14,
                  cursor: isLoading ? "default" : "pointer",
                }}
              >
                Cancel
              </button>
            </div>

            {exportError && (
              <div
                style={{
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: 6,
                  padding: "10px",
                  marginTop: "1rem",
                  fontSize: 12,
                  color: "#991b1b",
                }}
              >
                {exportError}
              </div>
            )}
          </div>
        )}

        {/* Step: Security Warning */}
        {step === "warning" && (
          <div>
            <div
              style={{
                fontSize: 32,
                marginBottom: "1rem",
                textAlign: "center",
              }}
            >
              ⚠️
            </div>
            <h2
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: "#dc2626",
                marginBottom: 12,
                textAlign: "center",
              }}
            >
              Do not share your secret key
            </h2>
            <div
              style={{
                background: "#fef2f2",
                border: "2px solid #fecaca",
                borderRadius: 8,
                padding: "1rem",
                marginBottom: "1.5rem",
              }}
            >
              <ul
                style={{
                  margin: 0,
                  paddingLeft: 20,
                  fontSize: 13,
                  color: "#991b1b",
                  lineHeight: 1.7,
                }}
              >
                <li>Never screenshot your key</li>
                <li>Never paste it in email or chat</li>
                <li>Never enter it on untrusted websites</li>
                <li>Anyone with your key can drain your wallet</li>
              </ul>
            </div>
            <div
              style={{
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                borderRadius: 8,
                padding: "1rem",
                marginBottom: "1.5rem",
                fontSize: 13,
                color: "#166534",
              }}
            >
              <strong>Safe to share:</strong> Your public Stellar address
              (starts with G)
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setStep("keys")}
                style={{
                  flex: 1,
                  background: "#dc2626",
                  color: "#fff",
                  border: "none",
                  padding: "12px",
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                I understand. Show keys
              </button>
              <button
                onClick={() => {
                  setStep("intro");
                  setKeys(null);
                }}
                style={{
                  flex: 1,
                  background: "#f3f4f6",
                  color: "#666",
                  border: "none",
                  padding: "12px",
                  borderRadius: 8,
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Step: Display Keys */}
        {step === "keys" && keys && (
          <div>
            <h2
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: "#111",
                marginBottom: 16,
              }}
            >
              Your Stellar Keys
            </h2>

            {/* Public Key */}
            <div style={{ marginBottom: "1.5rem" }}>
              <p
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: "#666",
                  marginBottom: 6,
                }}
              >
                PUBLIC KEY (Safe to share)
              </p>
              <div
                style={{
                  background: "#f9fafb",
                  border: "1px solid #e5e5e5",
                  borderRadius: 6,
                  padding: "12px",
                  fontSize: 11,
                  fontFamily: "monospace",
                  wordBreak: "break-all",
                  cursor: "pointer",
                  userSelect: "all",
                }}
                onClick={() => copyToClipboard(keys.publicKey, "public")}
              >
                {keys.publicKey}
              </div>
              <button
                onClick={() => copyToClipboard(keys.publicKey, "public")}
                style={{
                  marginTop: 6,
                  fontSize: 12,
                  background: "#f3f4f6",
                  border: "none",
                  padding: "4px 8px",
                  borderRadius: 4,
                  cursor: "pointer",
                  color: "#666",
                }}
              >
                {copied === "public" ? "✓ Copied" : "Copy"}
              </button>
            </div>

            {/* Secret Key - WARNING */}
            <div
              style={{
                background: "#fef2f2",
                border: "2px solid #fecaca",
                borderRadius: 8,
                padding: "1rem",
                marginBottom: "1.5rem",
              }}
            >
              <p
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: "#991b1b",
                  marginBottom: 8,
                }}
              >
                🔒 SECRET KEY (DO NOT SHARE)
              </p>
              <div
                style={{
                  background: "#fff",
                  border: "1px solid #fecaca",
                  borderRadius: 4,
                  padding: "12px",
                  fontSize: 11,
                  fontFamily: "monospace",
                  wordBreak: "break-all",
                  cursor: "pointer",
                  userSelect: "all",
                  color: "#dc2626",
                }}
                onClick={() => copyToClipboard(keys.secretKey, "secret")}
              >
                {keys.secretKey}
              </div>
              <button
                onClick={() => copyToClipboard(keys.secretKey, "secret")}
                style={{
                  marginTop: 6,
                  fontSize: 12,
                  background: "#dc2626",
                  color: "#fff",
                  border: "none",
                  padding: "4px 8px",
                  borderRadius: 4,
                  cursor: "pointer",
                }}
              >
                {copied === "secret" ? "✓ Copied" : "Copy"}
              </button>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setStep("import")}
                style={{
                  flex: 1,
                  background: "#111",
                  color: "#fff",
                  border: "none",
                  padding: "12px",
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                Next: Import to Freighter
              </button>
            </div>
          </div>
        )}

        {/* Step: Import Guide */}
        {step === "import" && (
          <div>
            <h2
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: "#111",
                marginBottom: 16,
              }}
            >
              Import to Freighter
            </h2>
            <ol
              style={{
                margin: 0,
                paddingLeft: 20,
                fontSize: 13,
                lineHeight: 1.8,
                color: "#555",
                marginBottom: "1.5rem",
              }}
            >
              <li>Open Freighter browser extension</li>
              <li>Click &quot;Add Account&quot; or import option</li>
              <li>Paste your secret key when prompted</li>
              <li>Set a password to protect your Freighter wallet</li>
              <li>
                Verify the public key matches: {keys?.publicKey.slice(0, 8)}...
              </li>
              <li>Your assets will appear in Freighter</li>
            </ol>

            <div
              style={{
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                borderRadius: 8,
                padding: "1rem",
                marginBottom: "1.5rem",
                fontSize: 12,
                color: "#166534",
              }}
            >
              <strong>Tip:</strong> After importing, Byline will no longer
              manage your wallet. You&apos;re fully self-custody now.
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setStep("complete")}
                style={{
                  flex: 1,
                  background: "#111",
                  color: "#fff",
                  border: "none",
                  padding: "12px",
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                I&apos;ve imported to Freighter
              </button>
              <button
                onClick={() => setStep("keys")}
                style={{
                  flex: 1,
                  background: "#f3f4f6",
                  color: "#666",
                  border: "none",
                  padding: "12px",
                  borderRadius: 8,
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                Back
              </button>
            </div>
          </div>
        )}

        {/* Step: Complete */}
        {step === "complete" && (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: "1rem" }}>✓</div>
            <h2
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: "#166534",
                marginBottom: 12,
              }}
            >
              Export complete
            </h2>
            <p
              style={{
                fontSize: 14,
                color: "#666",
                marginBottom: "1.5rem",
                lineHeight: 1.6,
              }}
            >
              Your keypair is now in Freighter. You own your wallet and your
              assets.
            </p>

            <div
              style={{
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                borderRadius: 8,
                padding: "1rem",
                marginBottom: "1.5rem",
                fontSize: 12,
                color: "#166534",
              }}
            >
              <strong>Next time you purchase:</strong> Use Freighter to sign
              transactions instead of managed access.
            </div>

            <button
              onClick={onClose}
              style={{
                width: "100%",
                background: "#111",
                color: "#fff",
                border: "none",
                padding: "12px",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
