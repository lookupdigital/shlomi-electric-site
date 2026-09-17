// Deployment environment detection without assuming a hosting provider.
// Imported by next.config.ts, so this file must not use path aliases or server-only modules.

export type SiteEnvironment = "production" | "preview" | "development";

type Env = Record<string, string | undefined>;

/**
 * LOOKUP_SITE_ENV (any host) takes precedence; VERCEL_ENV is used when running on Vercel.
 * Anything else is "development", which is never indexable and never loads GTM.
 */
export function getSiteEnvironment(env: Env = process.env): SiteEnvironment {
  const value = env.LOOKUP_SITE_ENV || env.VERCEL_ENV;
  return value === "production" || value === "preview" ? value : "development";
}

export function isProductionSite(env: Env = process.env): boolean {
  return getSiteEnvironment(env) === "production";
}

/** GTM loads on production, or anywhere with LOOKUP_GTM_DEBUG=1 (to test a container on a preview). */
export function isGtmAllowed(env: Env = process.env): boolean {
  return isProductionSite(env) || env.LOOKUP_GTM_DEBUG === "1";
}
