"use client";

import { AuthorityBanner } from "../../components/AuthorityBanner";
import { ScreeningCheck } from "../../components/ScreeningCheck";
import { BlacklistSection } from "../../components/BlacklistSection";
import { AllowlistSection } from "../../components/AllowlistSection";
import { SeizeSection } from "../../components/SeizeSection";

const CONTENT_CLASS = "mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10";

export default function CompliancePage() {
  return (
    <div className={CONTENT_CLASS}>
      <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl mb-10">
        Compliance
      </h1>
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
    </div>
  );
}
