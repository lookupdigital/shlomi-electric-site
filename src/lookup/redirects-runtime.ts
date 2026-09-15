import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from "@/lookup/env";
import { normalizePath } from "@/lookup/redirects";

type ActiveRedirect = { destination: string; statusCode: 301 | 302 };

const TTL_MS = 60_000;
const RETRY_AFTER_FAILURE_MS = 10_000;
let cache: { expiresAt: number; rules: Map<string, ActiveRedirect> } | null = null;

/** Active redirects, cached in memory per server instance for 60 seconds. Fails open (no redirects). */
async function loadActiveRedirects(): Promise<Map<string, ActiveRedirect>> {
  if (cache && cache.expiresAt > Date.now()) return cache.rules;
  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/redirects?select=source_path,destination,status_code&active=eq.true`,
      { headers: { apikey: supabaseAnonKey }, cache: "no-store", signal: AbortSignal.timeout(1500) },
    );
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const rows = (await response.json()) as { source_path: string; destination: string; status_code: number }[];
    const rules = new Map<string, ActiveRedirect>();
    for (const row of rows) {
      rules.set(normalizePath(row.source_path), {
        destination: row.destination,
        statusCode: row.status_code === 302 ? 302 : 301,
      });
    }
    cache = { expiresAt: Date.now() + TTL_MS, rules };
  } catch (error) {
    console.warn("[redirects] lookup unavailable:", (error as Error).message);
    cache = { expiresAt: Date.now() + RETRY_AFTER_FAILURE_MS, rules: cache?.rules ?? new Map() };
  }
  return cache.rules;
}

export async function findRedirect(pathname: string): Promise<ActiveRedirect | null> {
  if (!isSupabaseConfigured) return null;
  const rules = await loadActiveRedirects();
  return rules.get(normalizePath(pathname)) ?? null;
}
