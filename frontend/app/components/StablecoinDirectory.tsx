"use client";

import { useState, useEffect, useCallback } from "react";
import { useMint } from "../context/mint-context";
import type { StablecoinConfigRow } from "../lib/fetch-all-stablecoins";

export function StablecoinDirectory() {
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
    load();
  }, [load]);

  return (
    <section className="w-full max-w-3xl space-y-4 rounded-2xl border border-border-low bg-card p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-lg font-semibold">Stablecoins (this program)</p>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="cursor-pointer rounded-lg border border-border-low bg-cream px-3 py-2 text-sm font-medium transition hover:-translate-y-0.5 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>
      <p className="text-sm text-muted">
        All stablecoins minted via this program. Click &quot;Use this mint&quot; to set it above.
      </p>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {loading && list.length === 0 && (
        <p className="text-sm text-muted">Loading stablecoins…</p>
      )}
      {!loading && list.length === 0 && !error && (
        <p className="text-sm text-muted">No stablecoins found for this program.</p>
      )}
      {list.length > 0 && (
        <ul className="space-y-3">
          {list.map((row) => (
            <li
              key={row.mint}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border-low bg-card p-3 sm:p-4"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium text-foreground">{row.name || "—"}</p>
                <p className="text-sm text-muted">
                  {row.symbol || "—"} · {row.decimals} decimals
                  {row.isPaused && " · Paused"}
                  {row.enableAllowlist && " · Allowlist"}
                  {row.enableConfidentialTransfers && " · Confidential"}
                </p>
                <p className="mt-1 truncate font-mono text-xs text-muted" title={row.mint}>
                  {row.mint}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setMintInput(row.mint);
                  setMintAddress(row.mint);
                }}
                className="cursor-pointer shrink-0 rounded-lg border border-border-low bg-cream px-3 py-2 text-sm font-medium transition hover:-translate-y-0.5 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
                disabled={mintAddress === row.mint}
              >
                {mintAddress === row.mint ? "In use" : "Use this mint"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
