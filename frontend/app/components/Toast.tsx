"use client";

import { useSettings } from "../context/settings-context";

const SOLSCAN_DEVNET = "https://solscan.io/tx";

export function Toast() {
  const { toastSignature, clearToast } = useSettings();

  if (!toastSignature) return null;

  const url = `${SOLSCAN_DEVNET}/${toastSignature}?cluster=devnet`;

  return (
    <div
      role="alert"
      className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-xl border border-border-low bg-card px-4 py-3 shadow-lg"
    >
      <span className="text-sm text-foreground">Transaction sent</span>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm font-medium text-primary underline cursor-pointer hover:no-underline"
      >
        View on Solscan
      </a>
      <button
        type="button"
        onClick={clearToast}
        className="cursor-pointer rounded p-1 text-muted hover:text-foreground"
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}
