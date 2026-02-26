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

export function AdminFreezePause() {
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

  const [freezeAccount, setFreezeAccount] = useState("");
  const [txError, setTxError] = useState<string | null>(null);

  const mintValid = mintAddress && mintAddress.length >= 32 && mintAddress.length <= 44;

  const runIx = async (build: () => Promise<{ instruction: () => Promise<import("@solana/web3.js").TransactionInstruction> }>) => {
    if (!sdk || !walletPubkey || !walletStr) return;
    setTxError(null);
    reset();
    try {
      const builder = await build();
      const ix = await builderToInstruction(builder);
      await send({
        instructions: [web3InstructionToKitFormat(ix) as any],
        feePayer: toAddress(walletStr),
      });
    } catch (err) {
      setTxError(getTransactionErrorMessage(err));
    }
  };

  const handleFreeze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!freezeAccount.trim()) return;
    await runIx(() => sdk!.freezeAccount(walletPubkey!, new PublicKey(freezeAccount.trim())));
    setFreezeAccount("");
  };

  const handleThaw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!freezeAccount.trim()) return;
    await runIx(() => sdk!.thawAccount(walletPubkey!, new PublicKey(freezeAccount.trim())));
    setFreezeAccount("");
  };

  const handlePause = () => runIx(() => sdk!.pause(walletPubkey!));
  const handleUnpause = () => runIx(() => sdk!.unpause(walletPubkey!));

  if (!session) {
    return (
      <div className="space-y-4 rounded-2xl border border-border-low bg-card p-4 sm:p-6">
        <p className="font-semibold">Freeze / Pause</p>
        <p className="text-sm text-muted">Connect a wallet (pauser/freezer role) to freeze, thaw, or pause.</p>
      </div>
    );
  }

  if (!mintValid) {
    return (
      <div className="space-y-4 rounded-2xl border border-border-low bg-card p-4 sm:p-6">
        <p className="font-semibold">Freeze / Pause</p>
        <p className="text-sm text-muted">Set a mint address to use freeze/thaw/pause.</p>
      </div>
    );
  }

  if (sdkLoading || !sdk) {
    return (
      <div className="space-y-4 rounded-2xl border border-border-low bg-card p-4 sm:p-6">
        <p className="font-semibold">Freeze / Pause</p>
        <p className="text-sm text-muted">Loading…</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-2xl border border-border-low bg-card p-4 sm:p-6">
      <p className="font-semibold">Freeze / Pause</p>
      <p className="text-sm text-muted">Freeze or thaw a token account; pause or unpause the mint.</p>
      <form onSubmit={(e) => { e.preventDefault(); }} className="space-y-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-muted">Account to freeze/thaw (owner)</label>
          <input
            type="text"
            value={freezeAccount}
            onChange={(e) => setFreezeAccount(e.target.value)}
            placeholder="Base58 address"
            className="min-h-[44px] w-full rounded-lg border border-border-low bg-card px-3 py-2 font-mono text-sm"
            disabled={isSending}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleFreeze}
            disabled={isSending || !freezeAccount.trim()}
            className="min-h-[44px] cursor-pointer rounded-lg border border-border-low bg-cream px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60"
          >
            Freeze
          </button>
          <button
            type="button"
            onClick={handleThaw}
            disabled={isSending || !freezeAccount.trim()}
            className="min-h-[44px] cursor-pointer rounded-lg border border-border-low bg-cream px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60"
          >
            Thaw
          </button>
        </div>
      </form>
      <div className="flex gap-2 border-t border-border-low pt-4">
        <button
          type="button"
          onClick={handlePause}
          disabled={isSending}
          className="min-h-[44px] cursor-pointer rounded-lg border border-border-low bg-cream px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60"
        >
          Pause mint
        </button>
        <button
          type="button"
          onClick={handleUnpause}
          disabled={isSending}
          className="min-h-[44px] cursor-pointer rounded-lg border border-border-low bg-cream px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60"
        >
          Unpause mint
        </button>
      </div>
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
