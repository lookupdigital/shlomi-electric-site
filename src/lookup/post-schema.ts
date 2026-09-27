// Compatibility with databases that do not have migration 8 (post social SEO) yet. Pure: no data access.
// Only the specific "unknown column" errors for the three v1.2 post columns are recognized; every other database
// error is left to the caller unchanged.

export const SOCIAL_SEO_COLUMNS = ["og_title", "og_description", "robots_follow"] as const;

type SocialSeoKey = (typeof SOCIAL_SEO_COLUMNS)[number];
type DbError = { code?: string; message?: string } | null | undefined;

/** PostgREST PGRST204 (unknown column in a write) or Postgres 42703 (undefined column in a read) naming a v1.2 column. */
export function isMissingSocialSeoColumn(error: DbError): boolean {
  if (!error || (error.code !== "PGRST204" && error.code !== "42703")) return false;
  const message = error.message ?? "";
  return SOCIAL_SEO_COLUMNS.some((column) => message.includes(column));
}

export type SocialSeoFields = { og_title?: string | null; og_description?: string | null; robots_follow?: boolean | null };

/** The record without the v1.2 columns, and whether dropping them loses nothing (all at their pre-v1.2 defaults). */
export function withoutSocialSeo<T extends SocialSeoFields>(record: T): { rest: Omit<T, SocialSeoKey>; atDefaults: boolean } {
  const { og_title: ogTitle, og_description: ogDescription, robots_follow: robotsFollow, ...rest } = record;
  return { rest, atDefaults: !ogTitle?.trim() && !ogDescription?.trim() && robotsFollow !== false };
}

/**
 * Runs a posts write. If the database lacks migration 8, the write is retried without the v1.2 columns — but only
 * when they hold their defaults, so nothing the admin entered is silently dropped. Otherwise "migrationRequired".
 */
export async function writeWithSocialSeoFallback<T extends SocialSeoFields, R extends { error: DbError }>(
  record: T,
  write: (values: T | Omit<T, SocialSeoKey>) => PromiseLike<R>,
): Promise<R | "migrationRequired"> {
  const result = await write(record);
  if (!isMissingSocialSeoColumn(result.error)) return result;
  const { rest, atDefaults } = withoutSocialSeo(record);
  return atDefaults ? write(rest) : "migrationRequired";
}
