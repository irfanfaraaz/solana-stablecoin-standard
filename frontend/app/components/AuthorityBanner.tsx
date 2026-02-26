"use client";

import { useMemo } from "react";
import { PublicKey } from "@solana/web3.js";
import { useWalletSession } from "@solana/react-hooks";
import { useMint } from "../context/mint-context";
import { useStablecoinSdk } from "../lib/use-stablecoin-sdk";

/** Summarises what the connected wallet can do for this mint (master, pauser, burner, blacklister, seizer). */
export function useAuthority() {
  const { mintAddress } = useMint();
  const session = useWalletSession();
  const walletStr = session?.account?.address?.toString() ?? null;
  const walletPubkey = useMemo(
    () => (walletStr ? new PublicKey(walletStr) : null),
    [walletStr]
  );
  const { config, roles, loading } = useStablecoinSdk(walletPubkey, mintAddress);

  return useMemo(() => {
    if (!walletPubkey || !config) {
      return {
        loading,
        walletConnected: !!walletStr,
        hasMint: !!mintAddress && mintAddress.length >= 32 && mintAddress.length <= 44,
        isMasterAuthority: false,
        canPause: false,
        canBurn: false,
        canBlacklist: false,
        canSeize: false,
        masterAuthorityAddress: null as string | null,
      };
    }
    const isMaster = config.masterAuthority.equals(walletPubkey);
    const r = roles;
    const canPause = isMaster || (r?.pauser.equals(walletPubkey) ?? false);
    const canBurn = r?.burner.equals(walletPubkey) ?? false;
    const canBlacklist = r?.blacklister.equals(walletPubkey) ?? false;
    const canSeize = r?.seizer.equals(walletPubkey) ?? false;
    return {
      loading,
      walletConnected: true,
      hasMint: true,
      isMasterAuthority: isMaster,
      canPause,
      canBurn,
      canBlacklist,
      canSeize,
      masterAuthorityAddress: config.masterAuthority.toBase58(),
    };
  }, [loading, walletPubkey, config, roles, walletStr, mintAddress]);
}

type AuthorityBannerProps = {
  /** Which tab this is for: "admin" | "compliance" */
  context: "admin" | "compliance";
};

/**
 * Shows a clear message when the connected wallet is not the master authority (admin)
 * or doesn't have the relevant compliance roles. Helps avoid confusion when tx would fail with Unauthorized.
 */
export function AuthorityBanner({ context }: AuthorityBannerProps) {
  const auth = useAuthority();

  if (auth.loading || !auth.walletConnected || !auth.hasMint) return null;

  if (context === "admin") {
    if (auth.isMasterAuthority) {
      const others: string[] = [];
      if (auth.canPause) others.push("pause/unpause");
      if (auth.canBurn) others.push("burn");
      if (auth.canBlacklist) others.push("blacklist");
      if (auth.canSeize) others.push("seize");
      if (others.length === 0) return null;
      return (
        <div className="mb-6 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-foreground">
          <p className="font-medium">You have admin access</p>
          <p className="mt-1 text-muted">
            This wallet is the master authority. You can configure minters and update roles.
            {others.length > 0 && ` You can also: ${others.join(", ")}.`}
          </p>
        </div>
      );
    }
    const hints: string[] = [];
    if (auth.canPause) hints.push("pause/unpause");
    if (auth.canBurn) hints.push("mint/burn (as configured minter/burner)");
    if (auth.canBlacklist) hints.push("blacklist");
    if (auth.canSeize) hints.push("seize");
    return (
      <div className="mb-6 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
        <p className="font-medium text-foreground">This wallet is not the master authority</p>
        <p className="mt-1 text-muted">
          Configure minters and update roles require the wallet that created this stablecoin
          {auth.masterAuthorityAddress && (
            <span className="block mt-1 font-mono text-xs truncate" title={auth.masterAuthorityAddress}>
              Master authority: {auth.masterAuthorityAddress.slice(0, 4)}…{auth.masterAuthorityAddress.slice(-4)}
            </span>
          )}.
        </p>
        {hints.length > 0 && (
          <p className="mt-2 text-muted">
            With this wallet you can: {hints.join(", ")}.
          </p>
        )}
      </div>
    );
  }

  if (context === "compliance") {
    if (auth.canBlacklist || auth.canSeize) return null;
    return (
      <div className="mb-6 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
        <p className="font-medium text-foreground">No compliance role for this wallet</p>
        <p className="mt-1 text-muted">
          Allowlist, blacklist, and seize require the wallet that holds the blacklister or seizer role for this stablecoin.
        </p>
      </div>
    );
  }

  return null;
}
