"use client";

import { useState, useMemo } from "react";
import { AppShell, type TabId } from "./components/AppShell";
import { CreateStablecoinForm } from "./components/CreateStablecoinForm";
import { MintStatus } from "./components/MintStatus";
import { BalanceCard } from "./components/BalanceCard";
import { TransferForm } from "./components/TransferForm";
import { ScreeningCheck } from "./components/ScreeningCheck";
import { BlacklistSection } from "./components/BlacklistSection";
import { AllowlistSection } from "./components/AllowlistSection";
import { SeizeSection } from "./components/SeizeSection";
import { AdminMintBurn } from "./components/AdminMintBurn";
import { OracleMintSection } from "./components/OracleMintSection";
import { ConfigureMinter } from "./components/ConfigureMinter";
import { AdminFreezePause } from "./components/AdminFreezePause";
import { AuditSection } from "./components/AuditSection";
import { EventsSection } from "./components/EventsSection";
import { Toast } from "./components/Toast";
import { WalletButton } from "./components/WalletButton";
import { AuthorityBanner } from "./components/AuthorityBanner";
import { useMint } from "./context/mint-context";

const CONTENT_CLASS = "mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10";

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const { mintAddress } = useMint();

  const mintDisplay = useMemo(() => {
    const m = mintAddress?.trim();
    return m && m.length >= 32 ? m : null;
  }, [mintAddress]);

  return (
    <div className="relative min-h-screen overflow-x-clip bg-bg1 text-foreground">
      <Toast />
      <AppShell
        activeTab={activeTab}
        onTabChange={setActiveTab}
        mintDisplay={mintDisplay}
      >
        <div className={CONTENT_CLASS}>
          {activeTab === "overview" && (
            <OverviewPanel mintAddress={mintAddress} />
          )}
          {activeTab === "create" && (
            <CreatePanel />
          )}
          {activeTab === "compliance" && (
            <CompliancePanel />
          )}
          {activeTab === "admin" && (
            <AdminPanel />
          )}
          {activeTab === "audit" && (
            <AuditPanel />
          )}
        </div>
      </AppShell>
    </div>
  );
}

function OverviewPanel({ mintAddress }: { mintAddress: string | null }) {
  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted mb-4">
          Wallet &amp; mint
        </h2>
        <WalletButton />
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted mb-4">
          Status &amp; balance
        </h2>
        <div className="space-y-4">
          <MintStatus mintAddress={mintAddress} />
          <BalanceCard mintAddress={mintAddress} />
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted mb-4">
          Transfer
        </h2>
        <TransferForm mintAddress={mintAddress} />
      </section>
    </div>
  );
}

function CreatePanel() {
  return (
    <div className="space-y-6">
      <p className="text-sm text-muted">
        Create a new stablecoin for this program. You will be the master authority.
      </p>
      <CreateStablecoinForm />
    </div>
  );
}

function CompliancePanel() {
  return (
    <div className="space-y-8">
      <AuthorityBanner context="compliance" />
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted mb-4">
          Screening
        </h2>
        <ScreeningCheck />
      </section>
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted mb-4">
          Allowlist &amp; blacklist
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <BlacklistSection />
          <AllowlistSection />
        </div>
      </section>
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted mb-4">
          Seize
        </h2>
        <SeizeSection />
      </section>
    </div>
  );
}

function AdminPanel() {
  return (
    <div className="space-y-8">
      <AuthorityBanner context="admin" />
      <p className="text-sm text-muted">
        Configure minters, mint/burn, and pause or freeze the stablecoin. Requires the appropriate authority.
      </p>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <ConfigureMinter />
        <AdminMintBurn />
        <OracleMintSection />
        <AdminFreezePause />
      </div>
    </div>
  );
}

function AuditPanel() {
  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted mb-4">
          Audit
        </h2>
        <AuditSection />
      </section>
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted mb-4">
          Events
        </h2>
        <EventsSection />
      </section>
    </div>
  );
}
