import type { MetadataRoute } from "next";
import { publicPages } from "@/lib/site";
import { getPublishedPosts } from "@/lookup/posts";
import { getAllPageSeo } from "@/lookup/seo";
import { getSiteSettings } from "@/lookup/settings";
import { absoluteUrl } from "@/lookup/settings-model";

/** Public static pages + published, indexable posts. Drafts, admin and noindex pages are never listed. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [settings, pageSeo, posts] = await Promise.all([getSiteSettings(), getAllPageSeo(), getPublishedPosts()]);
  const entries: MetadataRoute.Sitemap = [];

  // Static pages have no trustworthy content date, so lastModified is omitted rather than invented.
  for (const page of publicPages) {
    if (pageSeo.get(page.path)?.robots_index === false) continue;
    entries.push({ url: absoluteUrl(settings.siteUrl, page.path) });
  }

  const indexablePosts = posts.filter((post) => post.robots_index);
  if (indexablePosts.length > 0 && pageSeo.get("/blog")?.robots_index !== false) {
    entries.push({ url: absoluteUrl(settings.siteUrl, "/blog"), lastModified: indexablePosts[0].updated_at });
  }
  for (const post of indexablePosts) {
    entries.push({
      url: absoluteUrl(settings.siteUrl, `/blog/${encodeURIComponent(post.slug)}`),
      lastModified: post.updated_at,
    });
  }

  return entries;
}
