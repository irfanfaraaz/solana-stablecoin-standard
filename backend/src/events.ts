/**
 * Event store and indexer for stablecoin program transactions.
 * Persists to a JSON file; optional polling of program account for new signatures.
 */
import * as fs from "fs";
import * as path from "path";
import { Connection, PublicKey } from "@solana/web3.js";

export interface IndexedEvent {
  signature: string;
  slot: number;
  blockTime?: number;
  mint?: string;
  eventType?: string;
}

const DEFAULT_EVENTS_FILE = "data/events.json";
const MAX_EVENTS_IN_MEMORY = 50000;

let events: IndexedEvent[] = [];
let eventsFilePath: string | null = null;
let lastSeenSignature: string | null = null;

function getEventsPath(): string {
  if (eventsFilePath) return eventsFilePath;
  const base = process.env.DATA_DIR || process.env.WORKSPACE_ROOT || process.cwd();
  eventsFilePath = path.join(base, DEFAULT_EVENTS_FILE);
  return eventsFilePath;
}

function ensureDataDir(): void {
  const p = getEventsPath();
  const dir = path.dirname(p);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function loadEvents(): IndexedEvent[] {
  try {
    ensureDataDir();
    const p = getEventsPath();
    if (fs.existsSync(p)) {
      const raw = fs.readFileSync(p, "utf-8");
      events = JSON.parse(raw) as IndexedEvent[];
      if (!Array.isArray(events)) events = [];
    }
  } catch (_) {
    events = [];
  }
  if (events.length > 0) lastSeenSignature = events[0].signature;
  return events;
}

function persistEvents(): void {
  try {
    ensureDataDir();
    fs.writeFileSync(getEventsPath(), JSON.stringify(events, null, 0), "utf-8");
  } catch (e) {
    console.error("events: persist failed", e);
  }
}

export function appendEvent(ev: IndexedEvent): void {
  events.unshift(ev);
  if (events.length > MAX_EVENTS_IN_MEMORY) events.pop();
  persistEvents();
}

export function getEvents(opts: { mint?: string; limit?: number; before?: string }): IndexedEvent[] {
  let out = events;
  if (opts.mint) {
    out = out.filter((e) => e.mint === opts.mint);
  }
  if (opts.before) {
    const idx = out.findIndex((e) => e.signature === opts.before);
    if (idx >= 0) out = out.slice(idx + 1);
    else out = out.filter((e) => e.signature < opts.before!);
  }
  const limit = Math.min(opts.limit ?? 50, 200);
  return out.slice(0, limit);
}

function inferMintFromTx(accountKeys: string[], logMessages: string[]): string | undefined {
  const configPrefix = "config";
  for (const msg of logMessages) {
    const m = msg.match(/Program data: (\w+)/);
    if (m) continue;
    if (msg.includes("initialize") || msg.includes("mint") || msg.includes("Mint")) {
      if (accountKeys.length >= 2) return accountKeys[1];
    }
  }
  return undefined;
}

export function startIndexer(
  connection: Connection,
  programId: PublicKey,
  pollIntervalMs: number = 8000
): () => void {
  loadEvents();
  let cancelled = false;

  async function poll() {
    if (cancelled) return;
    try {
      const opts: { limit: number; before?: string } = { limit: 20 };
      if (lastSeenSignature) opts.before = lastSeenSignature;
      const sigs = await connection.getSignaturesForAddress(programId, opts);
      for (let i = sigs.length - 1; i >= 0; i--) {
        const s = sigs[i];
        if (lastSeenSignature && s.signature === lastSeenSignature) continue;
        let mint: string | undefined;
        let eventType = "transaction";
        try {
          const tx = await connection.getParsedTransaction(s.signature, {
            maxSupportedTransactionVersion: 0,
          });
          if (tx?.meta?.logMessages) {
            const accountKeys = (tx.transaction as any).message?.accountKeys?.map((k: any) =>
              typeof k === "string" ? k : k.pubkey?.toBase58?.() ?? k.toString()
            ) ?? [];
            const keys = accountKeys.length ? accountKeys : (tx.transaction as any).message?.accountKeys ?? [];
            const keyStrs = Array.isArray(keys) ? keys.map((k: any) => (typeof k === "string" ? k : k?.toBase58?.() ?? String(k))) : [];
            mint = inferMintFromTx(keyStrs, tx.meta.logMessages);
            if (tx.meta.logMessages.some((l) => l.includes("Instruction: Mint"))) eventType = "mint";
            else if (tx.meta.logMessages.some((l) => l.includes("Instruction: Burn"))) eventType = "burn";
            else if (tx.meta.logMessages.some((l) => l.includes("Instruction: AddToBlacklist"))) eventType = "blacklist_add";
            else if (tx.meta.logMessages.some((l) => l.includes("Instruction: RemoveFromBlacklist"))) eventType = "blacklist_remove";
            else if (tx.meta.logMessages.some((l) => l.includes("Seize"))) eventType = "seize";
          }
        } catch (_) {}
        const ev: IndexedEvent = {
          signature: s.signature,
          slot: s.slot,
          blockTime: s.blockTime ?? undefined,
          mint,
          eventType,
        };
        appendEvent(ev);
        lastSeenSignature = s.signature;
      }
      if (sigs.length > 0 && !lastSeenSignature) lastSeenSignature = sigs[0].signature;
    } catch (e) {
      console.error("indexer poll error", e);
    }
    if (!cancelled) setTimeout(poll, pollIntervalMs);
  }

  poll();
  return () => {
    cancelled = true;
  };
}
