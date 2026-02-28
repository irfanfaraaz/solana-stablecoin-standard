/**
 * Backend API client. All backend-dependent features use this.
 * When NEXT_PUBLIC_BACKEND_URL is unset, getBackendBaseUrl() returns null and sections should hide or show disabled state.
 */

export function getBackendBaseUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_BACKEND_URL?.trim();
  return url || null;
}

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const apiKey = process.env.NEXT_PUBLIC_API_KEY?.trim();
  if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;
  return headers;
}

export async function apiGet<T = unknown>(path: string): Promise<T> {
  const base = getBackendBaseUrl();
  if (!base) throw new Error("NEXT_PUBLIC_BACKEND_URL is not set");
  const url = path.startsWith("http")
    ? path
    : `${base.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, { method: "GET", headers: getHeaders() });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      res.status === 403 ? text || "Forbidden" : text || `HTTP ${res.status}`
    );
  }
  return res.json() as Promise<T>;
}

export async function apiPost<T = unknown>(
  path: string,
  body: Record<string, unknown>
): Promise<T> {
  const base = getBackendBaseUrl();
  if (!base) throw new Error("NEXT_PUBLIC_BACKEND_URL is not set");
  const url = path.startsWith("http")
    ? path
    : `${base.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      res.status === 403 ? text || "Forbidden" : text || `HTTP ${res.status}`
    );
  }
  return res.json() as Promise<T>;
}

/** For export endpoints that return blob (e.g. CSV). */
export async function apiGetBlob(path: string): Promise<Blob> {
  const base = getBackendBaseUrl();
  if (!base) throw new Error("NEXT_PUBLIC_BACKEND_URL is not set");
  const url = path.startsWith("http")
    ? path
    : `${base.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, { method: "GET", headers: getHeaders() });
  if (!res.ok)
    throw new Error(await res.text().catch(() => `HTTP ${res.status}`));
  return res.blob();
}
