import "server-only";
import type { Metadata } from "next";
import { unstable_cache } from "next/cache";
import { composeMetadata, type PageSeoRow } from "@/lookup/seo-model";
import { getSiteSettings, isIndexable } from "@/lookup/settings";
import { createPublicClient } from "@/lookup/supabase/public";

export const PAGE_SEO_TAG = "page-seo";

const readPageSeo = unstable_cache(
  async (): Promise<PageSeoRow[]> => {
    const supabase = createPublicClient();
    if (!supabase) return [];
    const { data, error } = await supabase.from("page_seo").select("*");
    if (error) throw new Error(`page_seo: ${error.message}`);
    return (data ?? []) as PageSeoRow[];
  },
  ["lookup-page-seo"],
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

/** Metadata for a static public page: admin-edited SEO over code fallbacks over global settings. */
export async function buildPageMetadata(page: { path: string; title?: string; description?: string }): Promise<Metadata> {
  const [settings, seo] = await Promise.all([getSiteSettings(), getAllPageSeo()]);
  return composeMetadata({
    settings,
    path: page.path,
    seo: seo.get(page.path),
    fallbackTitle: page.title,
    fallbackDescription: page.description,
    indexable: isIndexable(settings),
  });
}
