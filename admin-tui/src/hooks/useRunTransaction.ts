import { useCallback } from "react";
import { useApp } from "../context/AppContext.js";

export interface RunTransactionOptions {
  pendingMessage: string;
  successMessage: string;
}

/**
 * Returns a function that runs an async transaction, updating global tx status
 * (pending → success/error) and setting lastSignature when the tx returns one.
 */
export function useRunTransaction() {
  const { setTxStatus } = useApp();

  const run = useCallback(
    async <T>(
      options: RunTransactionOptions,
      fn: () => Promise<{ signature?: string } | void>
    ): Promise<T | undefined> => {
      setTxStatus("pending", options.pendingMessage);
      try {
        const result = await fn();
        const sig =
          result && typeof result === "object" && "signature" in result
            ? (result as { signature: string }).signature
            : undefined;
        setTxStatus(
          "success",
          options.successMessage,
          sig ?? undefined
        );
        return result as T | undefined;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setTxStatus("error", message);
        throw err;
      }
    },
    [setTxStatus]
  );

  return run;
}
