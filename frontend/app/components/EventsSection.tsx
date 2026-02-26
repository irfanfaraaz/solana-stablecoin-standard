"use client";

import { useState, useEffect, useCallback } from "react";
import { useMint } from "../context/mint-context";
import { getBackendBaseUrl, apiGet } from "../lib/api";

type EventItem = { signature: string; slot?: number; blockTime?: number; mint?: string; eventType?: string };

export function EventsSection() {
  const { mintAddress } = useMint();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [before, setBefore] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const baseUrl = getBackendBaseUrl();

  const loadEvents = useCallback(async (cursor?: string) => {
    if (!baseUrl) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: "20" });
      if (mintAddress && mintAddress.length >= 32) params.set("mint", mintAddress);
      if (cursor) params.set("before", cursor);
      const res = await apiGet<{ events: EventItem[] }>(`/events?${params.toString()}`);
      const list = res.events ?? [];
      if (cursor) setEvents((prev) => [...prev, ...list]);
      else setEvents(list);
      setBefore(list.length > 0 ? list[list.length - 1].signature : undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [baseUrl, mintAddress]);

  useEffect(() => {
    if (baseUrl) loadEvents();
  }, [baseUrl, mintAddress]);

  if (!baseUrl) {
    return (
      <div className="space-y-4 rounded-2xl border border-border-low bg-card p-4 sm:p-6">
        <p className="font-semibold">Events</p>
        <p className="text-sm text-muted">
          Set <code className="font-mono">NEXT_PUBLIC_BACKEND_URL</code> to view indexed events.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-2xl border border-border-low bg-card p-4 sm:p-6">
      <p className="font-semibold">Events</p>
      <p className="text-sm text-muted">
        Recent indexed transactions{mintAddress ? " for this mint" : ""}.
      </p>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="overflow-x-auto">
        <ul className="space-y-2 text-sm">
          {events.length === 0 && !loading && <li className="text-muted">No events</li>}
          {events.map((ev, i) => (
            <li key={i} className="flex flex-wrap items-center gap-2 border-b border-border-low py-2">
              <span className="font-mono text-xs break-all">{ev.signature}</span>
              {ev.slot != null && <span className="text-muted">slot {ev.slot}</span>}
              {ev.eventType && <span className="text-muted">{ev.eventType}</span>}
            </li>
          ))}
        </ul>
      </div>
      {events.length > 0 && (
        <button
          type="button"
          onClick={() => before && loadEvents(before)}
          disabled={loading}
          className="min-h-[44px] cursor-pointer rounded-lg border border-border-low bg-cream px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Loading…" : "Load more"}
        </button>
      )}
    </div>
  );
}
