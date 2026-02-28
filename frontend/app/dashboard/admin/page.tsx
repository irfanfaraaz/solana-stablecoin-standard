"use client";

import { AuthorityBanner } from "../../components/AuthorityBanner";
import { AdminTabs } from "./AdminTabs";

const CONTENT_CLASS = "mx-auto max-w-5xl px-6 py-10 sm:px-8 sm:py-12";

export default function AdminPage() {
  return (
    <div className={CONTENT_CLASS}>
      <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl mb-10">
        Admin
      </h1>
      <div className="space-y-8">
        <AuthorityBanner context="admin" />
        <p className="text-sm text-muted">
          Configure minters, roles, mint/burn, and pause or freeze the stablecoin. Requires the appropriate authority.
        </p>
        <AdminTabs />
      </div>
    </div>
  );
}
