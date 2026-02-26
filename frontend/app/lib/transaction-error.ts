"use client";

/**
 * Extract a user-facing message from wallet/send transaction errors.
 * Handles "transaction plan failed" style errors that expose
 * transactionPlanResult and cause (deprecated).
 */
export function getTransactionErrorMessage(error: unknown): string {
  if (error == null) return "Unknown error";

  const err = error as Record<string, unknown>;

  // RPC/simulation: error.data or error.error?.data has logs and err
  const data = err.data ?? (err.error as Record<string, unknown> | undefined)?.data;
  if (data != null && typeof data === "object") {
    const d = data as Record<string, unknown>;
    const logs = d.logs;
    if (Array.isArray(logs)) {
      const anchorLog = logs.find(
        (l) =>
          typeof l === "string" &&
          (l.includes("AnchorError") || l.includes("Error Message:"))
      ) as string | undefined;
      if (anchorLog) {
        const msg = extractAnchorErrorMessage(anchorLog);
        if (msg) return msg;
      }
    }
    const dataErr = d.err;
    if (dataErr != null) {
      const code = extractProgramErrorCode(dataErr);
      if (code != null) return `Program error ${code}${getKnownErrorHint(code)}`;
    }
  }

  // If message contains "custom program error: 0x...", add a hint from known codes
  const msg = err.message ?? (error instanceof Error ? error.message : null);
  if (typeof msg === "string" && msg.includes("custom program error:")) {
    const hex = msg.match(/0x([0-9a-fA-F]+)/)?.[1];
    if (hex) {
      const code = parseInt(hex, 16);
      if (!Number.isNaN(code)) return `Transaction failed: program error ${code}${getKnownErrorHint(code)}`;
    }
  }

  // transactionPlanResult may contain the actual failure (e.g. simulation or user rejection)
  const plan = err.transactionPlanResult;
  if (plan != null && typeof plan === "object") {
    const p = plan as Record<string, unknown>;
    if (typeof p.error === "string") return p.error;
    if (p.error != null && typeof (p.error as Error).message === "string") {
      return (p.error as Error).message;
    }
    if (typeof p.message === "string") return p.message;
    const res = p.result ?? p.transactionPlanResult;
    if (res != null && typeof res === "object") {
      const r = res as Record<string, unknown>;
      const innerData = (r.data ?? (r.error as Record<string, unknown>)?.data ?? r) as Record<string, unknown> | undefined;
      if (innerData != null && typeof innerData === "object") {
        const id = innerData as Record<string, unknown>;
        if (Array.isArray(id.logs)) {
          const anchorLog = id.logs.find(
            (l) =>
              typeof l === "string" &&
              (l.includes("AnchorError") || l.includes("Error Message:"))
          ) as string | undefined;
          if (anchorLog) {
            const extracted = extractAnchorErrorMessage(anchorLog);
            if (extracted) return extracted;
          }
        }
        if (id.err != null) {
          const code = extractProgramErrorCode(id.err);
          if (code != null) return `Program error ${code}${getKnownErrorHint(code)}`;
        }
      }
    }
  }

  // cause (deprecated but still set)
  const cause = err.cause;
  if (cause instanceof Error && cause.message) return cause.message;
  if (cause != null && typeof (cause as Error).message === "string") {
    return (cause as Error).message;
  }

  if (error instanceof Error && error.message) return error.message;
  return String(error);
}

function extractAnchorErrorMessage(log: string): string | null {
  const match = log.match(/Error Message:\s*(.+)$/);
  if (match) return match[1].trim();
  if (log.includes("AnchorError")) {
    const start = log.indexOf("AnchorError");
    return log.slice(start).replace(/^AnchorError\s+/, "").trim();
  }
  return null;
}

function extractProgramErrorCode(dataErr: unknown): number | null {
  if (dataErr != null && typeof dataErr === "object" && "InstructionError" in dataErr) {
    const ie = (dataErr as { InstructionError: unknown }).InstructionError;
    if (Array.isArray(ie) && ie.length === 2) {
      const inner = ie[1];
      if (inner != null && typeof inner === "object" && "Custom" in inner) {
        const code = (inner as { Custom: number }).Custom;
        if (typeof code === "number") return code;
      }
    }
  }
  if (Array.isArray(dataErr) && dataErr.length === 2) {
    const inner = dataErr[1];
    if (inner != null && typeof inner === "object" && "Custom" in inner) {
      const code = (inner as { Custom: number }).Custom;
      if (typeof code === "number") return code;
    }
  }
  if (typeof dataErr === "number") return dataErr;
  return null;
}

function getKnownErrorHint(code: number): string {
  const hints: Record<number, string> = {
    3012: " (account not initialized; e.g. configure minter first)",
    6000: " (unauthorized)",
    6001: " (program paused)",
    6002: " (quota exceeded)",
    6003: " (minter inactive)",
  };
  return hints[code] ?? "";
}
