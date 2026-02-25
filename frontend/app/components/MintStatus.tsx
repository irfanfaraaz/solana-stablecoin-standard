"use client";

import { useMemo } from "react";
import { useWalletSession } from "@solana/react-hooks";
import { PublicKey } from "@solana/web3.js";
import { useStablecoinSdk } from "../lib/use-stablecoin-sdk";

export function MintStatus({ mintAddress }: { mintAddress: string | null }) {
  const session = useWalletSession();
  const walletAddressStr = session?.account?.address?.toString() ?? null;
  const walletPubkey = useMemo(
    () => (walletAddressStr ? new PublicKey(walletAddressStr) : null),
    [walletAddressStr]
  );
  const { config, totalSupply, loading, error, refresh } = useStablecoinSdk(
    walletPubkey,
    mintAddress
  );

  if (!mintAddress) {
    return (
      <section className="w-full max-w-3xl space-y-4 rounded-2xl border border-border-low bg-card p-6">
        <p className="text-lg font-semibold">Mint status</p>
        <p className="text-sm text-muted">
          Set <code className="font-mono">NEXT_PUBLIC_MINT_ADDRESS</code> or
          paste a mint address in the UI to load stablecoin config and supply.
        </p>
      </section>
    );
  }

  const isValidMintLength = mintAddress.length >= 32 && mintAddress.length <= 44;
  if (!isValidMintLength) {
    return (
      <section className="w-full max-w-3xl space-y-4 rounded-2xl border border-border-low bg-card p-6">
        <p className="text-lg font-semibold">Mint status</p>
        <p className="text-sm text-muted">
          Enter a full mint address (32–44 characters) above to load config and supply.
        </p>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="w-full max-w-3xl space-y-4 rounded-2xl border border-border-low bg-card p-6">
        <p className="text-lg font-semibold">Mint status</p>
        <p className="text-sm text-muted">Loading…</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="w-full max-w-3xl space-y-4 rounded-2xl border border-border-low bg-card p-6">
        <p className="text-lg font-semibold">Mint status</p>
        <p className="text-sm text-red-600">{error.message}</p>
        <p className="text-xs text-muted">
          Ensure IDL files exist in <code className="font-mono">public/idl/</code> (run{" "}
          <code className="font-mono">yarn copy-idl</code> after{" "}
          <code className="font-mono">anchor build</code>).
        </p>
        <button
          onClick={refresh}
          className="rounded-lg border border-border-low px-3 py-2 text-sm font-medium hover:bg-cream"
        >
          Retry
        </button>
      </section>
    );
  }

  if (!config) {
    return (
      <section className="w-full max-w-3xl space-y-4 rounded-2xl border border-border-low bg-card p-6">
        <p className="text-lg font-semibold">Mint status</p>
        <p className="text-sm text-muted">No config (mint may not exist).</p>
      </section>
    );
  }

  const decimals = config.decimals;
  const supplyFormatted =
    totalSupply != null
      ? Number(totalSupply) / Math.pow(10, decimals)
      : null;

  return (
    <section className="w-full max-w-3xl space-y-4 rounded-2xl border border-border-low bg-card p-6">
      <div className="flex items-center justify-between">
        <p className="text-lg font-semibold">Mint status</p>
        <button
          onClick={refresh}
          className="text-xs text-muted hover:text-foreground"
        >
          Refresh
        </button>
      </div>
      <dl className="space-y-2 text-sm">
        <div>
          <dt className="text-muted">Name</dt>
          <dd className="font-medium">{config.name}</dd>
        </div>
        <div>
          <dt className="text-muted">Symbol</dt>
          <dd className="font-medium">{config.symbol}</dd>
        </div>
        <div>
          <dt className="text-muted">Decimals</dt>
          <dd className="font-medium">{config.decimals}</dd>
        </div>
        <div>
          <dt className="text-muted">Paused</dt>
          <dd className="font-medium">{config.isPaused ? "Yes" : "No"}</dd>
        </div>
        {supplyFormatted != null && (
          <div>
            <dt className="text-muted">Total supply</dt>
            <dd className="font-medium">{supplyFormatted.toLocaleString()}</dd>
          </div>
        )}
      </dl>
    </section>
  );
}
