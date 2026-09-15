// Marketing attribution: captured on landing, persisted in first-party localStorage, sent with lead forms.

export const ATTRIBUTION_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "gclid",
  "gbraid",
  "wbraid",
  "fbclid",
  "ttclid",
] as const;

export type AttributionKey = (typeof ATTRIBUTION_KEYS)[number];

export type Attribution = Partial<Record<AttributionKey, string>> & {
  landing_page?: string;
  referrer?: string;
  captured_at: number;
};

export const ATTRIBUTION_STORAGE_KEY = "lookup_attribution";
export const ATTRIBUTION_TTL_MS = 90 * 24 * 60 * 60 * 1000;

export function readMarketingParams(search: string): Partial<Record<AttributionKey, string>> {
  const params = new URLSearchParams(search);
  const result: Partial<Record<AttributionKey, string>> = {};
  for (const key of ATTRIBUTION_KEYS) {
    const value = params.get(key)?.trim();
    if (value) result[key] = value.slice(0, 255);
  }
  return result;
}

/** Keeps only external referrers, without query strings (which can carry personal data). */
export function externalReferrer(referrer: string, currentHost: string): string | undefined {
  if (!referrer) return undefined;
  try {
    const url = new URL(referrer);
    if (url.host === currentHost) return undefined;
    return `${url.origin}${url.pathname}`.slice(0, 500);
  } catch {
    return undefined;
  }
}

const hasCampaignData = (attribution: Attribution) => ATTRIBUTION_KEYS.some((key) => attribution[key]);

/**
 * Decides what to store for a page load. Returns null when the stored touch should be kept.
 * - A visit with marketing parameters always replaces the stored touch (last campaign touch wins).
 * - A referral or direct visit never overwrites a stored campaign touch.
 */
export function nextAttribution(
  stored: Attribution | null,
  visit: { search: string; pathname: string; referrer: string; host: string; now: number },
): Attribution | null {
  const current = stored && visit.now - stored.captured_at < ATTRIBUTION_TTL_MS ? stored : null;
  const params = readMarketingParams(visit.search);
  const referrer = externalReferrer(visit.referrer, visit.host);
  const touch: Attribution = { ...params, landing_page: visit.pathname, referrer, captured_at: visit.now };

  if (Object.keys(params).length > 0) return touch;
  if (!current) return touch;
  if (referrer && !hasCampaignData(current)) return touch;
  return null;
}

function readStored(): Attribution | null {
  const raw = window.localStorage.getItem(ATTRIBUTION_STORAGE_KEY);
  if (!raw) return null;
  const parsed = JSON.parse(raw) as Attribution;
  return typeof parsed?.captured_at === "number" ? parsed : null;
}

let capturedThisPageLoad = false;

/** Call once per full page load (client navigations keep the original document.referrer). */
export function captureAttribution() {
  if (capturedThisPageLoad) return;
  capturedThisPageLoad = true;
  try {
    const next = nextAttribution(readStored(), {
      search: window.location.search,
      pathname: window.location.pathname,
      referrer: document.referrer,
      host: window.location.host,
      now: Date.now(),
    });
    if (next) window.localStorage.setItem(ATTRIBUTION_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage can be unavailable (private mode, blocked site data) — attribution is best-effort.
  }
}

export function getStoredAttribution(): Attribution | null {
  try {
    const stored = readStored();
    return stored && Date.now() - stored.captured_at < ATTRIBUTION_TTL_MS ? stored : null;
  } catch {
    return null;
  }
}
