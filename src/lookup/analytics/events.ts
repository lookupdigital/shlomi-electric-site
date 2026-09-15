// The single tracking layer: typed events → PII guard → window.dataLayer → Google Tag Manager.
// See docs/gtm-container-contract.md for how the container must consume these events.
import { ATTRIBUTION_KEYS } from "@/lookup/attribution";

export type ContactLinkEvent = "phone_click" | "whatsapp_click" | "email_click";

export type AnalyticsEvent =
  | { event: "page_view"; page_path: string; page_location: string }
  | { event: "form_start"; form_name: string; page_path: string }
  | { event: "generate_lead"; form_name: string; page_path: string; lead_type: string; event_id: string }
  | {
      event: "form_submit_error";
      form_name: string;
      page_path: string;
      error_type: "validation" | "server" | "network" | "rate_limited" | "verification";
    }
  | { event: ContactLinkEvent; page_path: string; link_location: string; cta_name?: string }
  | { event: "cta_click"; page_path: string; cta_name: string; link_location: string };

type DataLayerEntry = Record<string, unknown> | IArguments;

declare global {
  interface Window {
    dataLayer?: DataLayerEntry[];
    gtag?: (...args: unknown[]) => void;
    lookupConsent?: { update: (state: Partial<Record<ConsentType, ConsentValue>>) => void };
  }
}

const ALLOWED_PARAMS = new Set([
  "event",
  "event_id",
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

const WHATSAPP_LINK = /^(https?:\/\/(wa\.me|api\.whatsapp\.com|web\.whatsapp\.com)\/|whatsapp:)/i;

/**
 * One click produces at most ONE event:
 * - phone / email / WhatsApp links → the contact event (with cta_name when the element is also a tracked CTA);
 * - any other element marked data-track-cta → cta_click.
 */
export function classifyClick(href: string | null, ctaName: string | null):
  | { event: ContactLinkEvent; ctaName?: string }
  | { event: "cta_click"; ctaName: string }
  | null {
  const link = href ?? "";
  const contactEvent: ContactLinkEvent | null = link.startsWith("tel:")
    ? "phone_click"
    : link.startsWith("mailto:")
      ? "email_click"
      : WHATSAPP_LINK.test(link)
        ? "whatsapp_click"
        : null;
  if (contactEvent) return ctaName ? { event: contactEvent, ctaName } : { event: contactEvent };
  return ctaName ? { event: "cta_click", ctaName } : null;
}

function dataLayer(): DataLayerEntry[] {
  return (window.dataLayer ??= []);
}

export function track(event: AnalyticsEvent) {
  if (typeof window === "undefined") return;
  dataLayer().push(sanitizeEvent(event));
}

// Consent Mode v2 --------------------------------------------------------------------------------------

export type ConsentValue = "granted" | "denied";
export type ConsentType = "ad_storage" | "ad_user_data" | "ad_personalization" | "analytics_storage";

function gtag(...args: unknown[]) {
  // gtag() commands must be pushed as an Arguments object, exactly like Google's snippet.
  void args;
  // eslint-disable-next-line prefer-rest-params
  dataLayer().push(arguments);
}

let consentInitialized = false;

/**
 * Pushes the Consent Mode default BEFORE any other dataLayer event and before GTM loads, and exposes
 * window.lookupConsent.update() for a future consent banner / CMP.
 */
export function initializeConsent(defaultValue: ConsentValue) {
  if (typeof window === "undefined" || consentInitialized) return;
  consentInitialized = true;
  window.gtag ??= gtag;
  gtag("consent", "default", {
    ad_storage: defaultValue,
    ad_user_data: defaultValue,
    ad_personalization: defaultValue,
    analytics_storage: defaultValue,
    functionality_storage: "granted",
    security_storage: "granted",
    wait_for_update: 500,
  });
  window.lookupConsent = { update: (state) => gtag("consent", "update", state) };
}

let configPushed = false;

/** Public tracking IDs from site settings, exposed to GTM as dataLayer variables (event "lookup_config"). */
export function pushTrackingConfig(config: Record<string, string>) {
  if (typeof window === "undefined" || configPushed) return;
  configPushed = true;
  const payload: Record<string, string> = { event: "lookup_config" };
  for (const [key, value] of Object.entries(config)) if (value) payload[key] = value;
  dataLayer().push(payload);
}
