"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMint } from "../context/mint-context";
import { useSettings } from "../context/settings-context";
import { getBackendBaseUrl } from "../lib/api";
import { Toast } from "../components/Toast";
import { DirectoryModal } from "../components/DirectoryModal";
import { WalletHeader } from "../components/WalletHeader";
import { DirectoryProvider } from "./directory-context";

const NAV_LINKS: { href: string; label: string; icon: React.ReactNode }[] = [
  { href: "/dashboard", label: "Overview", icon: <NavIconOverview /> },
  { href: "/dashboard/create", label: "Create", icon: <NavIconCreate /> },
  { href: "/dashboard/compliance", label: "Compliance", icon: <NavIconCompliance /> },
  { href: "/dashboard/admin", label: "Admin", icon: <NavIconAdmin /> },
  { href: "/dashboard/audit", label: "Audit", icon: <NavIconAudit /> },
  { href: "/dashboard/confidential", label: "Confidential", icon: <NavIconConfidential /> },
];

function NavIconOverview() {
  return (
    <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
  );
}
function NavIconCreate() {
  return (
    <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
function NavIconCompliance() {
  return (
    <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  );
}
function NavIconAdmin() {
  return (
    <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
    </svg>
  );
}
function NavIconAudit() {
  return (
    <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  );
}
function NavIconConfidential() {
  return (
    <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
    </svg>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { mintAddress } = useMint();
  const { useBackend, setUseBackend } = useSettings();
  const [directoryOpen, setDirectoryOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);
  const hasBackend = !!getBackendBaseUrl();

  useEffect(() => {
    const onOutside = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node))
        setSettingsOpen(false);
    };
    if (settingsOpen) document.addEventListener("click", onOutside);
    return () => document.removeEventListener("click", onOutside);
  }, [settingsOpen]);

  const mintDisplay =
    mintAddress?.trim() && mintAddress.length >= 32
      ? `${mintAddress.slice(0, 4)}…${mintAddress.slice(-4)}`
      : null;

  const openDirectory = useCallback(() => setDirectoryOpen(true), []);

  return (
    <DirectoryProvider openDirectory={openDirectory}>
      <div className="dashboard-canvas relative min-h-screen flex bg-bg1 text-foreground">
        <Toast />
        <DirectoryModal open={directoryOpen} onClose={() => setDirectoryOpen(false)} />

        <aside className="flex w-60 shrink-0 flex-col border-r border-border-low bg-card/80 backdrop-blur-xl">
          <div className="flex flex-col gap-5 p-5">
            <Link
              href="/dashboard"
              className="font-display text-xl font-bold tracking-tight text-foreground hover:text-primary transition-colors duration-200 cursor-pointer"
            >
              SSS
            </Link>

            <button
              type="button"
              onClick={() => setDirectoryOpen(true)}
              className="flex min-w-0 items-center gap-2.5 rounded-xl border border-border-low bg-bg1/80 px-3.5 py-3 text-left transition-all duration-200 hover:border-primary/50 hover:bg-cream cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              title={mintDisplay ?? "Choose stablecoin"}
            >
              <span className="truncate font-mono text-sm text-foreground">
                {mintDisplay ?? "Choose mint"}
              </span>
              <svg className="h-4 w-4 shrink-0 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            <div className="flex items-center">
              <WalletHeader />
            </div>

            {hasBackend && (
              <div className="relative" ref={settingsRef}>
                <button
                  type="button"
                  onClick={() => setSettingsOpen((o) => !o)}
                  className="rounded-xl p-2.5 text-muted transition-all duration-200 hover:bg-cream hover:text-foreground cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  aria-label="Settings"
                  aria-expanded={settingsOpen}
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
                {settingsOpen && (
                  <div className="absolute left-0 top-full z-20 mt-2 w-64 rounded-xl border border-border-low bg-card p-3 shadow-xl">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Settings</p>
                    <label className="flex cursor-pointer items-center gap-2">
                      <input type="checkbox" checked={useBackend} onChange={(e) => setUseBackend(e.target.checked)} className="cursor-pointer" />
                      <span className="text-sm text-foreground">Use backend for screening & mint/burn</span>
                    </label>
                    <p className="mt-2 text-xs text-muted">Uncheck to use wallet + SDK only.</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <nav className="flex flex-1 flex-col gap-0.5 px-3 pb-6" aria-label="Main">
            {NAV_LINKS.map(({ href, label, icon }) => {
              const isActive = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={isActive ? "page" : undefined}
                  className={`flex min-h-[44px] items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-200 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                    isActive
                      ? "bg-primary/15 text-primary border border-primary/20 shadow-[0_0_20px_-4px_var(--glow)]"
                      : "text-muted hover:bg-cream hover:text-foreground border border-transparent"
                  }`}
                >
                  {icon}
                  {label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="relative z-10 flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </DirectoryProvider>
  );
}
