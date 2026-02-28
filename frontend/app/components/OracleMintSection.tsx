"use client";

import { useState } from "react";
import { useWalletSession, useSendTransaction } from "@solana/react-hooks";
import { toAddress } from "@solana/client";
import { Connection, PublicKey } from "@solana/web3.js";
import {
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  TOKEN_2022_PROGRAM_ID,
} from "@solana/spl-token";
import { useMint } from "../context/mint-context";
import { useStablecoinSdk } from "../lib/use-stablecoin-sdk";
import { web3InstructionToKitFormat, builderToInstruction } from "../lib/instruction-to-kit";
import { getTransactionErrorMessage } from "../lib/transaction-error";
import { RPC_URL } from "../lib/constants";
import { ORACLE_PROGRAM_ID, SWITCHBOARD_QUEUE, SWITCHBOARD_FEED_HASH } from "../lib/constants";

/**
 * Mint with oracle — user pays Switchboard quote (~0.00015 SOL) + tx fees.
 * Set NEXT_PUBLIC_SWITCHBOARD_QUEUE and NEXT_PUBLIC_SWITCHBOARD_FEED_HASH (or use defaults) for your chain.
 * Fetches Switchboard update + verify instructions, then oracle compute_mint_amount; user signs once.
 */
export function OracleMintSection() {
  const { mintAddress } = useMint();
  const session = useWalletSession();
  const walletStr = session?.account?.address?.toString() ?? null;
  const walletPubkey = walletStr ? new PublicKey(walletStr) : null;
  const { sdk, loading: sdkLoading, oracleProgram } = useStablecoinSdk(walletPubkey, mintAddress);
  const { send, isSending, error, reset } = useSendTransaction();

  const [pegAmount, setPegAmount] = useState("");
  const [pegDecimals, setPegDecimals] = useState("6");
  const [recipient, setRecipient] = useState("");
  const [loading, setLoading] = useState(false);
  const [txError, setTxError] = useState<string | null>(null);

  const queuePubkeyStr = process.env.NEXT_PUBLIC_SWITCHBOARD_QUEUE ?? SWITCHBOARD_QUEUE;
  const feedHash = process.env.NEXT_PUBLIC_SWITCHBOARD_FEED_HASH ?? SWITCHBOARD_FEED_HASH;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sdk || !walletPubkey || !walletStr || !mintAddress || !pegAmount.trim() || !recipient.trim()) return;
    setTxError(null);
    reset();
    setLoading(true);
    try {
      const connection = new Connection(RPC_URL, { commitment: "confirmed" });
      const slotHashes = new PublicKey("SysvarS1otHashes111111111111111111111111111");
      const instructionsSysvar = new PublicKey("Sysvar1nstructions1111111111111111111111111");
      const queuePubkey = queuePubkeyStr ? new PublicKey(queuePubkeyStr) : null;
      const recipientPubkey = new PublicKey(recipient.trim());
      const mintPubkey = new PublicKey(mintAddress);
      const decimals = parseInt(pegDecimals, 10) || 6;
      const pegAmountSmallest = BigInt(Math.floor(parseFloat(pegAmount) * 10 ** decimals));

      if (!queuePubkey) {
        setTxError("Set NEXT_PUBLIC_SWITCHBOARD_QUEUE (and optionally NEXT_PUBLIC_SWITCHBOARD_FEED_HASH) for oracle mint.");
        setLoading(false);
        return;
      }

      if (!oracleProgram) {
        setTxError("Oracle program not loaded. Add oracle IDL to frontend (see docs).");
        setLoading(false);
        return;
      }

      if (!feedHash) {
        setTxError("Set NEXT_PUBLIC_SWITCHBOARD_FEED_HASH (32-byte hex, e.g. EUR/USD feed ID) for oracle mint.");
        setLoading(false);
        return;
      }

      // Fetch Switchboard update + verify instructions so that verify is at index 1.
      // Use @switchboard-xyz/on-demand: fetchUpdateBundleIx or equivalent; ensure verify is at index 1.
      let preInstructions: import("@solana/web3.js").TransactionInstruction[] = [];
      if (feedHash) {
        try {
          const onDemand = await import("@switchboard-xyz/on-demand");
          const feedHashBytes = feedHash.length === 64 && /^[0-9a-fA-F]+$/.test(feedHash)
            ? Buffer.from(feedHash, "hex")
            : Buffer.from(feedHash, "utf-8");
          const fn = (onDemand as any).fetchUpdateBundleIx ?? (onDemand as any).default?.fetchUpdateBundleIx;
          if (typeof fn === "function") {
            const bundle = await fn(connection, queuePubkey, [feedHashBytes], { payer: walletPubkey });
            preInstructions = Array.isArray(bundle) ? bundle : [bundle];
          }
        } catch (_) {
          setTxError("Install @switchboard-xyz/on-demand and set NEXT_PUBLIC_SWITCHBOARD_FEED_HASH (32-byte hex) to fetch quote instructions.");
          setLoading(false);
          return;
        }
      }

      const { computeMintAmountFromOracle } = await import("@stbr/sss-token");
      const tokenAmount = await computeMintAmountFromOracle({
        connection,
        program: oracleProgram as any,
        queue: queuePubkey,
        slotHashes,
        instructionsSysvar,
        pegAmount: pegAmountSmallest,
        tokenDecimals: decimals,
        preInstructions,
      });

      const ata = getAssociatedTokenAddressSync(mintPubkey, recipientPubkey, true, TOKEN_2022_PROGRAM_ID);
      const ataInfo = await connection.getAccountInfo(ata);
      const instructions = [];
      if (!ataInfo) {
        instructions.push(
          createAssociatedTokenAccountInstruction(walletPubkey, ata, recipientPubkey, mintPubkey, TOKEN_2022_PROGRAM_ID)
        );
      }
      const builder = sdk.mint(walletPubkey, recipientPubkey, tokenAmount.toString());
      instructions.push(await builderToInstruction(builder));
      await send({
        instructions: instructions.map((ix) => web3InstructionToKitFormat(ix) as any),
        feePayer: toAddress(walletStr),
      });
      setPegAmount("");
      setRecipient("");
    } catch (err) {
      setTxError(getTransactionErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const mintValid = mintAddress && mintAddress.length >= 32 && mintAddress.length <= 44;
  const busy = loading || isSending;
  const err = txError ?? (error != null ? getTransactionErrorMessage(error) : null);

  if (!mintValid) {
    return (
      <div className="dashboard-card space-y-4 p-4 sm:p-6">
        <p className="font-semibold">Mint with oracle</p>
        <p className="text-sm text-muted">Set a mint address above to use oracle-based mint.</p>
      </div>
    );
  }

  if (sdkLoading || !sdk) {
    return (
      <div className="dashboard-card space-y-4 p-4 sm:p-6">
        <p className="font-semibold">Mint with oracle</p>
        <p className="text-sm text-muted">Loading… Connect a wallet and set queue/feed in env.</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="dashboard-card space-y-4 p-4 sm:p-6">
        <p className="font-semibold">Mint with oracle</p>
        <p className="text-sm text-muted">Connect a wallet. You pay Switchboard quote (~0.00015 SOL) + tx fees.</p>
      </div>
    );
  }

  return (
    <div className="dashboard-card space-y-4 p-4 sm:p-6">
      <p className="font-semibold">Mint with oracle</p>
      <p className="text-sm text-muted">
        Enter peg amount (e.g. 100 for 100 EUR), decimals, and recipient. Uses live price from Switchboard; you sign one tx and pay fees.
      </p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-muted">Peg amount</label>
          <input
            type="text"
            inputMode="decimal"
            value={pegAmount}
            onChange={(e) => setPegAmount(e.target.value)}
            placeholder="e.g. 100"
            className="min-h-[44px] w-full rounded-lg border border-border-low bg-card px-3 py-2 text-sm"
            disabled={!!busy}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-muted">Peg decimals</label>
          <input
            type="text"
            inputMode="numeric"
            value={pegDecimals}
            onChange={(e) => setPegDecimals(e.target.value)}
            placeholder="6"
            className="min-h-[44px] w-full rounded-lg border border-border-low bg-card px-3 py-2 text-sm"
            disabled={!!busy}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-muted">Recipient</label>
          <input
            type="text"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="Base58 address"
            className="min-h-[44px] w-full rounded-lg border border-border-low bg-card px-3 py-2 font-mono text-sm"
            disabled={!!busy}
          />
        </div>
        <button
          type="submit"
          disabled={!!busy || !pegAmount.trim() || !recipient.trim()}
          className="min-h-[44px] cursor-pointer rounded-lg border border-border-low bg-cream px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading || isSending ? "Minting…" : "Mint with oracle"}
        </button>
      </form>
      {err && <p className="text-sm text-red-600">{err}</p>}
    </div>
  );
}
