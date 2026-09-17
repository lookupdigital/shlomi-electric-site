// Cache keys for data read from Supabase with unstable_cache.
//
// The Next.js data cache survives rebuilds and (on Vercel) deployments. Including a per-build identifier in the key
// makes every build/deployment read fresh data — so changes made directly in the database (SQL, seeds) are picked up
// on the next deploy — while admin edits still invalidate immediately through cache tags.
// LOOKUP_BUILD_ID is set in next.config.ts at build time.
export const CACHE_BUILD_KEY = process.env.LOOKUP_BUILD_ID ?? "unversioned";
