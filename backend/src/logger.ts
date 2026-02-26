/**
 * Structured JSON logger. Writes one JSON object per line to stdout.
 * No external dependency; uses JSON.stringify + process.stdout.write.
 */
export type LogLevel = "info" | "warn" | "error";

export interface LogContext {
  requestId?: string;
  [key: string]: unknown;
}

function writeLine(level: LogLevel, msg: string, context?: LogContext): void {
  const payload: Record<string, unknown> = {
    time: new Date().toISOString(),
    level,
    msg,
    ...context,
  };
  process.stdout.write(JSON.stringify(payload) + "\n");
}

export function createLogger(requestId?: string) {
  const base: LogContext = requestId ? { requestId } : {};
  return {
    info(msg: string, ctx?: LogContext): void {
      writeLine("info", msg, { ...base, ...ctx });
    },
    warn(msg: string, ctx?: LogContext): void {
      writeLine("warn", msg, { ...base, ...ctx });
    },
    error(msg: string, ctx?: LogContext): void {
      writeLine("error", msg, { ...base, ...ctx });
    },
  };
}

/** Default logger without requestId (e.g. startup, background). */
export const log = createLogger();
