import type { RouteEntry } from "@/lookup/config";
import { latestTimestamp, sameUrl } from "@/lookup/seo-model";
import { absoluteUrl } from "@/lookup/settings-model";

export type SitemapEntry = { url: string; lastModified?: string };

type PageSeoRow = { robots_index: boolean; canonical_url: string | null };
type SitemapPost = { slug: string; robots_index: boolean; canonical_url: string | null; updated_at: string };

/** A URL is listed only when it is its own canonical: an explicit canonical to a different URL excludes it. */
function selfCanonical(canonical: string | null | undefined, url: string): boolean {
  const override = canonical?.trim();
  return !override || sameUrl(override, url);
}

/**
 * Public, indexable, self-canonical URLs: core pages (unless noindex or canonicalized elsewhere), the blog index when
 * it has at least one listed post, and each published indexable post. Drafts and scheduled posts never reach `posts`.
 */
export function sitemapEntries(input: {
  siteUrl: string;
  corePages: RouteEntry[];
  blog: RouteEntry;
  pageSeo: Map<string, PageSeoRow>;
  posts: SitemapPost[];
}): SitemapEntry[] {
  const entries: SitemapEntry[] = [];
  const listed = (path: string) => {
    const seo = input.pageSeo.get(path);
    return seo?.robots_index !== false && selfCanonical(seo?.canonical_url, absoluteUrl(input.siteUrl, path));
  };

  // Static pages have no trustworthy content date, so lastModified is omitted rather than invented.
  for (const page of input.corePages) {
    if (listed(page.path)) entries.push({ url: absoluteUrl(input.siteUrl, page.path) });
  }

  const postPath = (slug: string) => `${input.blog.path}/${encodeURIComponent(slug)}`;
  const posts = input.posts.filter((post) => post.robots_index && selfCanonical(post.canonical_url, absoluteUrl(input.siteUrl, postPath(post.slug))));
  if (posts.length > 0 && listed(input.blog.path)) {
    // The blog index changes whenever any listed post changes.
    entries.push({ url: absoluteUrl(input.siteUrl, input.blog.path), lastModified: latestTimestamp(posts) });
  }
  for (const post of posts) {
    entries.push({ url: absoluteUrl(input.siteUrl, postPath(post.slug)), lastModified: post.updated_at });
  }
  return entries;
}
