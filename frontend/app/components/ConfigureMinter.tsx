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

/**
 * Master authority must configure a minter (e.g. themselves) before mint works.
 * This section lets the authority call configure_minter so the minter_config PDA exists.
 */
export function ConfigureMinter() {
  const { mintAddress } = useMint();
  const { showToast } = useSettings();
  const session = useWalletSession();
  const walletStr = session?.account?.address?.toString() ?? null;
  const walletPubkey = walletStr ? new PublicKey(walletStr) : null;
  const { sdk, config, loading: sdkLoading } = useStablecoinSdk(walletPubkey, mintAddress);
  const { send, isSending, signature, status, error, reset } = useSendTransaction();

  const [minterAddress, setMinterAddress] = useState("");
  const [dailyQuota, setDailyQuota] = useState("1000000");
  const [txError, setTxError] = useState<string | null>(null);

  const mintValid = mintAddress && mintAddress.length >= 32 && mintAddress.length <= 44;
  const isAuthority = config && walletPubkey && config.masterAuthority.equals(walletPubkey);

  useEffect(() => {
    if (walletStr) setMinterAddress((prev) => prev || walletStr);
  }, [walletStr]);

  useEffect(() => {
    if (signature && status === "success") showToast(signature);
  }, [signature, status, showToast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sdk || !walletPubkey || !walletStr || !minterAddress.trim() || !dailyQuota.trim()) return;
    const quota = Number(dailyQuota);
    if (Number.isNaN(quota) || quota < 0) return;
    setTxError(null);
    reset();
    try {
      const minterPubkey = new PublicKey(minterAddress.trim());
      const builder = sdk.updateMinter(walletPubkey, minterPubkey, true, quota);
      const ix = await builderToInstruction(builder);
      await send({
        instructions: [web3InstructionToKitFormat(ix) as any],
        feePayer: toAddress(walletStr),
      });
      setMinterAddress(walletStr);
    } catch (err) {
      setTxError(getTransactionErrorMessage(err));
    }
  };

  if (!mintValid) return null;
  if (sdkLoading || !sdk) {
    return (
      <div className="dashboard-card space-y-4 p-4 sm:p-6">
        <p className="font-semibold">Configure minter</p>
        <p className="text-sm text-muted">Loading…</p>
      </div>
    );
  }

  return (
    <div className="dashboard-card space-y-4 p-4 sm:p-6">
      <p className="font-semibold">Configure minter</p>
      <p className="text-sm text-muted">
        {isAuthority
          ? "Add or update a minter so they can mint. Required once per wallet before minting."
          : "Only the master authority can configure minters. Connect the wallet that created this stablecoin."}
      </p>
      {!session ? (
        <p className="text-sm text-muted">Connect a wallet.</p>
      ) : !isAuthority ? (
        <p className="text-sm text-muted">Current wallet is not the master authority for this mint.</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-muted">Minter address</label>
            <input
              type="text"
              value={minterAddress}
              onChange={(e) => setMinterAddress(e.target.value)}
              placeholder="Wallet that will be allowed to mint"
              className="min-h-[44px] w-full rounded-lg border border-border-low bg-card px-3 py-2 font-mono text-sm"
              disabled={isSending}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-muted">Daily mint quota (raw units)</label>
            <input
              type="text"
              inputMode="numeric"
              value={dailyQuota}
              onChange={(e) => setDailyQuota(e.target.value)}
              placeholder="1000000"
              className="min-h-[44px] w-full rounded-lg border border-border-low bg-card px-3 py-2 text-sm"
              disabled={isSending}
            />
          </div>
          <button
            type="submit"
            disabled={isSending || !minterAddress.trim() || !dailyQuota.trim()}
            className="min-h-[44px] cursor-pointer rounded-lg border border-border-low bg-cream px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSending ? "Configuring…" : "Configure minter"}
          </button>
          {Boolean(txError || error) && (
            <p className="text-sm text-red-600">
              {txError ?? (error != null ? getTransactionErrorMessage(error) : "")}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
