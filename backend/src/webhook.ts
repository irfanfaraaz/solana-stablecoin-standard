/**
 * Webhook dispatch with retry (exponential backoff) and optional secret.
 * Configure via WEBHOOK_URL (all events) or WEBHOOK_URL_<EVENT> per event type.
 */
import { log } from "./logger";

const RETRIES = 3;
const BACKOFF_MS = [1000, 2000, 4000];
const FETCH_TIMEOUT_MS = 10000;

export type WebhookEventType =
  | "mint"
  | "burn"
  | "freeze"
  | "thaw"
  | "blacklist_add"
  | "blacklist_remove"
  | "seize";

function getWebhookUrl(event: WebhookEventType): string | null {
  const upper = event.toUpperCase().replace(/-/g, "_");
  const perEvent = process.env[`WEBHOOK_URL_${upper}`];
  if (perEvent && perEvent.trim()) return perEvent.trim();
  const all = process.env.WEBHOOK_URL;
  if (all && all.trim()) return all.trim();
  return null;
}

export interface WebhookPayload {
  event: string;
  mint?: string;
  signature?: string;
  slot?: number;
  [key: string]: unknown;
}

export function dispatchWebhook(
  event: WebhookEventType,
  payload: WebhookPayload
): void {
  const url = getWebhookUrl(event);
  if (!url) return;
  const webhookUrl: string = url;

  const body = JSON.stringify({ ...payload, event });
  const secret = process.env.WEBHOOK_SECRET;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Idempotency-Key": payload.signature ?? `${Date.now()}-${event}`,
  };
  if (secret) headers["X-Webhook-Signature"] = secret;

  let attempt = 0;
  function doSend() {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    fetch(webhookUrl, {
      method: "POST",
      headers,
      body,
      signal: controller.signal,
    })
      .then((res) => {
        clearTimeout(timeoutId);
        if (res.ok) return;
        if (attempt < RETRIES && res.status >= 500) {
          attempt++;
          setTimeout(doSend, BACKOFF_MS[attempt - 1]);
        }
      })
      .catch(() => {
        clearTimeout(timeoutId);
        if (attempt < RETRIES) {
          attempt++;
          setTimeout(doSend, BACKOFF_MS[attempt - 1]);
        } else {
          log.error("Webhook delivery failed after retries", {
            event,
            url: webhookUrl,
          });
        }
      });
  }
  doSend();
}
