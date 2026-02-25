"use client";

import { useState, useEffect, useMemo } from "react";
import { WalletButton } from "./components/WalletButton";
import { CreateStablecoinForm } from "./components/CreateStablecoinForm";
import { MintStatus } from "./components/MintStatus";
import { BalanceCard } from "./components/BalanceCard";
import { TransferForm } from "./components/TransferForm";

const DEFAULT_MINT = process.env.NEXT_PUBLIC_MINT_ADDRESS ?? null;
const MINT_DEBOUNCE_MS = 600;

export default function Home() {
  const [mintInput, setMintInput] = useState(DEFAULT_MINT ?? "");
  const [debouncedMint, setDebouncedMint] = useState<string | null>(
    () => DEFAULT_MINT || null
  );

  const trimmed = mintInput.trim();
  useEffect(() => {
    if (!trimmed) {
      queueMicrotask(() => setDebouncedMint(DEFAULT_MINT || null));
      return;
    }
    const id = setTimeout(() => setDebouncedMint(trimmed), MINT_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [trimmed]);

  const mintAddress = useMemo(
    () => debouncedMint || DEFAULT_MINT || null,
    [debouncedMint]
  );

  return (
    <div className="relative min-h-screen overflow-x-clip bg-bg1 text-foreground">
      <main className="relative z-10 mx-auto flex min-h-screen max-w-4xl flex-col gap-10 border-x border-border-low px-6 py-16">
        <header className="space-y-3">
          <p className="text-sm uppercase tracking-[0.18em] text-muted">
            Solana Stablecoin Standard
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Example frontend
          </h1>
          <p className="max-w-3xl text-base leading-relaxed text-muted">
            Simple UI using the <code className="font-mono">@stbr/sss-token</code> SDK for
            stablecoin creation and management. Connect a wallet, set the mint address, and
            view status, balance, and transfer.
          </p>
        </header>

        <section className="w-full max-w-3xl space-y-4 rounded-2xl border border-border-low bg-card p-6">
          <p className="text-lg font-semibold">Mint address</p>
          <p className="text-sm text-muted">
            Paste the stablecoin mint address (or set{" "}
            <code className="font-mono">NEXT_PUBLIC_MINT_ADDRESS</code>).
          </p>
          <input
            type="text"
            value={mintInput}
            onChange={(e) => setMintInput(e.target.value)}
            placeholder="e.g. 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"
            className="w-full rounded-lg border border-border-low bg-card px-3 py-2 font-mono text-sm"
          />
        </section>

        <WalletButton />
        <CreateStablecoinForm />
        <MintStatus mintAddress={mintAddress} />
        <BalanceCard mintAddress={mintAddress} />
        <TransferForm mintAddress={mintAddress} />
      </main>
    </div>
  );
}