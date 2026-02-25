"use client";

import { useState, useEffect } from "react";
import { Connection, PublicKey } from "@solana/web3.js";
import {
  getAssociatedTokenAddressSync,
  TOKEN_2022_PROGRAM_ID,
} from "@solana/spl-token";
import { useWalletSession } from "@solana/react-hooks";
import { RPC_URL } from "../lib/constants";

export function BalanceCard({ mintAddress }: { mintAddress: string | null }) {
  const session = useWalletSession();
  const [balance, setBalance] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const owner = session?.account?.address?.toString() ?? null;
  const mint = mintAddress ?? "";
  const isValidMintLength = mint.length >= 32 && mint.length <= 44;

  useEffect(() => {
    if (!owner || !mint || !isValidMintLength) {
      setBalance(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    const connection = new Connection(RPC_URL, { commitment: "confirmed" });
    const mintPubkey = new PublicKey(mint);
    const ownerPubkey = new PublicKey(owner);
    const ata = getAssociatedTokenAddressSync(
      mintPubkey,
      ownerPubkey,
      false,
      TOKEN_2022_PROGRAM_ID
    );
    connection
      .getTokenAccountBalance(ata)
      .then((res) => {
        if (!cancelled) setBalance(res.value.uiAmountString ?? "0");
      })
      .catch((e) => {
        if (!cancelled) {
          if (String((e as Error).message).includes("could not find account")) {
            setBalance("0");
            setError(null);
          } else {
            setError((e as Error).message);
          }
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [owner, mint, isValidMintLength]);

  if (!session) {
    return (
      <section className="w-full max-w-3xl space-y-4 rounded-2xl border border-border-low bg-card p-6">
        <p className="text-lg font-semibold">Your balance</p>
        <p className="text-sm text-muted">Connect a wallet to see balance.</p>
      </section>
    );
  }

  if (!mint) {
    return (
      <section className="w-full max-w-3xl space-y-4 rounded-2xl border border-border-low bg-card p-6">
        <p className="text-lg font-semibold">Your balance</p>
        <p className="text-sm text-muted">Set mint address to see balance.</p>
      </section>
    );
  }

  if (!isValidMintLength) {
    return (
      <section className="w-full max-w-3xl space-y-4 rounded-2xl border border-border-low bg-card p-6">
        <p className="text-lg font-semibold">Your balance</p>
        <p className="text-sm text-muted">
          Enter a full mint address (32–44 characters) above to see balance.
        </p>
      </section>
    );
  }

  return (
    <section className="w-full max-w-3xl space-y-4 rounded-2xl border border-border-low bg-card p-6">
      <p className="text-lg font-semibold">Your balance</p>
      {loading && <p className="text-sm text-muted">Loading…</p>}
      {error && !loading && <p className="text-sm text-red-600">{error}</p>}
      {!loading && balance != null && (
        <p className="text-2xl font-semibold">{balance}</p>
      )}
    </section>
  );
}
