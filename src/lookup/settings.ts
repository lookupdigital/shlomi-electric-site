import "server-only";
import { unstable_cache } from "next/cache";
import { siteDefaults } from "@/lib/site";
import { mergeSiteSettings, type SiteSettings, type SiteSettingsRow } from "@/lookup/settings-model";
import { createPublicClient } from "@/lookup/supabase/public";

export const SITE_SETTINGS_TAG = "site-settings";

const readSettingsRow = unstable_cache(
  async (): Promise<SiteSettingsRow | null> => {
    const supabase = createPublicClient();
    if (!supabase) return null;
    const { data, error } = await supabase.from("site_settings").select("*").eq("id", 1).maybeSingle();
    // Throwing (instead of returning null) keeps a transient failure out of the cache.
    if (error) throw new Error(`site_settings: ${error.message}`);
    return data as SiteSettingsRow | null;
  },
  ["lookup-site-settings"],
  { tags: [SITE_SETTINGS_TAG], revalidate: 3600 },
);

/** Settings from Supabase merged over the client's code defaults. Never throws. */
export async function getSiteSettings(): Promise<SiteSettings> {
  let row: SiteSettingsRow | null = null;
  try {
    row = await readSettingsRow();
  } catch (error) {
    console.warn("[lookup] Using code defaults for site settings:", (error as Error).message);
  }
  return mergeSiteSettings(row, siteDefaults, process.env.VERCEL_PROJECT_PRODUCTION_URL);
}

/** Indexable only on the Vercel production deployment AND when an admin has enabled indexing. */
export function isIndexable(settings: SiteSettings): boolean {
  return process.env.VERCEL_ENV === "production" && settings.indexingEnabled;
}
