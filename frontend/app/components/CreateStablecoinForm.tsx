"use client";

import { useState, useEffect } from "react";
import { useWalletSession, useSendTransaction } from "@solana/react-hooks";
import { toAddress } from "@solana/client";
import { PublicKey } from "@solana/web3.js";
import {
  buildCreateStablecoinInstructions,
  type PresetKind,
  type CreateStablecoinParams,
} from "../lib/build-create-instructions";
import { web3InstructionToKitFormat } from "../lib/instruction-to-kit";
import { getTransactionErrorMessage } from "../lib/transaction-error";
import { useSettings } from "../context/settings-context";

export function CreateStablecoinForm() {
  const session = useWalletSession();
  const { showToast } = useSettings();
  const { send, isSending, signature, status, error, reset } = useSendTransaction();

  useEffect(() => {
    if (signature && status === "success") showToast(signature);
  }, [signature, status, showToast]);

  const [preset, setPreset] = useState<PresetKind>("sss-1");
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [uri, setUri] = useState("");
  const [decimals, setDecimals] = useState(6);
  const [txError, setTxError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.account?.address) {
      setTxError("Connect a wallet first.");
      return;
    }
    const trimmedName = name.trim();
    const trimmedSymbol = symbol.trim().toUpperCase();
    const trimmedUri = uri.trim();
    if (!trimmedName || !trimmedSymbol) {
      setTxError("Name and symbol are required.");
      return;
    }
    setTxError(null);
    reset();

    try {
      const authorityAddress = session.account.address.toString();
      if (!authorityAddress || authorityAddress.length < 32) {
        setTxError("Wallet address not ready. Try reconnecting.");
        return;
      }
      const authority = new PublicKey(authorityAddress);
      const instructions = await buildCreateStablecoinInstructions(authority, {
        preset,
        name: trimmedName,
        symbol: trimmedSymbol,
        uri: trimmedUri || "https://example.com",
        decimals: Number(decimals) || 6,
      });

      const kitInstructions = instructions.map(web3InstructionToKitFormat);
      await send({
        instructions: kitInstructions as any,
        feePayer: toAddress(authorityAddress),
      });
      setTxError(null);
    } catch (err) {
      setTxError(getTransactionErrorMessage(err));
    }
  };

  if (!session) {
    return (
      <section className="w-full max-w-3xl space-y-4 rounded-2xl border border-border-low bg-card p-6">
        <p className="text-lg font-semibold">Create stablecoin</p>
        <p className="text-sm text-muted">Connect a wallet to create a new stablecoin (SSS-1 or SSS-2).</p>
      </section>
    );
  }

  return (
    <section className="w-full max-w-3xl space-y-4 rounded-2xl border border-border-low bg-card p-6">
      <p className="text-lg font-semibold">Create stablecoin</p>
      <p className="text-sm text-muted">
        Initialize a new stablecoin using the SDK. Your wallet is the initial authority.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-muted">Preset</label>
          <select
            value={preset}
            onChange={(e) => setPreset(e.target.value as PresetKind)}
            className="w-full rounded-lg border border-border-low bg-card px-3 py-2 text-sm"
            disabled={isSending}
          >
            <option value="sss-1">SSS-1 (minimal)</option>
            <option value="sss-2">SSS-2 (compliant: blacklist, seize)</option>
            <option value="sss-3">SSS-3 (confidential + allowlist)</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-muted">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Stablecoin"
            className="w-full rounded-lg border border-border-low bg-card px-3 py-2 text-sm"
            disabled={isSending}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-muted">Symbol</label>
          <input
            type="text"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            placeholder="MUSD"
            className="w-full rounded-lg border border-border-low bg-card px-3 py-2 text-sm"
            disabled={isSending}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-muted">URI (optional)</label>
          <input
            type="text"
            value={uri}
            onChange={(e) => setUri(e.target.value)}
            placeholder="https://example.com/token.json"
            className="w-full rounded-lg border border-border-low bg-card px-3 py-2 text-sm"
            disabled={isSending}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-muted">Decimals</label>
          <input
            type="number"
            min={0}
            max={9}
            value={decimals}
            onChange={(e) => setDecimals(Number(e.target.value))}
            className="w-full rounded-lg border border-border-low bg-card px-3 py-2 text-sm"
            disabled={isSending}
          />
        </div>
        {(txError != null || error != null) ? (
          <p className="text-sm text-red-600">
            {txError ?? (error != null ? getTransactionErrorMessage(error) : "")}
          </p>
        ) : null}
        {status === "success" && signature && (
          <p className="text-sm text-green-600">Created. Tx: {signature.slice(0, 16)}…</p>
        )}
        <button
          type="submit"
          disabled={isSending || !name.trim() || !symbol.trim()}
          className="rounded-lg border border-border-low bg-cream px-4 py-2 font-medium transition hover:-translate-y-0.5 hover:shadow-sm cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSending ? "Creating…" : "Create stablecoin"}
        </button>
      </form>
    </section>
  );
}
