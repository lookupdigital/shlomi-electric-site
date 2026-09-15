// The single tracking layer: typed events → PII guard → window.dataLayer → Google Tag Manager.
import { ATTRIBUTION_KEYS } from "@/lookup/attribution";

export type AnalyticsEvent =
  | { event: "page_view"; page_path: string; page_location: string }
  | { event: "form_start"; form_name: string; page_path: string }
  | { event: "generate_lead"; form_name: string; page_path: string; lead_type: string }
  | { event: "form_submit_error"; form_name: string; page_path: string; error_type: "validation" | "server" | "network" }
  | { event: "phone_click" | "whatsapp_click" | "email_click"; page_path: string; link_location: string }
  | { event: "cta_click"; page_path: string; cta_name: string; link_location: string };

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

const ALLOWED_PARAMS = new Set([
  "event",
  "page_path",
  "page_location",
  "form_name",
  "lead_type",
  "error_type",
  "link_location",
  "cta_name",
]);
const EMAIL_PATTERN = /[^\s@]+@[^\s@]+\.[^\s@]+/;
const PHONE_PATTERN = /\+?\d[\d\s-]{7,}\d/;
const LABEL_PARAMS = new Set(["form_name", "lead_type", "error_type", "link_location", "cta_name"]);

/** Drops unknown keys and anything that looks like an email address or phone number. */
export function sanitizeEvent(event: AnalyticsEvent): Record<string, string> {
  const safe: Record<string, string> = {};
  for (const [key, value] of Object.entries(event)) {
    if (!ALLOWED_PARAMS.has(key) || typeof value !== "string") continue;
    const trimmed = value.slice(0, 300);
    if (EMAIL_PATTERN.test(trimmed)) continue;
    if (LABEL_PARAMS.has(key) && PHONE_PATTERN.test(trimmed)) continue;
    safe[key] = trimmed;
  }
  return safe;
}

const LOCATION_PARAMS = new Set<string>(ATTRIBUTION_KEYS);

/** Page URL keeping only campaign parameters (other query params may contain personal data). */
export function sanitizeLocation(href: string): string {
  try {
    const url = new URL(href);
    const kept = new URLSearchParams();
    url.searchParams.forEach((value, key) => {
      if (LOCATION_PARAMS.has(key)) kept.set(key, value);
    });
    const query = kept.toString();
    return `${url.origin}${url.pathname}${query ? `?${query}` : ""}`;
  } catch {
    return "";
  }
}

export function track(event: AnalyticsEvent) {
  if (typeof window === "undefined") return;
  (window.dataLayer ??= []).push(sanitizeEvent(event));
}

let configPushed = false;

/** Public tracking IDs from site settings, exposed to GTM as dataLayer variables (event "lookup_config"). */
export function pushTrackingConfig(config: Record<string, string>) {
  if (typeof window === "undefined" || configPushed) return;
  configPushed = true;
  const payload: Record<string, string> = { event: "lookup_config" };
  for (const [key, value] of Object.entries(config)) if (value) payload[key] = value;
  (window.dataLayer ??= []).push(payload);
}
