"use client";

import { useState, useEffect } from "react";
import { getBackendBaseUrl, apiGet, apiGetBlob } from "../lib/api";

type AuditEvent = { time: string; event: string; payload: Record<string, unknown> };

export function AuditSection() {
  const [events, setEvents] = useState<AuditEvent[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<"csv" | "json" | null>(null);

  const baseUrl = getBackendBaseUrl();

  const loadAudit = async () => {
    if (!baseUrl) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet<{ events: AuditEvent[] }>("/audit");
      setEvents(res.events ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (baseUrl) loadAudit();
  }, [baseUrl]);

  const handleExport = async (format: "csv" | "json") => {
    if (!baseUrl) return;
    setExporting(format);
    setError(null);
    try {
      const blob = await apiGetBlob(`/audit/export?format=${format}`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audit-${new Date().toISOString().slice(0, 19).replace(/[:.]/g, "-")}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setExporting(null);
    }
  };

  if (!baseUrl) {
    return (
      <div className="space-y-4 rounded-2xl border border-border-low bg-card p-4 sm:p-6">
        <p className="font-semibold">Audit log</p>
        <p className="text-sm text-muted">
          Set <code className="font-mono">NEXT_PUBLIC_BACKEND_URL</code> to view or export the audit log.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-2xl border border-border-low bg-card p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold">Audit log</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={loadAudit}
            disabled={loading}
            className="min-h-[44px] cursor-pointer rounded-lg border border-border-low bg-cream px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Loading…" : "Refresh"}
          </button>
          <button
            type="button"
            onClick={() => handleExport("csv")}
            disabled={!!exporting}
            className="min-h-[44px] cursor-pointer rounded-lg border border-border-low bg-cream px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60"
          >
            {exporting === "csv" ? "Exporting…" : "Export CSV"}
          </button>
          <button
            type="button"
            onClick={() => handleExport("json")}
            disabled={!!exporting}
            className="min-h-[44px] cursor-pointer rounded-lg border border-border-low bg-cream px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60"
          >
            {exporting === "json" ? "Exporting…" : "Export JSON"}
          </button>
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {events != null && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[400px] text-left text-sm">
            <thead>
              <tr className="border-b border-border-low">
                <th className="py-2 pr-2 font-medium text-muted">Time</th>
                <th className="py-2 pr-2 font-medium text-muted">Event</th>
                <th className="py-2 font-medium text-muted">Payload</th>
              </tr>
            </thead>
            <tbody>
              {events.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-4 text-muted">
                    No events
                  </td>
                </tr>
              ) : (
                events.slice(0, 50).map((ev, i) => (
                  <tr key={i} className="border-b border-border-low">
                    <td className="py-2 pr-2 font-mono text-xs">{ev.time}</td>
                    <td className="py-2 pr-2">{ev.event}</td>
                    <td className="py-2 font-mono text-xs text-muted">
                      {JSON.stringify(ev.payload).slice(0, 80)}
                      {(JSON.stringify(ev.payload).length > 80) ? "…" : ""}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
