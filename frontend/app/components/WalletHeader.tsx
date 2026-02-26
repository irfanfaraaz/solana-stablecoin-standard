"use client";

import { useState, useRef, useEffect } from "react";
import { useWalletConnection } from "@solana/react-hooks";

export function WalletHeader() {
  const { connectors, connect, disconnect, wallet, status } = useWalletConnection();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const address = wallet?.account.address.toString();
  const short = address ? `${address.slice(0, 4)}…${address.slice(-4)}` : null;

  useEffect(() => {
    const onOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("click", onOutside);
    return () => document.removeEventListener("click", onOutside);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      {status === "connected" ? (
        <>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="flex items-center gap-2 rounded-full border border-border-low bg-card px-3 py-2 text-sm font-medium transition hover:bg-cream cursor-pointer"
            aria-expanded={open}
            aria-haspopup="true"
          >
            <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
            <span className="font-mono">{short}</span>
            <svg className="h-4 w-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {open && (
            <div className="absolute right-0 top-full z-20 mt-2 w-56 rounded-xl border border-border-low bg-card py-2 shadow-lg">
              <p className="truncate px-3 py-1 font-mono text-xs text-muted" title={address}>
                {address}
              </p>
              <button
                type="button"
                onClick={() => {
                  disconnect();
                  setOpen(false);
                }}
                className="w-full px-3 py-2 text-left text-sm font-medium text-red-600 transition hover:bg-cream cursor-pointer"
              >
                Disconnect
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-wrap gap-1">
          {connectors.length > 0 && (
            <button
              type="button"
              onClick={() => connect(connectors[0].id)}
              disabled={status === "connecting"}
              className="rounded-full border border-primary bg-primary px-4 py-2 text-sm font-medium text-bg1 transition hover:opacity-90 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {status === "connecting" ? "Connecting…" : "Connect wallet"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
