import "server-only";
import type { Metadata } from "next";
import { unstable_cache } from "next/cache";
import { CACHE_BUILD_KEY } from "@/lookup/cache";
import type { RouteEntry } from "@/lookup/config";
import { composeMetadata, pageSeoInput } from "@/lookup/seo-model";
import { getSiteSettings, isIndexable } from "@/lookup/settings";
import type { Database } from "@/lookup/supabase/database.types";
import { createPublicClient } from "@/lookup/supabase/public";
import { siteConfig } from "@/site.config";

export const PAGE_SEO_TAG = "page-seo";

export type PageSeoRow = Database["public"]["Tables"]["page_seo"]["Row"];

const readPageSeo = unstable_cache(
  async (): Promise<PageSeoRow[]> => {
    const supabase = createPublicClient();
    if (!supabase) return [];
    const { data, error } = await supabase.from("page_seo").select("*");
    if (error) throw new Error(`page_seo: ${error.message}`);
    return data ?? [];
  },
  ["lookup-page-seo", CACHE_BUILD_KEY],
  { tags: [PAGE_SEO_TAG], revalidate: 3600 },
);

export async function getAllPageSeo(): Promise<Map<string, PageSeoRow>> {
  let rows: PageSeoRow[] = [];
  try {
    rows = await readPageSeo();
  } catch (error) {
    console.warn("[lookup] Page SEO unavailable:", (error as Error).message);
  }
  return new Map(rows.map((row) => [row.path, row]));
}

/** The registered route (site.config.ts) for a path — the entry Admin → Pages & SEO previews use too. */
export function registeredRoute(path: string): RouteEntry {
  const route = [...siteConfig.routes.corePages, siteConfig.routes.blog].find((entry) => entry.path === path);
  if (!route) throw new Error(`[lookup] ${path} is not registered in siteConfig.routes`);
  return route;
}

/** Metadata for a static public page: admin-edited SEO over code fallbacks over global settings. */
export async function buildPageMetadata(page: { path: string; title?: string; description?: string }): Promise<Metadata> {
  const [settings, seo] = await Promise.all([getSiteSettings(), getAllPageSeo()]);
  return composeMetadata({
    ...pageSeoInput(page, seo.get(page.path), settings, isIndexable(settings)),
    ogLocale: siteConfig.locale.ogLocale,
  });
}
