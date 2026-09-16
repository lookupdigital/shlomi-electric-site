import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { isProductionSite } from "@/lookup/runtime";
import { createServiceClient } from "@/lookup/supabase/service";
import { siteConfig } from "@/site.config";

// Server-side abuse protection for the public lead endpoint: rate limiting (always on when Supabase is
// configured) and Cloudflare Turnstile verification (on when TURNSTILE_SECRET_KEY is set).

export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return headers.get("x-real-ip")?.trim() || "unknown";
}

/** Hashed so the rate-limit table never stores IP addresses. */
export function rateLimitBucket(ip: string, secret: string): string {
  return `lead:${createHmac("sha256", secret).update(ip).digest("base64url").slice(0, 32)}`;
}

export type RateLimitResult = "allowed" | "limited" | "unavailable";

export async function consumeLeadRateLimit(ip: string): Promise<RateLimitResult> {
  const secret = process.env.LEAD_RATE_LIMIT_SALT || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) return "unavailable";
  const { maxSubmissions, windowSeconds } = siteConfig.leads.rateLimit;
  try {
    const { data, error } = await createServiceClient().rpc("lead_rate_limit_consume", {
      p_bucket: rateLimitBucket(ip, secret),
      p_limit: maxSubmissions,
      p_window_seconds: windowSeconds,
    });
    if (error) {
      console.error("[leads] rate limit unavailable:", error.code, error.message);
      return "unavailable";
    }
    return data === true ? "allowed" : "limited";
  } catch (error) {
    console.error("[leads] rate limit unavailable:", (error as Error).message);
    return "unavailable";
  }
}

export function isTurnstileEnabled(): boolean {
  return Boolean(process.env.TURNSTILE_SECRET_KEY);
}

export type TurnstileResult = "passed" | "failed" | "unavailable";

/** A rejected token fails; a Cloudflare outage is reported as "unavailable" so real leads are not lost. */
export async function verifyTurnstile(token: string | undefined, ip: string): Promise<TurnstileResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return "passed";
  if (!token) return "failed";
  const body = new URLSearchParams({ secret, response: token });
  if (ip !== "unknown") body.set("remoteip", ip);
  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body,
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return "unavailable";
    const result = (await response.json()) as { success?: boolean };
    return result.success === true ? "passed" : "failed";
  } catch (error) {
    console.error("[leads] turnstile verification unavailable:", (error as Error).message);
    return "unavailable";
  }
}

/** Automated test submissions carry the server-side E2E_TEST_TOKEN. */
export function isAuthorizedTestSubmission(token: string | undefined): boolean {
  const expected = process.env.E2E_TEST_TOKEN;
  if (!expected || !token || expected.length < 16) return false;
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Every lead stored outside production (Vercel Preview, local) is a test lead, as is every automated E2E submission.
 * All environments share one Supabase project, so this keeps Preview leads out of the real lead list and counts.
 */
export function isTestLead(isE2eSubmission: boolean, env: Record<string, string | undefined> = process.env): boolean {
  return isE2eSubmission || !isProductionSite(env);
}
