/**
 * ManagedWalletIndicator Component
 * Shows managed wallet status with export-to-self-custody banner
 */

import React from "react";
import { useAuth } from "../lib/authContext";

interface ManagedWalletIndicatorProps {
  onOpenExport: () => void;
}

export function ManagedWalletIndicator({
  onOpenExport,
}: ManagedWalletIndicatorProps) {
  const { walletType, hasExported, email } = useAuth();

  // Only show for custodial wallets
  if (walletType !== "custodial") {
    return null;
  }

  return (
    <div
      style={{
        background: hasExported
          ? "#f0fdf4"
          : "linear-gradient(135deg, #fef3c7 0%, #fef9e7 100%)",
        border: `1px solid ${hasExported ? "#bbf7d0" : "#fcd34d"}`,
        borderRadius: 8,
        padding: "12px 14px",
        marginBottom: "1.5rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          flex: 1,
        }}
      >
        <div
          style={{
            fontSize: 16,
            flexShrink: 0,
          }}
        >
          {hasExported ? "✓" : "🔐"}
        </div>
        <div>
          <p
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: hasExported ? "#166534" : "#92400e",
              margin: 0,
              marginBottom: 2,
            }}
          >
            {hasExported ? "Exported to self-custody" : "Managed wallet"}
          </p>
          <p
            style={{
              fontSize: 11,
              color: hasExported ? "#15803d" : "#b45309",
              margin: 0,
            }}
          >
            {hasExported
              ? `Freighter is now your primary wallet`
              : `Signed in as ${email}`}
          </p>
        </div>
      </div>

      {!hasExported && (
        <button
          onClick={onOpenExport}
          style={{
            background: "#111",
            color: "#fff",
            border: "none",
            padding: "6px 12px",
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 500,
            cursor: "pointer",
            flexShrink: 0,
            transition: "all 200ms",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#333";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "#111";
          }}
        >
          Export
        </button>
      )}
    </div>
  );
}
