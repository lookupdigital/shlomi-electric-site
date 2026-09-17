import type { CookieOptions } from "@supabase/ssr";
import { siteConfig } from "@/site.config";

export const ADMIN_COOKIE_PATH = "/admin";

/**
 * Cookie name for admin sessions. It differs from Supabase's default (sb-<ref>-auth-token) so cookies set by
 * older versions — path "/", readable by JavaScript — are never reused and can be deleted by name.
 */
export const ADMIN_AUTH_COOKIE = "lookup-admin-auth";

/**
 * Admin auth cookies are:
 * - HttpOnly: page JavaScript (including any GTM tag on the public site) cannot read the session tokens;
 * - scoped to /admin: never sent with public page, asset or API requests;
 * - short-lived: see withAdminLifetime.
 * Server-side validation is unchanged: every admin page and action still calls supabase.auth.getUser().
 */
export const adminCookieOptions = {
  path: ADMIN_COOKIE_PATH,
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
};

/** @supabase/ssr always sets a 400-day max-age; cap it to the configured admin session length (removals keep 0). */
export function withAdminLifetime(options: CookieOptions): CookieOptions {
  return {
    ...options,
    ...adminCookieOptions,
    maxAge: options.maxAge === 0 ? 0 : siteConfig.admin.sessionMaxAgeSeconds,
  };
}

/** Supabase auth cookie names (sb-<project-ref>-auth-token and its chunks). */
export function isSupabaseAuthCookie(name: string): boolean {
  return /^sb-[a-z0-9]+-auth-token(\.\d+)?$/.test(name);
}
