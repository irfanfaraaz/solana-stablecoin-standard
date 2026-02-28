"use client";

import { useState } from "react";
import { useWalletSession, useSendTransaction } from "@solana/react-hooks";
import { toAddress } from "@solana/client";
import { PublicKey } from "@solana/web3.js";
import { useMint } from "../../context/mint-context";
import { useStablecoinSdk } from "../../lib/use-stablecoin-sdk";
import { useDirectoryOpen } from "../directory-context";
import { web3InstructionToKitFormat } from "../../lib/instruction-to-kit";
import { getTransactionErrorMessage } from "../../lib/transaction-error";
import { AuthorityBanner } from "../../components/AuthorityBanner";

const CONTENT_CLASS = "mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10";
const DOCS_SSS3 = "https://github.com/solana-foundation/sss-reference/blob/main/docs/SSS-3.md";

function ProofRequiredCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="dashboard-card rounded-2xl border border-border-low bg-card/80 p-4 sm:p-5">
      <p className="font-semibold text-foreground">{title}</p>
      <p className="text-sm text-muted mt-1">{description}</p>
      <p className="text-xs text-muted mt-2">Requires ZK proof data (not implemented in this UI).</p>
      <a
        href={DOCS_SSS3}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 inline-block text-sm text-primary hover:underline"
      >
        Learn more (SSS-3)
      </a>
    </div>
  );
}

export default function ConfidentialPage() {
  const { mintAddress } = useMint();
  const session = useWalletSession();
  const walletStr = session?.account?.address?.toString() ?? null;
  const walletPubkey = walletStr ? new PublicKey(walletStr) : null;
  const { sdk, config, loading, error } = useStablecoinSdk(walletPubkey, mintAddress);
  const openDirectory = useDirectoryOpen();
  const { send, isSending, reset } = useSendTransaction();

  const [amount, setAmount] = useState("");
  const [depositLoading, setDepositLoading] = useState(false);
  const [txError, setTxError] = useState<string | null>(null);

  const isSSS3 = config?.enableConfidentialTransfers === true;
  const showGate = !mintAddress || loading || !config || !isSSS3;

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sdk || !config || !walletPubkey || !walletStr || !amount.trim()) return;
    const num = parseFloat(amount);
    if (!Number.isFinite(num) || num <= 0) {
      setTxError("Enter a valid amount.");
      return;
    }
    setTxError(null);
    reset();
    setDepositLoading(true);
    try {
      const confidential = sdk.getConfidential();
      const amountSmallest = BigInt(Math.floor(num * 10 ** config.decimals));
      const ix = await confidential.fundConfidential(
        walletPubkey,
        amountSmallest,
        config.decimals
      );
      await send({
        instructions: [web3InstructionToKitFormat(ix) as any],
        feePayer: toAddress(walletStr),
      });
      setAmount("");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/allowlist|not on allowlist/i.test(msg)) {
        setTxError("Your wallet is not on the allowlist. Add it via Compliance → Allowlist (master only).");
      } else {
        setTxError(getTransactionErrorMessage(err));
      }
    } finally {
      setDepositLoading(false);
    }
  };

  if (showGate) {
    return (
      <div className={CONTENT_CLASS}>
        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl mb-10">
          Confidential
        </h1>
        <AuthorityBanner context="compliance" />
        <div className="dashboard-card rounded-2xl border border-border-low bg-card/80 p-6 sm:p-8">
          {loading ? (
            <p className="text-muted">Loading…</p>
          ) : error ? (
            <p className="text-destructive">{error.message}</p>
          ) : !mintAddress ? (
            <>
              <p className="font-medium text-foreground mb-2">No mint selected</p>
              <p className="text-sm text-muted mb-4">Select an SSS-3 mint to use confidential transfers.</p>
              <button
                type="button"
                onClick={openDirectory}
                className="rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-bg1 hover:opacity-90 transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                Choose mint
              </button>
            </>
          ) : (
            <>
              <p className="font-medium text-foreground mb-2">This mint is not SSS-3</p>
              <p className="text-sm text-muted mb-4">Select an SSS-3 mint (confidential + allowlist) to use confidential transfers.</p>
              <button
                type="button"
                onClick={openDirectory}
                className="rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-bg1 hover:opacity-90 transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                Choose mint
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  const busy = depositLoading || isSending;
  const err = txError;

  return (
    <div className={CONTENT_CLASS}>
      <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl mb-10">
        Confidential
      </h1>
      <AuthorityBanner context="compliance" />

      <section className="mb-8">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted mb-4">
          Deposit to confidential
        </h2>
        <div className="dashboard-card rounded-2xl border border-border-low bg-card/80 p-6 sm:p-8">
          <p className="text-sm text-muted mb-4">
            Move public balance into confidential pending balance. If the mint has allowlist enabled, your wallet must be on the allowlist.
          </p>
          {!session ? (
            <p className="text-muted">Connect a wallet to deposit.</p>
          ) : (
            <form onSubmit={handleDeposit} className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-muted">Amount</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 100"
                  className="min-h-[44px] w-full rounded-lg border border-border-low bg-card px-3 py-2 text-sm"
                  disabled={!!busy}
                />
              </div>
              <button
                type="submit"
                disabled={!!busy || !amount.trim()}
                className="min-h-[44px] cursor-pointer rounded-lg border border-border-low bg-primary px-4 py-2 text-sm font-medium text-bg1 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                {busy ? "Depositing…" : "Deposit"}
              </button>
            </form>
          )}
          {err && <p className="mt-3 text-sm text-red-600">{err}</p>}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted mb-4">
          Other confidential actions
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ProofRequiredCard
            title="Configure account"
            description="One-time setup for an ATA for confidential transfers."
          />
          <ProofRequiredCard
            title="Apply pending"
            description="Move pending balance to available confidential balance."
          />
          <ProofRequiredCard
            title="Confidential transfer"
            description="Send confidential amount to another wallet."
          />
          <ProofRequiredCard
            title="Withdraw"
            description="Withdraw from confidential to public balance."
          />
        </div>
      </section>
    </div>
  );
}
