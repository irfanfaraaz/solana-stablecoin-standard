"use client";

import { useMemo, useState } from "react";
import { ConfigureMinter } from "../../components/ConfigureMinter";
import { RoleManagement } from "../../components/RoleManagement";
import { AdminMintBurn } from "../../components/AdminMintBurn";
import { OracleMintSection } from "../../components/OracleMintSection";
import { AdminFreezePause } from "../../components/AdminFreezePause";

type TabId = "access" | "mint" | "oracle" | "controls";

const TABS: { id: TabId; label: string; description: string }[] = [
  { id: "access", label: "Access", description: "Minters and roles" },
  { id: "mint", label: "Mint / Burn", description: "Supply operations" },
  { id: "oracle", label: "Oracle", description: "Oracle-based mint" },
  { id: "controls", label: "Controls", description: "Pause and freeze" },
];

export function AdminTabs() {
  const [active, setActive] = useState<TabId>("access");
  const activeMeta = useMemo(() => TABS.find((t) => t.id === active)!, [active]);

  return (
    <div className="space-y-6">
      <div className="dashboard-card p-2">
        <div className="grid grid-cols-2 gap-1 md:grid-cols-4">
          {TABS.map((t) => {
            const isActive = t.id === active;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActive(t.id)}
                aria-current={isActive ? "page" : undefined}
                className={`min-h-[44px] rounded-xl px-3 py-2 text-left transition-all duration-200 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                  isActive
                    ? "bg-primary/15 text-primary border border-primary/20 shadow-[0_0_18px_-6px_var(--glow)]"
                    : "text-muted hover:bg-cream hover:text-foreground border border-transparent"
                }`}
              >
                <div className="text-sm font-semibold">{t.label}</div>
                <div className="text-xs opacity-80">{t.description}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-display text-2xl font-bold tracking-tight text-foreground">
            {activeMeta.label}
          </p>
          <p className="text-sm text-muted">{activeMeta.description}</p>
        </div>
      </div>

      {active === "access" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <ConfigureMinter />
          <RoleManagement />
        </div>
      )}

      {active === "mint" && (
        <div className="max-w-3xl">
          <AdminMintBurn />
        </div>
      )}

      {active === "oracle" && (
        <div className="max-w-3xl">
          <OracleMintSection />
        </div>
      )}

      {active === "controls" && (
        <div className="max-w-3xl">
          <AdminFreezePause />
        </div>
      )}
    </div>
  );
}

