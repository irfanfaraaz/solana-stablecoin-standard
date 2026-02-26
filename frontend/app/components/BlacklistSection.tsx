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

export function BlacklistSection() {
  const { mintAddress } = useMint();
  const { showToast } = useSettings();
  const session = useWalletSession();
  const { send, isSending, signature, status, error, reset } = useSendTransaction();
  const walletStr = session?.account?.address?.toString() ?? null;
  const walletPubkey = walletStr ? new PublicKey(walletStr) : null;
  const { sdk, loading: sdkLoading } = useStablecoinSdk(walletPubkey, mintAddress);

  useEffect(() => {
    if (signature && status === "success") showToast(signature);
  }, [signature, status, showToast]);

  const [addAddress, setAddAddress] = useState("");
  const [addReason, setAddReason] = useState("");
  const [removeAddress, setRemoveAddress] = useState("");
  const [txError, setTxError] = useState<string | null>(null);

  const mintValid = mintAddress && mintAddress.length >= 32 && mintAddress.length <= 44;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sdk || !walletPubkey || !walletStr || !addAddress.trim()) return;
    setTxError(null);
    reset();
    try {
      const { SSSComplianceModule } = await import("@stbr/sss-token");
      const compliance = new SSSComplianceModule(sdk as any);
      const builder = await compliance.addToBlacklist(
        walletPubkey,
        new PublicKey(addAddress.trim()),
        addReason.trim() || undefined
      );
      const ix = await builderToInstruction(builder);
      await send({
        instructions: [web3InstructionToKitFormat(ix) as any],
        feePayer: toAddress(walletStr),
      });
      setAddAddress("");
      setAddReason("");
    } catch (err) {
      setTxError(getTransactionErrorMessage(err));
    }
  };

  const handleRemove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sdk || !walletPubkey || !walletStr || !removeAddress.trim()) return;
    setTxError(null);
    reset();
    try {
      const { SSSComplianceModule } = await import("@stbr/sss-token");
      const compliance = new SSSComplianceModule(sdk as any);
      const builder = await compliance.removeFromBlacklist(
        walletPubkey,
        new PublicKey(removeAddress.trim())
      );
      const ix = await builderToInstruction(builder);
      await send({
        instructions: [web3InstructionToKitFormat(ix) as any],
        feePayer: toAddress(walletStr),
      });
      setRemoveAddress("");
    } catch (err) {
      setTxError(getTransactionErrorMessage(err));
    }
  };

  if (!session) {
    return (
      <div className="space-y-4 rounded-2xl border border-border-low bg-card p-4 sm:p-6">
        <p className="font-semibold">Blacklist</p>
        <p className="text-sm text-muted">Connect a wallet to add/remove blacklist entries.</p>
      </div>
    );
  }

  if (!mintValid) {
    return (
      <div className="space-y-4 rounded-2xl border border-border-low bg-card p-4 sm:p-6">
        <p className="font-semibold">Blacklist</p>
        <p className="text-sm text-muted">Set a mint address to manage blacklist.</p>
      </div>
    );
  }

  if (sdkLoading || !sdk) {
    return (
      <div className="space-y-4 rounded-2xl border border-border-low bg-card p-4 sm:p-6">
        <p className="font-semibold">Blacklist</p>
        <p className="text-sm text-muted">Loading…</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-2xl border border-border-low bg-card p-4 sm:p-6">
      <p className="font-semibold">Blacklist</p>
      <p className="text-sm text-muted">Add or remove addresses from the transfer blacklist (SSS-2).</p>
      <form onSubmit={handleAdd} className="space-y-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-muted">Add address</label>
          <input
            type="text"
            value={addAddress}
            onChange={(e) => setAddAddress(e.target.value)}
            placeholder="Base58 address"
            className="min-h-[44px] w-full rounded-lg border border-border-low bg-card px-3 py-2 font-mono text-sm"
            disabled={isSending}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-muted">Reason (optional)</label>
          <input
            type="text"
            value={addReason}
            onChange={(e) => setAddReason(e.target.value)}
            placeholder="e.g. OFAC match"
            className="min-h-[44px] w-full rounded-lg border border-border-low bg-card px-3 py-2 text-sm"
            disabled={isSending}
          />
        </div>
        <button
          type="submit"
          disabled={isSending || !addAddress.trim()}
          className="min-h-[44px] cursor-pointer rounded-lg border border-border-low bg-cream px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSending ? "Adding…" : "Add to blacklist"}
        </button>
      </form>
      <form onSubmit={handleRemove} className="space-y-3 border-t border-border-low pt-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-muted">Remove address</label>
          <input
            type="text"
            value={removeAddress}
            onChange={(e) => setRemoveAddress(e.target.value)}
            placeholder="Base58 address"
            className="min-h-[44px] w-full rounded-lg border border-border-low bg-card px-3 py-2 font-mono text-sm"
            disabled={isSending}
          />
        </div>
        <button
          type="submit"
          disabled={isSending || !removeAddress.trim()}
          className="min-h-[44px] cursor-pointer rounded-lg border border-border-low bg-cream px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSending ? "Removing…" : "Remove from blacklist"}
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
