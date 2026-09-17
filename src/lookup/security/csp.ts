// Content-Security-Policy builders. Imported by next.config.ts: keep this file free of path aliases.
//
// Both policies allow 'unsafe-inline' scripts because prerendered (static) Next.js pages embed inline
// bootstrap scripts and cannot use per-request nonces. The value of these policies is in what they
// restrict: no plugins, no <base> hijacking, no framing, form posts only to this origin, and — for the
// admin — no third-party script, connection or frame origins at all.

/** Origins used by Google Tag Manager and the tags it commonly loads (GA4, Google Ads, Meta, TikTok, LinkedIn). */
export const TRACKING_ORIGINS = {
  script: [
    "https://www.googletagmanager.com",
    "https://*.googletagmanager.com",
    "https://*.google-analytics.com",
    "https://www.googleadservices.com",
    "https://googleads.g.doubleclick.net",
    "https://*.google.com",
    "https://connect.facebook.net",
    "https://analytics.tiktok.com",
    "https://snap.licdn.com",
  ],
  connect: [
    "https://*.google-analytics.com",
    "https://*.analytics.google.com",
    "https://*.googletagmanager.com",
    "https://*.g.doubleclick.net",
    "https://*.google.com",
    "https://www.facebook.com",
    "https://connect.facebook.net",
    "https://analytics.tiktok.com",
    "https://*.tiktokw.us",
    "https://px.ads.linkedin.com",
  ],
  frame: ["https://www.googletagmanager.com", "https://*.doubleclick.net", "https://www.facebook.com"],
  style: ["https://www.googletagmanager.com", "https://fonts.googleapis.com"],
  font: ["https://fonts.gstatic.com"],
};

export const TURNSTILE_ORIGIN = "https://challenges.cloudflare.com";

type CspOptions = { development: boolean; supabaseOrigin: string };

function serialize(directives: Record<string, string[]>): string {
  return Object.entries(directives)
    .map(([name, values]) => `${name} ${values.join(" ")}`)
    .join("; ");
}

export function supabaseOriginFrom(url: string | undefined): string {
  try {
    return url ? new URL(url).origin : "https://*.supabase.co";
  } catch {
    return "https://*.supabase.co";
  }
}

/** Public site: allows GTM-managed tags and Cloudflare Turnstile. */
export function buildPublicCsp({ development, supabaseOrigin }: CspOptions): string {
  return serialize({
    "default-src": ["'self'"],
    "script-src": ["'self'", "'unsafe-inline'", ...(development ? ["'unsafe-eval'"] : []), TURNSTILE_ORIGIN, ...TRACKING_ORIGINS.script],
    "style-src": ["'self'", "'unsafe-inline'", ...TRACKING_ORIGINS.style],
    // Tracking pixels are image requests to many hosts; images cannot execute code.
    "img-src": ["'self'", "data:", "blob:", "https:"],
    "font-src": ["'self'", "data:", ...TRACKING_ORIGINS.font],
    "connect-src": ["'self'", supabaseOrigin, TURNSTILE_ORIGIN, ...TRACKING_ORIGINS.connect, ...(development ? ["ws:"] : [])],
    "frame-src": [TURNSTILE_ORIGIN, ...TRACKING_ORIGINS.frame],
    "worker-src": ["'self'", "blob:"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'self'"],
  });
}

/** Admin: first-party only. No third-party scripts can load, connect or frame. */
export function buildAdminCsp({ development, supabaseOrigin }: CspOptions): string {
  return serialize({
    "default-src": ["'self'"],
    "script-src": ["'self'", "'unsafe-inline'", ...(development ? ["'unsafe-eval'"] : [])],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:", supabaseOrigin],
    "font-src": ["'self'"],
    "connect-src": ["'self'", supabaseOrigin, ...(development ? ["ws:"] : [])],
    "frame-src": ["'none'"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
  });
}
