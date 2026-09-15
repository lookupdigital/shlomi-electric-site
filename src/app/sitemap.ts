import type { MetadataRoute } from "next";
import { getPublishedPosts } from "@/lookup/posts";
import { getAllPageSeo } from "@/lookup/seo";
import { latestTimestamp } from "@/lookup/seo-model";
import { getSiteSettings } from "@/lookup/settings";
import { absoluteUrl } from "@/lookup/settings-model";
import { siteConfig } from "@/site.config";

/** Public static pages + published, indexable posts. Drafts, admin and noindex pages are never listed. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [settings, pageSeo, posts] = await Promise.all([getSiteSettings(), getAllPageSeo(), getPublishedPosts()]);
  const entries: MetadataRoute.Sitemap = [];

  // Static pages have no trustworthy content date, so lastModified is omitted rather than invented.
  for (const page of siteConfig.routes.corePages) {
    if (pageSeo.get(page.path)?.robots_index === false) continue;
    entries.push({ url: absoluteUrl(settings.siteUrl, page.path) });
  }

  const blog = siteConfig.routes.blog;
  const indexablePosts = posts.filter((post) => post.robots_index);
  if (indexablePosts.length > 0 && pageSeo.get(blog.path)?.robots_index !== false) {
    // The blog index changes whenever any listed post changes.
    entries.push({ url: absoluteUrl(settings.siteUrl, blog.path), lastModified: latestTimestamp(indexablePosts) });
  }
  for (const post of indexablePosts) {
    entries.push({
      url: absoluteUrl(settings.siteUrl, `${blog.path}/${encodeURIComponent(post.slug)}`),
      lastModified: post.updated_at,
    });
  }

  return entries;
}
