"use client";

/**
 * Extract a user-facing message from wallet/send transaction errors.
 * Handles JSON-RPC simulation failures, transaction plan failures, and Anchor logs.
 */
export function getTransactionErrorMessage(error: unknown): string {
  if (error == null) return "Unknown error";

  const err = error as Record<string, unknown>;

  // JSON-RPC envelope: { error: { code, message, data: { logs, err } } }
  const rpcData = (err.error as Record<string, unknown> | undefined)?.data;
  const data = err.data ?? rpcData;
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
      if (code != null) return formatProgramError(code);
    }
  }

  // Top-level message (e.g. "Transaction simulation failed: ... custom program error: 0x1772")
  const msg = err.message ?? (error instanceof Error ? error.message : null);
  if (typeof msg === "string") {
    // Prefer extracting Anchor "Error Message: ..." if the string contains logs (e.g. stringified response)
    const anchorMsg = extractAnchorErrorMessage(msg);
    if (anchorMsg) return anchorMsg;
    if (msg.includes("custom program error:")) {
      const hex = msg.match(/0x([0-9a-fA-F]+)/)?.[1];
      if (hex) {
        const code = parseInt(hex, 16);
        if (!Number.isNaN(code)) return formatProgramError(code);
      }
    }
    // If message is long and looks like it contains logs (e.g. from stringified RPC response), try to find Error Message
    if (msg.length > 200 && msg.includes("Error Message:")) {
      const extracted = msg.match(/Error Message:\s*([^.]+(?:\.|$))/);
      if (extracted?.[1]) return extracted[1].trim();
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
          if (code != null) return formatProgramError(code);
        }
      }
    }
  }

  // cause may hold the real RPC/simulation error (e.g. from fetch)
  const cause = err.cause;
  if (cause != null && typeof cause === "object") {
    const c = cause as Record<string, unknown>;
    const causeData = c.data ?? (c.error as Record<string, unknown> | undefined)?.data;
    if (causeData != null && typeof causeData === "object") {
      const cd = causeData as Record<string, unknown>;
      if (Array.isArray(cd.logs)) {
        const anchorLog = cd.logs.find(
          (l) =>
            typeof l === "string" &&
            (l.includes("AnchorError") || l.includes("Error Message:"))
        ) as string | undefined;
        if (anchorLog) {
          const extracted = extractAnchorErrorMessage(anchorLog);
          if (extracted) return extracted;
        }
      }
      if (cd.err != null) {
        const code = extractProgramErrorCode(cd.err);
        if (code != null) return formatProgramError(code);
      }
    }
    if (cause instanceof Error && cause.message) return cause.message;
    if (typeof (cause as Record<string, unknown>).message === "string") {
      return (cause as Record<string, unknown>).message as string;
    }
  }

  // Top-level message might be generic; try cause's message for "custom program error" or logs
  if (typeof msg === "string" && (msg === "Transaction simulation failed" || msg.startsWith("Transaction simulation failed"))) {
    const causeMsg = cause != null && typeof cause === "object" && typeof (cause as Record<string, unknown>).message === "string"
      ? (cause as Record<string, unknown>).message as string
      : null;
    if (causeMsg) {
      const fromCause = extractAnchorErrorMessage(causeMsg);
      if (fromCause) return fromCause;
      const hex = causeMsg.match(/0x([0-9a-fA-F]+)/)?.[1];
      if (hex) {
        const code = parseInt(hex, 16);
        if (!Number.isNaN(code)) return formatProgramError(code);
      }
    }
  }

  if (error instanceof Error && error.message) return error.message;
  return String(error);
}

function extractAnchorErrorMessage(log: string): string | null {
  // e.g. "Program log: ... Error Code: QuotaExceeded. Error Number: 6002. Error Message: Minter has exceeded their allowed quota."
  const msgMatch = log.match(/Error Message:\s*(.+)$/);
  if (msgMatch) return msgMatch[1].trim();
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

function formatProgramError(code: number): string {
  const known = getKnownErrorMessage(code);
  if (known) return known;
  return `Transaction failed: program error ${code}${getKnownErrorHint(code)}`;
}

function getKnownErrorHint(code: number): string {
  const hints: Record<number, string> = {
    3012: " (account not initialized; e.g. configure minter first)",
    6000: " (unauthorized)",
    6001: " (program paused)",
    6002: " (minter daily quota exceeded)",
    6003: " (minter inactive)",
  };
  return hints[code] ?? "";
}

/** Human-readable message for known program error codes (when logs are not available). */
function getKnownErrorMessage(code: number): string | null {
  const messages: Record<number, string> = {
    6000: "Unauthorized",
    6001: "Program is paused",
    6002: "Minter has exceeded their allowed quota",
    6003: "Minter is inactive",
  };
  return messages[code] ?? null;
}
