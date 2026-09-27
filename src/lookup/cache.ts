// Cache keys for data read from Supabase with unstable_cache.
//
// The Next.js data cache survives rebuilds and (on Vercel) deployments. Including a per-build identifier in the key
// makes every build/deployment read fresh data — so changes made directly in the database (SQL, seeds) are picked up
// on the next deploy — while admin edits still invalidate immediately through cache tags.
// LOOKUP_BUILD_ID is set in next.config.ts at build time.
export const CACHE_BUILD_KEY = process.env.LOOKUP_BUILD_ID ?? "unversioned";

/** A cached value with the time it was read, so callers can refuse copies older than they accept. */
export type Snapshot<T> = { value: T; fetchedAt: number };

export async function takeSnapshot<T>(load: () => Promise<T>): Promise<Snapshot<T>> {
  return { value: await load(), fetchedAt: Date.now() };
}

/**
 * Returns the cached value while it is at most `maxAgeSeconds` old; an older copy is replaced by a direct read.
 * unstable_cache serves an expired entry once more while it refreshes in the background, so on a quiet site that copy
 * can be arbitrarily old. Data that changes with time alone (a scheduled post going live) must not wait for that.
 */
export async function freshValue<T>(
  cached: () => Promise<Snapshot<T>>,
  load: () => Promise<T>,
  maxAgeSeconds: number,
  now: () => number = Date.now,
): Promise<T> {
  const snapshot = await cached();
  if (now() - snapshot.fetchedAt <= maxAgeSeconds * 1000) return snapshot.value;
  return load();
}
