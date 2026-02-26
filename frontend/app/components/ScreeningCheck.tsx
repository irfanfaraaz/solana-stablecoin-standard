"use client";

import { useState } from "react";
import { useMint } from "../context/mint-context";
import { useSettings } from "../context/settings-context";
import { useWalletSession } from "@solana/react-hooks";
import { PublicKey } from "@solana/web3.js";
import { getBackendBaseUrl, apiGet } from "../lib/api";
import { useStablecoinSdk } from "../lib/use-stablecoin-sdk";

type ScreeningResult = { allowed: boolean; reason?: string };

export function ScreeningCheck() {
  const { mintAddress } = useMint();
  const { useBackend } = useSettings();
  const session = useWalletSession();
  const walletStr = session?.account?.address?.toString() ?? null;
  const walletPubkey = walletStr ? new PublicKey(walletStr) : null;
  const { sdk, loading: sdkLoading } = useStablecoinSdk(walletPubkey, mintAddress);

  const [address, setAddress] = useState("");
  const [result, setResult] = useState<ScreeningResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const baseUrl = getBackendBaseUrl();
  const useApi = useBackend && !!baseUrl;
  const mintValid = mintAddress && mintAddress.length >= 32 && mintAddress.length <= 44;

  const handleCheckApi = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = address.trim();
    if (!trimmed || !mintAddress) return;
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const data = await apiGet<ScreeningResult>(
        `/screen?address=${encodeURIComponent(trimmed)}&mint=${encodeURIComponent(mintAddress)}`
      );
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOnChain = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = address.trim();
    if (!sdk || !trimmed || !mintAddress) return;
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const { SolanaStablecoin } = await import("@stbr/sss-token");
      const pda = SolanaStablecoin.getBlacklistEntryPDA(
        sdk.mintAddress!,
        new PublicKey(trimmed),
        sdk.program.programId
      );
      const entry = await sdk.program.account.blacklistEntry.fetch(pda);
      setResult({ allowed: !entry.isBlacklisted, reason: entry.isBlacklisted ? "On blacklist" : undefined });
    } catch {
      setResult({ allowed: true });
    } finally {
      setLoading(false);
    }
  };

  const handleCheck = useApi ? handleCheckApi : handleCheckOnChain;

  if (!mintValid) {
    return (
      <section className="w-full max-w-3xl space-y-4 rounded-2xl border border-border-low bg-card p-4 sm:p-6">
        <p className="text-lg font-semibold">Screening</p>
        <p className="text-sm text-muted">Set a mint address above to enable screening.</p>
      </section>
    );
  }

  if (!useApi && (sdkLoading || !sdk)) {
    return (
      <section className="w-full max-w-3xl space-y-4 rounded-2xl border border-border-low bg-card p-4 sm:p-6">
        <p className="text-lg font-semibold">Screening</p>
        <p className="text-sm text-muted">Loading…</p>
      </section>
    );
  }

  return (
    <section className="w-full max-w-3xl space-y-4 rounded-2xl border border-border-low bg-card p-4 sm:p-6">
      <p className="text-lg font-semibold">Screening</p>
      <p className="text-sm text-muted">
        {useApi
          ? "Check if an address is allowed for the current mint (backend: on-chain blacklist)."
          : "Check on-chain blacklist for the current mint (no backend)."}
      </p>
      <form onSubmit={handleCheck} className="space-y-4">
        <div>
          <label htmlFor="screen-address" className="mb-1 block text-sm font-medium text-muted">
            Address to check
          </label>
          <input
            id="screen-address"
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Base58 wallet address"
            className="min-h-[44px] w-full rounded-lg border border-border-low bg-card px-3 py-2 font-mono text-sm"
            disabled={loading}
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {result != null && (
          <p className={result.allowed ? "text-sm text-green-600" : "text-sm text-red-600"}>
            {result.allowed ? "Allowed" : `Blocked${result.reason ? `: ${result.reason}` : ""}`}
          </p>
        )}
        <button
          type="submit"
          disabled={loading || !address.trim() || (!useApi && !sdk)}
          className="min-h-[44px] cursor-pointer rounded-lg border border-border-low bg-cream px-4 py-2 font-medium transition hover:-translate-y-0.5 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Checking…" : "Check"}
        </button>
      </form>
    </section>
  );
}
