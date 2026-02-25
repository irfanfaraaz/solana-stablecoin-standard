"use client";

import { useState } from "react";
import { useSplToken } from "@solana/react-hooks";
import { TOKEN_2022_PROGRAM_ADDRESS } from "@solana/client";

export function TransferForm({ mintAddress }: { mintAddress: string | null }) {
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");

  const mint = mintAddress ?? "";
  const isValidMintLength = mint.length >= 32 && mint.length <= 44;
  const mintForHook = isValidMintLength ? mint : "11111111111111111111111111111111";

  const {
    send,
    isSending,
    sendError,
    sendStatus,
    resetSend,
    status: tokenStatus,
  } = useSplToken(mintForHook, {
    config: isValidMintLength
      ? { tokenProgram: TOKEN_2022_PROGRAM_ADDRESS }
      : undefined,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipient.trim() || !amount.trim() || !mint) return;
    const num = parseFloat(amount);
    if (Number.isNaN(num) || num <= 0) return;
    resetSend();
    try {
      await send({
        amount: num,
        destinationOwner: recipient.trim(),
      });
      setAmount("");
    } catch (_) {
      // error in sendError
    }
  };

  if (!mint) {
    return (
      <section className="w-full max-w-3xl space-y-4 rounded-2xl border border-border-low bg-card p-6">
        <p className="text-lg font-semibold">Transfer</p>
        <p className="text-sm text-muted">Set mint address to enable transfers.</p>
      </section>
    );
  }

  if (!isValidMintLength) {
    return (
      <section className="w-full max-w-3xl space-y-4 rounded-2xl border border-border-low bg-card p-6">
        <p className="text-lg font-semibold">Transfer</p>
        <p className="text-sm text-muted">
          Enter a full mint address (32–44 characters) above to enable transfers.
        </p>
      </section>
    );
  }

  if (tokenStatus === "disconnected") {
    return (
      <section className="w-full max-w-3xl space-y-4 rounded-2xl border border-border-low bg-card p-6">
        <p className="text-lg font-semibold">Transfer</p>
        <p className="text-sm text-muted">Connect a wallet to transfer.</p>
      </section>
    );
  }

  return (
    <section className="w-full max-w-3xl space-y-4 rounded-2xl border border-border-low bg-card p-6">
      <p className="text-lg font-semibold">Transfer</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="recipient" className="mb-1 block text-sm font-medium text-muted">
            Recipient address
          </label>
          <input
            id="recipient"
            type="text"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="Base58 wallet address"
            className="w-full rounded-lg border border-border-low bg-card px-3 py-2 font-mono text-sm"
            disabled={isSending}
          />
        </div>
        <div>
          <label htmlFor="amount" className="mb-1 block text-sm font-medium text-muted">
            Amount
          </label>
          <input
            id="amount"
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full rounded-lg border border-border-low bg-card px-3 py-2 text-sm"
            disabled={isSending}
          />
        </div>
        {sendError != null ? (
          <p className="text-sm text-red-600">
            {sendError instanceof Error ? sendError.message : String(sendError)}
          </p>
        ) : null}
        {sendStatus === "success" && (
          <p className="text-sm text-green-600">Transfer sent successfully.</p>
        )}
        <button
          type="submit"
          disabled={
            isSending ||
            !recipient.trim() ||
            !amount.trim() ||
            parseFloat(amount) <= 0
          }
          className="rounded-lg border border-border-low bg-cream px-4 py-2 font-medium transition hover:-translate-y-0.5 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSending ? "Sending…" : "Send"}
        </button>
      </form>
    </section>
  );
}
