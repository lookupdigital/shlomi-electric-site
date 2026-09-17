import "server-only";
import { unstable_cache } from "next/cache";
import { CACHE_BUILD_KEY } from "@/lookup/cache";
import { isProductionSite } from "@/lookup/runtime";
import { mergeSiteSettings, type SiteSettings, type SiteSettingsRow } from "@/lookup/settings-model";
import { createPublicClient } from "@/lookup/supabase/public";
import { siteConfig } from "@/site.config";

export const SITE_SETTINGS_TAG = "site-settings";

const readSettingsRow = unstable_cache(
  async (): Promise<SiteSettingsRow | null> => {
    const supabase = createPublicClient();
    if (!supabase) return null;
    const { data, error } = await supabase.from("site_settings").select("*").eq("id", 1).maybeSingle();
    // Throwing (instead of returning null) keeps a transient failure out of the cache.
    if (error) throw new Error(`site_settings: ${error.message}`);
    return data;
  },
  ["lookup-site-settings", CACHE_BUILD_KEY],
  { tags: [SITE_SETTINGS_TAG], revalidate: 3600 },
);

/** Site settings from Supabase. Never throws. */
export async function getSiteSettings(): Promise<SiteSettings> {
  let row: SiteSettingsRow | null = null;
  try {
    row = await readSettingsRow();
  } catch (error) {
    console.warn("[lookup] Site settings unavailable:", (error as Error).message);
  }
  const fallbackSiteUrl = process.env.LOOKUP_SITE_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL;
  return mergeSiteSettings(row, siteConfig, fallbackSiteUrl);
}

/** Indexable only in the production environment AND when an admin has enabled indexing. */
export function isIndexable(settings: SiteSettings): boolean {
  return isProductionSite() && settings.indexingEnabled;
}
