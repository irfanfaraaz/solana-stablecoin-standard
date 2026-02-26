"use client";

import { useState, useRef, useEffect } from "react";
import { useSettings } from "../context/settings-context";
import { getBackendBaseUrl } from "../lib/api";
import { WalletHeader } from "./WalletHeader";
import { DirectoryModal } from "./DirectoryModal";

export type TabId = "overview" | "create" | "compliance" | "admin" | "audit";

const TABS: { id: TabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "create", label: "Create" },
  { id: "compliance", label: "Compliance" },
  { id: "admin", label: "Admin" },
  { id: "audit", label: "Audit" },
];

type AppShellProps = {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  mintDisplay: string | null;
  children: React.ReactNode;
};

export function AppShell({ activeTab, onTabChange, mintDisplay, children }: AppShellProps) {
  const { useBackend, setUseBackend } = useSettings();
  const [directoryOpen, setDirectoryOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);
  const hasBackend = !!getBackendBaseUrl();

  useEffect(() => {
    const onOutside = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) setSettingsOpen(false);
    };
    if (settingsOpen) document.addEventListener("click", onOutside);
    return () => document.removeEventListener("click", onOutside);
  }, [settingsOpen]);

  return (
    <div className="min-h-screen flex flex-col bg-bg1 text-foreground">
      <DirectoryModal open={directoryOpen} onClose={() => setDirectoryOpen(false)} />

      <header className="sticky top-0 z-40 border-b border-border-low bg-bg1/95 backdrop-blur supports-backdrop-filter:bg-bg1/80">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="text-lg font-semibold tracking-tight text-foreground">SSS</span>
            <button
              type="button"
              onClick={() => setDirectoryOpen(true)}
              className="flex min-w-0 max-w-[200px] items-center gap-2 rounded-lg border border-border-low bg-card px-3 py-2 text-left transition hover:border-primary/40 hover:bg-cream cursor-pointer sm:max-w-[280px]"
              title={mintDisplay ?? "Choose stablecoin"}
            >
              <span className="truncate font-mono text-sm text-foreground">
                {mintDisplay ? `${mintDisplay.slice(0, 4)}…${mintDisplay.slice(-4)}` : "Choose mint"}
              </span>
              <svg className="h-4 w-4 shrink-0 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <WalletHeader />

            {hasBackend && (
              <div className="relative" ref={settingsRef}>
                <button
                  type="button"
                  onClick={() => setSettingsOpen((o) => !o)}
                  className="rounded-lg p-2 text-muted transition hover:bg-cream hover:text-foreground cursor-pointer"
                  aria-label="Settings"
                  aria-expanded={settingsOpen}
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
                {settingsOpen && (
                  <div className="absolute right-0 top-full z-20 mt-2 w-64 rounded-xl border border-border-low bg-card p-3 shadow-lg">
                    <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">Settings</p>
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={useBackend}
                        onChange={(e) => setUseBackend(e.target.checked)}
                        className="cursor-pointer"
                      />
                      <span className="text-sm text-foreground">Use backend for screening & mint/burn</span>
                    </label>
                    <p className="mt-2 text-xs text-muted">
                      Uncheck to use wallet + SDK only.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <nav className="border-t border-border-low bg-card/50" aria-label="Main">
          <div className="mx-auto flex max-w-5xl gap-1 px-4 py-2 sm:px-6">
            {TABS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => onTabChange(id)}
                aria-current={activeTab === id ? "page" : undefined}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition cursor-pointer ${
                  activeTab === id
                    ? "bg-primary text-bg1"
                    : "text-muted hover:bg-cream hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </nav>
      </header>

      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
