"use client";

import { CreateStablecoinForm } from "../../components/CreateStablecoinForm";

const CONTENT_CLASS = "mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10";

export default function CreatePage() {
  return (
    <div className={CONTENT_CLASS}>
      <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl mb-10">
        Create stablecoin
      </h1>
      <div className="space-y-6">
        <p className="text-sm text-muted">
          Create a new stablecoin for this program. You will be the master authority.
        </p>
        <CreateStablecoinForm />
      </div>
    </div>
  );
}
