"use client";

import { useMint } from "../context/mint-context";
import { useDirectoryOpen } from "./directory-context";
import { WalletButton } from "../components/WalletButton";
import { MintStatus } from "../components/MintStatus";
import { BalanceCard } from "../components/BalanceCard";
import { TransferForm } from "../components/TransferForm";

const CONTENT_CLASS = "mx-auto max-w-3xl px-6 py-10 sm:px-8 sm:py-12";

export default function DashboardPage() {
  const { mintAddress } = useMint();
  const openDirectory = useDirectoryOpen();
  const hasMint = mintAddress?.trim() && mintAddress.length >= 32;

  if (!hasMint) {
    return (
      <div className={CONTENT_CLASS}>
        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl mb-10">
          Overview
        </h1>
        <div className="dashboard-card flex flex-col items-center justify-center p-14 text-center">
          <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <svg className="h-7 w-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M20 7l-8 4-8-4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <p className="text-muted mb-8 max-w-sm text-base leading-relaxed">
            Select a stablecoin to view overview, balance, and transfer.
          </p>
          <button
            type="button"
            onClick={openDirectory}
            className="rounded-xl border border-primary bg-primary px-6 py-3 text-sm font-semibold text-bg1 shadow-lg shadow-primary/25 transition-all duration-200 hover:opacity-95 hover:shadow-xl hover:shadow-primary/30 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Choose mint
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={CONTENT_CLASS}>
      <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl mb-10">
        Overview
      </h1>
      <div className="space-y-10">
        <section className="animate-fade-slide-in" style={{ animationDelay: "0ms" }}>
          <h2 className="section-label mb-5">Wallet &amp; mint</h2>
          <WalletButton />
        </section>

        <section className="animate-fade-slide-in" style={{ animationDelay: "80ms" }}>
          <h2 className="section-label mb-5">Status &amp; balance</h2>
          <div className="space-y-5">
            <MintStatus mintAddress={mintAddress} />
            <BalanceCard mintAddress={mintAddress} />
          </div>
        </section>

        <section className="animate-fade-slide-in" style={{ animationDelay: "160ms" }}>
          <h2 className="section-label mb-5">Transfer</h2>
          <TransferForm mintAddress={mintAddress} />
        </section>
      </div>
    </div>
  );
}
