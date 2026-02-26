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

export function SeizeSection() {
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

  const [fromAddress, setFromAddress] = useState("");
  const [treasuryAddress, setTreasuryAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [txError, setTxError] = useState<string | null>(null);

  const mintValid = mintAddress && mintAddress.length >= 32 && mintAddress.length <= 44;

  const handleSeize = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sdk || !walletPubkey || !walletStr || !fromAddress.trim() || !treasuryAddress.trim() || !amount.trim()) return;
    const num = parseFloat(amount);
    if (Number.isNaN(num) || num < 0) return;
    setTxError(null);
    reset();
    try {
      const { SSSComplianceModule } = await import("@stbr/sss-token");
      const compliance = new SSSComplianceModule(sdk as any);
      const builder = await compliance.seize(
        walletPubkey,
        new PublicKey(fromAddress.trim()),
        new PublicKey(treasuryAddress.trim()),
        amount.trim()
      );
      const ix = await builderToInstruction(builder);
      await send({
        instructions: [web3InstructionToKitFormat(ix) as any],
        feePayer: toAddress(walletStr),
      });
      setFromAddress("");
      setTreasuryAddress("");
      setAmount("");
    } catch (err) {
      setTxError(getTransactionErrorMessage(err));
    }
  };

  if (!session) {
    return (
      <div className="space-y-4 rounded-2xl border border-border-low bg-card p-4 sm:p-6">
        <p className="font-semibold">Seize</p>
        <p className="text-sm text-muted">Connect a wallet (seizer role) to seize tokens.</p>
      </div>
    );
  }

  if (!mintValid) {
    return (
      <div className="space-y-4 rounded-2xl border border-border-low bg-card p-4 sm:p-6">
        <p className="font-semibold">Seize</p>
        <p className="text-sm text-muted">Set a mint address to use seize.</p>
      </div>
    );
  }

  if (sdkLoading || !sdk) {
    return (
      <div className="space-y-4 rounded-2xl border border-border-low bg-card p-4 sm:p-6">
        <p className="font-semibold">Seize</p>
        <p className="text-sm text-muted">Loading…</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-2xl border border-border-low bg-card p-4 sm:p-6">
      <p className="font-semibold">Seize</p>
      <p className="text-sm text-muted">Seize tokens from an account to a treasury (seizer role).</p>
      <form onSubmit={handleSeize} className="space-y-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-muted">From (token account owner)</label>
          <input
            type="text"
            value={fromAddress}
            onChange={(e) => setFromAddress(e.target.value)}
            placeholder="Base58 address"
            className="min-h-[44px] w-full rounded-lg border border-border-low bg-card px-3 py-2 font-mono text-sm"
            disabled={isSending}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-muted">Treasury (destination owner)</label>
          <input
            type="text"
            value={treasuryAddress}
            onChange={(e) => setTreasuryAddress(e.target.value)}
            placeholder="Base58 address"
            className="min-h-[44px] w-full rounded-lg border border-border-low bg-card px-3 py-2 font-mono text-sm"
            disabled={isSending}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-muted">Amount</label>
          <input
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            className="min-h-[44px] w-full rounded-lg border border-border-low bg-card px-3 py-2 text-sm"
            disabled={isSending}
          />
        </div>
        <button
          type="submit"
          disabled={isSending || !fromAddress.trim() || !treasuryAddress.trim() || !amount.trim()}
          className="min-h-[44px] cursor-pointer rounded-lg border border-border-low bg-cream px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSending ? "Seizing…" : "Seize"}
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
