"use client";

import { useState, useEffect } from "react";
import { useWalletSession, useSendTransaction } from "@solana/react-hooks";
import { toAddress } from "@solana/client";
import { PublicKey } from "@solana/web3.js";
import { useMint } from "../context/mint-context";
import { useSettings } from "../context/settings-context";
import { useStablecoinSdk } from "../lib/use-stablecoin-sdk";
import { web3InstructionToKitFormat, builderToInstruction } from "../lib/instruction-to-kit";
import { getTransactionErrorMessage } from "../lib/transaction-error";

export function AllowlistSection() {
  const { mintAddress } = useMint();
  const { showToast } = useSettings();
  const session = useWalletSession();
  const { send, isSending, signature, status, error, reset } = useSendTransaction();
  const walletStr = session?.account?.address?.toString() ?? null;
  const walletPubkey = walletStr ? new PublicKey(walletStr) : null;
  const { sdk, config, loading: sdkLoading } = useStablecoinSdk(walletPubkey, mintAddress);

  useEffect(() => {
    if (signature && status === "success") showToast(signature);
  }, [signature, status, showToast]);

  const [walletAddress, setWalletAddress] = useState("");
  const [txError, setTxError] = useState<string | null>(null);
  const [action, setAction] = useState<"add" | "remove">("add");

  const mintValid = mintAddress && mintAddress.length >= 32 && mintAddress.length <= 44;
  const showSection = config?.enableAllowlist === true;

  if (!showSection) {
    return (
      <div className="space-y-4 rounded-2xl border border-border-low bg-card p-4 sm:p-6">
        <p className="font-semibold">Allowlist</p>
        <p className="text-sm text-muted">This mint does not have allowlist enabled (SSS-3).</p>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sdk || !walletPubkey || !walletStr || !walletAddress.trim()) return;
    setTxError(null);
    reset();
    const pubkey = new PublicKey(walletAddress.trim());
    try {
      if (action === "add") {
        const builder = await sdk.addToAllowlist(walletPubkey, pubkey);
        const ix = await builderToInstruction(builder);
        await send({
          instructions: [web3InstructionToKitFormat(ix) as any],
          feePayer: toAddress(walletStr),
        });
      } else {
        const builder = await sdk.removeFromAllowlist(walletPubkey, pubkey);
        const ix = await builderToInstruction(builder);
        await send({
          instructions: [web3InstructionToKitFormat(ix) as any],
          feePayer: toAddress(walletStr),
        });
      }
      setWalletAddress("");
    } catch (err) {
      setTxError(getTransactionErrorMessage(err));
    }
  };

  if (!session) {
    return (
      <div className="space-y-4 rounded-2xl border border-border-low bg-card p-4 sm:p-6">
        <p className="font-semibold">Allowlist</p>
        <p className="text-sm text-muted">Connect a wallet to add/remove allowlist entries.</p>
      </div>
    );
  }

  if (!mintValid) {
    return (
      <div className="space-y-4 rounded-2xl border border-border-low bg-card p-4 sm:p-6">
        <p className="font-semibold">Allowlist</p>
        <p className="text-sm text-muted">Set a mint address to manage allowlist.</p>
      </div>
    );
  }

  if (sdkLoading || !sdk) {
    return (
      <div className="space-y-4 rounded-2xl border border-border-low bg-card p-4 sm:p-6">
        <p className="font-semibold">Allowlist</p>
        <p className="text-sm text-muted">Loading…</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-2xl border border-border-low bg-card p-4 sm:p-6">
      <p className="font-semibold">Allowlist</p>
      <p className="text-sm text-muted">Add or remove wallets from the allowlist (SSS-3).</p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-muted">Wallet address</label>
          <input
            type="text"
            value={walletAddress}
            onChange={(e) => setWalletAddress(e.target.value)}
            placeholder="Base58 address"
            className="min-h-[44px] w-full rounded-lg border border-border-low bg-card px-3 py-2 font-mono text-sm"
            disabled={isSending}
          />
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setAction("add")}
            className={`min-h-[44px] cursor-pointer rounded-lg border px-4 py-2 text-sm font-medium disabled:cursor-not-allowed ${action === "add" ? "border-border-low bg-cream" : "border-border-low"}`}
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => setAction("remove")}
            className={`min-h-[44px] cursor-pointer rounded-lg border px-4 py-2 text-sm font-medium disabled:cursor-not-allowed ${action === "remove" ? "border-border-low bg-cream" : "border-border-low"}`}
          >
            Remove
          </button>
        </div>
        <button
          type="submit"
          disabled={isSending || !walletAddress.trim()}
          className="min-h-[44px] cursor-pointer rounded-lg border border-border-low bg-cream px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSending ? "Sending…" : action === "add" ? "Add to allowlist" : "Remove from allowlist"}
        </button>
      </form>
      {Boolean(txError || error) && (
        <p className="text-sm text-red-600">
          {String(txError ?? (error != null ? getTransactionErrorMessage(error) : ""))}
        </p>
      )}
      {status === "success" && signature && (
        <p className="text-sm text-green-600">Tx: {signature.slice(0, 16)}…</p>
      )}
    </div>
  );
}
