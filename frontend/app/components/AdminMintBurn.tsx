"use client";

import { useState, useEffect } from "react";
import { useWalletSession, useSendTransaction } from "@solana/react-hooks";
import { toAddress } from "@solana/client";
import { Connection, PublicKey } from "@solana/web3.js";
import {
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  TOKEN_2022_PROGRAM_ID,
} from "@solana/spl-token";
import { useMint } from "../context/mint-context";
import { useSettings } from "../context/settings-context";
import { getBackendBaseUrl, apiPost } from "../lib/api";
import { useStablecoinSdk } from "../lib/use-stablecoin-sdk";
import { web3InstructionToKitFormat, builderToInstruction } from "../lib/instruction-to-kit";
import { getTransactionErrorMessage } from "../lib/transaction-error";
import { RPC_URL } from "../lib/constants";

export function AdminMintBurn() {
  const { mintAddress } = useMint();
  const { useBackend, showToast } = useSettings();
  const session = useWalletSession();
  const walletStr = session?.account?.address?.toString() ?? null;
  const walletPubkey = walletStr ? new PublicKey(walletStr) : null;
  const { sdk, loading: sdkLoading } = useStablecoinSdk(walletPubkey, mintAddress);
  const { send, isSending, signature, status, error, reset } = useSendTransaction();

  const [mintRecipient, setMintRecipient] = useState("");
  const [mintAmount, setMintAmount] = useState("");
  const [burnFrom, setBurnFrom] = useState("");
  const [burnAmount, setBurnAmount] = useState("");
  const [loading, setLoading] = useState<"mint" | "burn" | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  const baseUrl = getBackendBaseUrl();
  const useApi = useBackend && !!baseUrl;
  const mintValid = mintAddress && mintAddress.length >= 32 && mintAddress.length <= 44;

  useEffect(() => {
    if (signature && status === "success") {
      setLoading(null);
      showToast(signature);
    }
  }, [signature, status, showToast]);

  const handleMintApi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mintAddress || !mintRecipient.trim() || !mintAmount.trim()) return;
    setApiError(null);
    setLoading("mint");
    try {
      const res = await apiPost<{ signature: string }>("/mint", {
        mint: mintAddress,
        recipient: mintRecipient.trim(),
        amount: mintAmount.trim(),
      });
      showToast(res.signature);
      setMintRecipient("");
      setMintAmount("");
    } catch (err) {
      setApiError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(null);
    }
  };

  const handleBurnApi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mintAddress || !burnAmount.trim()) return;
    setApiError(null);
    setLoading("burn");
    try {
      const body: Record<string, string> = { mint: mintAddress, amount: burnAmount.trim() };
      if (burnFrom.trim()) body.from = burnFrom.trim();
      const res = await apiPost<{ signature: string }>("/burn", body);
      showToast(res.signature);
      setBurnFrom("");
      setBurnAmount("");
    } catch (err) {
      setApiError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(null);
    }
  };

  const handleMintSdk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sdk || !walletPubkey || !walletStr || !mintAddress || !mintRecipient.trim() || !mintAmount.trim()) return;
    setApiError(null);
    reset();
    setLoading("mint");
    try {
      const recipientPubkey = new PublicKey(mintRecipient.trim());
      const mintPubkey = new PublicKey(mintAddress);
      const connection = new Connection(RPC_URL, { commitment: "confirmed" });
      const ata = getAssociatedTokenAddressSync(
        mintPubkey,
        recipientPubkey,
        true,
        TOKEN_2022_PROGRAM_ID
      );
      const ataInfo = await connection.getAccountInfo(ata);
      const instructions: import("@solana/web3.js").TransactionInstruction[] = [];
      if (!ataInfo) {
        instructions.push(
          createAssociatedTokenAccountInstruction(
            walletPubkey,
            ata,
            recipientPubkey,
            mintPubkey,
            TOKEN_2022_PROGRAM_ID
          )
        );
      }
      const builder = sdk.mint(walletPubkey, recipientPubkey, mintAmount.trim());
      const mintIx = await builderToInstruction(builder);
      instructions.push(mintIx);
      await send({
        instructions: instructions.map((ix) => web3InstructionToKitFormat(ix) as any),
        feePayer: toAddress(walletStr),
      });
      setMintRecipient("");
      setMintAmount("");
    } catch (err) {
      setApiError(getTransactionErrorMessage(err));
      setLoading(null);
    } finally {
      if (useApi) setLoading(null);
    }
  };

  const handleBurnSdk = async (e: React.FormEvent) => {
    e.preventDefault();
    const fromStr = burnFrom.trim() || walletStr;
    if (!sdk || !walletPubkey || !walletStr || !burnAmount.trim() || !fromStr) return;
    setApiError(null);
    reset();
    setLoading("burn");
    try {
      const fromPubkey = new PublicKey(fromStr);
      const builder = sdk.burn(walletPubkey, fromPubkey, burnAmount.trim());
      const ix = await builderToInstruction(builder);
      await send({
        instructions: [web3InstructionToKitFormat(ix) as any],
        feePayer: toAddress(walletStr),
      });
      setBurnFrom("");
      setBurnAmount("");
    } catch (err) {
      setApiError(getTransactionErrorMessage(err));
      setLoading(null);
    } finally {
      if (useApi) setLoading(null);
    }
  };

  const handleMint = useApi ? handleMintApi : handleMintSdk;
  const handleBurn = useApi ? handleBurnApi : handleBurnSdk;
  const busy = loading || isSending;
  const err = apiError ?? (error != null ? getTransactionErrorMessage(error) : null);

  if (!mintValid) {
    return (
      <div className="space-y-4 rounded-2xl border border-border-low bg-card p-4 sm:p-6">
        <p className="font-semibold">Mint / Burn</p>
        <p className="text-sm text-muted">Set a mint address above to use mint/burn.</p>
      </div>
    );
  }

  if (!useApi && (sdkLoading || !sdk)) {
    return (
      <div className="space-y-4 rounded-2xl border border-border-low bg-card p-4 sm:p-6">
        <p className="font-semibold">Mint / Burn</p>
        <p className="text-sm text-muted">Loading… Connect a wallet to mint/burn via SDK.</p>
      </div>
    );
  }

  if (!useApi && !session) {
    return (
      <div className="space-y-4 rounded-2xl border border-border-low bg-card p-4 sm:p-6">
        <p className="font-semibold">Mint / Burn</p>
        <p className="text-sm text-muted">Connect a wallet to mint or burn (SDK).</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-2xl border border-border-low bg-card p-4 sm:p-6">
      <p className="font-semibold">Mint / Burn</p>
      <p className="text-sm text-muted">
        {useApi
          ? "Mint to a recipient or burn (backend runs screening)."
          : "Mint or burn using your wallet (no backend)."}
      </p>
      <form onSubmit={handleMint} className="space-y-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-muted">Mint: Recipient</label>
          <input
            type="text"
            value={mintRecipient}
            onChange={(e) => setMintRecipient(e.target.value)}
            placeholder="Base58 address"
            className="min-h-[44px] w-full rounded-lg border border-border-low bg-card px-3 py-2 font-mono text-sm"
            disabled={!!busy}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-muted">Mint: Amount</label>
          <input
            type="text"
            inputMode="decimal"
            value={mintAmount}
            onChange={(e) => setMintAmount(e.target.value)}
            placeholder="0"
            className="min-h-[44px] w-full rounded-lg border border-border-low bg-card px-3 py-2 text-sm"
            disabled={!!busy}
          />
        </div>
        <button
          type="submit"
          disabled={!!busy || !mintRecipient.trim() || !mintAmount.trim()}
          className="min-h-[44px] cursor-pointer rounded-lg border border-border-low bg-cream px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading === "mint" || (isSending && loading === "mint") ? "Minting…" : "Mint"}
        </button>
      </form>
      <form onSubmit={handleBurn} className="space-y-3 border-t border-border-low pt-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-muted">Burn: From (optional)</label>
          <input
            type="text"
            value={burnFrom}
            onChange={(e) => setBurnFrom(e.target.value)}
            placeholder="Leave empty for default"
            className="min-h-[44px] w-full rounded-lg border border-border-low bg-card px-3 py-2 font-mono text-sm"
            disabled={!!busy}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-muted">Burn: Amount</label>
          <input
            type="text"
            inputMode="decimal"
            value={burnAmount}
            onChange={(e) => setBurnAmount(e.target.value)}
            placeholder="0"
            className="min-h-[44px] w-full rounded-lg border border-border-low bg-card px-3 py-2 text-sm"
            disabled={!!busy}
          />
        </div>
        <button
          type="submit"
          disabled={!!busy || !burnAmount.trim()}
          className="min-h-[44px] cursor-pointer rounded-lg border border-border-low bg-cream px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading === "burn" || (isSending && loading === "burn") ? "Burning…" : "Burn"}
        </button>
      </form>
      {err && <p className="text-sm text-red-600">{err}</p>}
    </div>
  );
}
