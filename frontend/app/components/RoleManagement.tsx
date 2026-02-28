"use client";

import { useState, useEffect, useMemo } from "react";
import { useWalletSession, useSendTransaction } from "@solana/react-hooks";
import { toAddress } from "@solana/client";
import { PublicKey } from "@solana/web3.js";
import { useMint } from "../context/mint-context";
import { useStablecoinSdk } from "../lib/use-stablecoin-sdk";
import { web3InstructionToKitFormat, builderToInstruction } from "../lib/instruction-to-kit";
import { getTransactionErrorMessage } from "../lib/transaction-error";
import { useSettings } from "../context/settings-context";

const ROLES = [
  { key: "burner" as const, label: "Burner", description: "Can burn tokens" },
  { key: "pauser" as const, label: "Pauser", description: "Can pause / unpause mint" },
  { key: "blacklister" as const, label: "Blacklister", description: "Can blacklist addresses" },
  { key: "seizer" as const, label: "Seizer", description: "Can seize tokens" },
] as const;

function shortPubkey(pubkey: PublicKey): string {
  const s = pubkey.toBase58();
  return s.length > 12 ? `${s.slice(0, 6)}…${s.slice(-4)}` : s;
}

/**
 * Assign or revoke roles (burner, pauser, blacklister, seizer).
 * Only master authority can call update_roles.
 */
export function RoleManagement() {
  const { mintAddress } = useMint();
  const { showToast } = useSettings();
  const session = useWalletSession();
  const walletStr = session?.account?.address?.toString() ?? null;
  const walletPubkey = walletStr ? new PublicKey(walletStr) : null;
  const { sdk, config, roles, loading: sdkLoading, refresh } = useStablecoinSdk(walletPubkey, mintAddress);
  const { send, isSending, signature, status, error, reset } = useSendTransaction();

  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [txError, setTxError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<{ role: string; type: "assign" | "revoke" } | null>(null);

  const mintValid = mintAddress && mintAddress.length >= 32 && mintAddress.length <= 44;
  const isAuthority = config && walletPubkey && config.masterAuthority.equals(walletPubkey);

  const rolesPda = useMemo(() => {
    if (!sdk?.program?.programId || !mintAddress) return null;
    if (mintAddress.length < 32 || mintAddress.length > 44) return null;
    try {
      const mint = new PublicKey(mintAddress);
      return PublicKey.findProgramAddressSync(
        [Buffer.from("roles"), mint.toBuffer()],
        sdk.program.programId
      )[0];
    } catch {
      return null;
    }
  }, [sdk?.program?.programId?.toBase58?.(), mintAddress]);

  // Live refresh: subscribe to RoleAccount changes (confirmed).
  useEffect(() => {
    if (!rolesPda || !sdk?.program?.provider?.connection) return;
    const connection = sdk.program.provider.connection;
    const subId = connection.onAccountChange(rolesPda, () => refresh(), "confirmed");

    return () => {
      connection.removeAccountChangeListener(subId).catch(() => {});
    };
  }, [rolesPda?.toBase58?.(), sdk?.program?.provider?.connection, refresh]);

  useEffect(() => {
    if (signature && status === "success") {
      showToast(signature);
      refresh();
      setPendingAction(null);
    }
    if (status === "error") setPendingAction(null);
  }, [signature, status, showToast, refresh]);

  const handleAssign = async (roleKey: (typeof ROLES)[number]["key"], newAddress: string) => {
    if (!sdk || !walletPubkey || !newAddress.trim()) return;
    setTxError(null);
    setPendingAction({ role: roleKey, type: "assign" });
    reset();
    try {
      const pubkey = new PublicKey(newAddress.trim());
      const builder = sdk.updateRoles(walletPubkey, { [roleKey]: pubkey });
      const ix = await builderToInstruction(builder);
      await send({
        instructions: [web3InstructionToKitFormat(ix) as any],
        feePayer: toAddress(walletStr!),
      });
      setInputs((prev) => ({ ...prev, [roleKey]: "" }));
    } catch (err) {
      setTxError(getTransactionErrorMessage(err));
      setPendingAction(null);
    }
  };

  const handleRevoke = async (roleKey: (typeof ROLES)[number]["key"]) => {
    if (!sdk || !config || !walletPubkey) return;
    setTxError(null);
    setPendingAction({ role: roleKey, type: "revoke" });
    reset();
    try {
      const builder = sdk.updateRoles(walletPubkey, { [roleKey]: config.masterAuthority });
      const ix = await builderToInstruction(builder);
      await send({
        instructions: [web3InstructionToKitFormat(ix) as any],
        feePayer: toAddress(walletStr!),
      });
    } catch (err) {
      setTxError(getTransactionErrorMessage(err));
      setPendingAction(null);
    }
  };

  if (!mintValid) return null;
  if (sdkLoading || !sdk) {
    return (
      <div className="dashboard-card space-y-4 p-4 sm:p-6">
        <p className="font-semibold text-foreground">Role management</p>
        <p className="text-sm text-muted">Loading…</p>
      </div>
    );
  }

  return (
    <div className="dashboard-card space-y-4 p-4 sm:p-6">
      <div>
        <p className="font-semibold text-foreground">Role management</p>
        <p className="text-sm text-muted">
          {isAuthority
            ? "Assign or revoke burner, pauser, blacklister, and seizer. Only master authority can update roles."
            : "Only the master authority can update roles. Connect the wallet that created this stablecoin."}
        </p>
      </div>

      {!session ? (
        <p className="text-sm text-muted">Connect a wallet.</p>
      ) : !isAuthority ? (
        <p className="text-sm text-muted">Current wallet is not the master authority for this mint.</p>
      ) : !roles ? (
        <p className="text-sm text-muted">Could not load roles.</p>
      ) : (
        <div className="space-y-6">
          {ROLES.map(({ key, label, description }) => {
            const current = roles[key];
            const value = inputs[key] ?? "";
            const isMaster = config && current.equals(config.masterAuthority);
            return (
              <div
                key={key}
                className="rounded-xl border border-border-low bg-bg1/50 p-4 space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-foreground">{label}</p>
                    <p className="text-xs text-muted">{description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-lg border border-border-low bg-cream px-2.5 py-1 font-mono text-xs text-foreground" title={current.toBase58()}>
                      {shortPubkey(current)}
                      {isMaster && " (master)"}
                    </span>
                    {!isMaster && (
                      <button
                        type="button"
                        onClick={() => handleRevoke(key)}
                        disabled={isSending}
                        className="rounded-lg border border-border-low px-2.5 py-1 text-xs font-medium text-muted transition-colors hover:bg-cream hover:text-foreground cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {isSending && pendingAction?.role === key && pendingAction?.type === "revoke"
                          ? "Revoking…"
                          : "Revoke"}
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => setInputs((prev) => ({ ...prev, [key]: e.target.value }))}
                    placeholder="New address (Base58)"
                    className="min-h-[40px] flex-1 min-w-[200px] rounded-lg border border-border-low bg-card px-3 py-2 font-mono text-sm"
                    disabled={isSending}
                  />
                  <button
                    type="button"
                    onClick={() => handleAssign(key, value)}
                    disabled={isSending || !value.trim()}
                    className="min-h-[40px] rounded-lg border border-primary bg-primary px-4 py-2 text-sm font-medium text-bg1 transition-colors hover:opacity-90 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isSending && pendingAction?.role === key && pendingAction?.type === "assign"
                      ? "Sending…"
                      : "Assign"}
                  </button>
                </div>
              </div>
            );
          })}
          {txError && <p className="text-sm text-red-600">{txError}</p>}
        </div>
      )}
    </div>
  );
}
