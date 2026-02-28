"use client";

import { AuditSection } from "../../components/AuditSection";
import { EventsSection } from "../../components/EventsSection";

const CONTENT_CLASS = "mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10";

export default function AuditPage() {
  return (
    <div className={CONTENT_CLASS}>
      <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl mb-10">
        Audit
      </h1>
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
    </div>
  );
}
