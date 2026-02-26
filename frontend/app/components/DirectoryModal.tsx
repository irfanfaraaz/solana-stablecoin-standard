"use client";

import { useEffect, useCallback, useState } from "react";
import { useMint } from "../context/mint-context";
import type { StablecoinConfigRow } from "../lib/fetch-all-stablecoins";

type DirectoryModalProps = {
  open: boolean;
  onClose: () => void;
};

export function DirectoryModal({ open, onClose }: DirectoryModalProps) {
  const { mintAddress, setMintInput, setMintAddress } = useMint();
  const [list, setList] = useState<StablecoinConfigRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/getmints");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      const rows: StablecoinConfigRow[] = await res.json();
      setList(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setList([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  useEffect(() => {
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) {
      document.addEventListener("keydown", onEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", onEscape);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      aria-modal
      role="dialog"
      aria-labelledby="directory-title"
    >
      <div
        className="absolute inset-0 bg-foreground/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative z-10 w-full max-w-lg max-h-[85vh] flex flex-col rounded-2xl border border-border-low bg-card shadow-xl">
        <div className="flex items-center justify-between gap-3 border-b border-border-low p-4">
          <h2 id="directory-title" className="text-lg font-semibold">
            Choose stablecoin
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-muted transition hover:bg-cream hover:text-foreground cursor-pointer"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {error && <p className="text-sm text-red-500">{error}</p>}
          {loading && list.length === 0 && <p className="text-sm text-muted">Loading…</p>}
          {!loading && list.length === 0 && !error && (
            <p className="text-sm text-muted">No stablecoins found for this program.</p>
          )}
          {list.length > 0 && (
            <ul className="space-y-2">
              {list.map((row) => (
                <li key={row.mint}>
                  <button
                    type="button"
                    onClick={() => {
                      setMintInput(row.mint);
                      setMintAddress(row.mint);
                      onClose();
                    }}
                    disabled={mintAddress === row.mint}
                    className="w-full flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border-low bg-card p-3 text-left transition hover:border-primary/40 hover:bg-cream/50 cursor-pointer disabled:opacity-70 disabled:cursor-default disabled:hover:border-border-low disabled:hover:bg-card"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground">{row.name || "—"}</p>
                      <p className="text-xs text-muted">
                        {row.symbol || "—"} · {row.decimals}d
                        {row.isPaused && " · Paused"}
                      </p>
                      <p className="mt-0.5 truncate font-mono text-xs text-muted" title={row.mint}>
                        {row.mint}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                      {mintAddress === row.mint ? "In use" : "Use"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="border-t border-border-low p-3">
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="w-full rounded-lg border border-border-low bg-cream py-2 text-sm font-medium transition hover:bg-cream/80 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "Loading…" : "Refresh list"}
          </button>
        </div>
      </div>
    </div>
  );
}
