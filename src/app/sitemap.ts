import type { MetadataRoute } from "next";
import { getPublishedPosts } from "@/lookup/posts";
import { getAllPageSeo } from "@/lookup/seo";
import { getSiteSettings } from "@/lookup/settings";
import { sitemapEntries } from "@/lookup/sitemap-model";
import { siteConfig } from "@/site.config";

// Rendered per request: a prerendered copy stays in Vercel's CDN cache after admin changes (publishing a post),
// and revalidating by path does not clear it. The data itself is still served from the tagged data cache.
export const dynamic = "force-dynamic";

/** Public static pages + published, indexable posts. Drafts, admin, noindex and canonicalized-elsewhere URLs are never listed. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [settings, pageSeo, posts] = await Promise.all([getSiteSettings(), getAllPageSeo(), getPublishedPosts()]);
  return sitemapEntries({ siteUrl: settings.siteUrl, corePages: siteConfig.routes.corePages, blog: siteConfig.routes.blog, pageSeo, posts });
}
