import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from "@/lookup/env";
import { normalizePath } from "@/lookup/redirects";

// Small in-memory caches for data the proxy needs on every matched request. Each server instance refreshes at
// most once per TTL, reads with the anon key (RLS applies) and fails open when Supabase is unreachable.

type Entry<T> = { loadedAt: number; value: T; ok: boolean };

async function restGet(path: string): Promise<unknown[]> {
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    headers: { apikey: supabaseAnonKey },
    cache: "no-store",
    signal: AbortSignal.timeout(1500),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return (await response.json()) as unknown[];
}

function cachedLoader<T>(label: string, path: string, transform: (rows: unknown[]) => T, empty: T) {
  let entry: Entry<T> | null = null;
  let pending: Promise<Entry<T>> | null = null;

  async function refresh(): Promise<Entry<T>> {
    pending ??= restGet(path)
      .then((rows) => ({ loadedAt: Date.now(), value: transform(rows), ok: true }))
      .catch((error: Error) => {
        console.warn(`[proxy] ${label} unavailable:`, error.message);
        return { loadedAt: Date.now(), value: entry?.value ?? empty, ok: false };
      })
      .finally(() => {
        pending = null;
      });
    const current = pending;
    entry = await current;
    return entry;
  }

  return {
    async get(maxAgeMs: number): Promise<Entry<T>> {
      if (entry && Date.now() - entry.loadedAt < maxAgeMs) return entry;
      return refresh();
    },
  };
}

type ActiveRedirect = { destination: string; statusCode: 301 | 302 };

const redirects = cachedLoader(
  "redirects",
  "redirects?select=source_path,destination,status_code&active=eq.true",
  (rows) => {
    const map = new Map<string, ActiveRedirect>();
    for (const row of rows as { source_path: string; destination: string; status_code: number }[]) {
      map.set(normalizePath(row.source_path), { destination: row.destination, statusCode: row.status_code === 302 ? 302 : 301 });
    }
    return map;
  },
  new Map<string, ActiveRedirect>(),
);

const publishedSlugs = cachedLoader(
  "published posts",
  "posts?select=slug&status=eq.published",
  (rows) => new Set((rows as { slug: string }[]).map((row) => row.slug)),
  new Set<string>(),
);

export async function findRedirect(pathname: string): Promise<ActiveRedirect | null> {
  if (!isSupabaseConfigured) return null;
  const { value } = await redirects.get(60_000);
  return value.get(normalizePath(pathname)) ?? null;
}

/**
 * true/false when the published slug list is known; null when it cannot be determined (fail open).
 * A miss re-checks once if the list is older than 2 seconds, so a just-published post is found immediately.
 */
export async function isPublishedSlug(slug: string): Promise<boolean | null> {
  if (!isSupabaseConfigured) return null;
  let entry = await publishedSlugs.get(60_000);
  if (!entry.value.has(slug) && Date.now() - entry.loadedAt > 2000) entry = await publishedSlugs.get(0);
  if (!entry.ok) return null;
  return entry.value.has(slug);
}
