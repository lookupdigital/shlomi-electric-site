import type { Metadata } from "next";
import { DEFAULT_OG_IMAGE } from "@/lookup/config";
import { absoluteUrl, type SiteSettings } from "@/lookup/settings-model";

export type SeoFields = {
  meta_title?: string | null;
  meta_description?: string | null;
  canonical_url?: string | null;
  og_title?: string | null;
  og_description?: string | null;
  og_image_url?: string | null;
  robots_index?: boolean | null;
  robots_follow?: boolean | null;
};

export const RECOMMENDED_LENGTH = { metaTitle: 60, metaDescription: 160 } as const;

/** The site settings SEO resolution reads (a client-safe subset: the Admin previews receive only these). */
export type SeoSettings = Pick<SiteSettings, "siteName" | "siteUrl" | "defaultMetaTitle" | "defaultMetaDescription" | "defaultOgImageUrl">;

export function seoSettings(settings: SeoSettings): SeoSettings {
  const { siteName, siteUrl, defaultMetaTitle, defaultMetaDescription, defaultOgImageUrl } = settings;
  return { siteName, siteUrl, defaultMetaTitle, defaultMetaDescription, defaultOgImageUrl };
}

export type SeoInput = {
  settings: SeoSettings;
  path: string;
  seo?: SeoFields;
  /** Title from code, rendered as "<title> | <site name>". */
  fallbackTitle?: string;
  fallbackDescription?: string;
  fallbackImage?: string | null;
  /** Global indexability: Production AND indexing enabled in Admin → Launch. */
  indexable: boolean;
};

type ComposeInput = SeoInput & {
  /** Open Graph locale, e.g. "he_IL". */
  ogLocale: string;
  type?: "website" | "article";
  publishedTime?: string;
  modifiedTime?: string;
};

export type ResolvedSeo = {
  title: string;
  description: string | undefined;
  /** The page's own URL (site URL + path). */
  selfUrl: string;
  canonical: string;
  /** An explicit canonical override that points to a different URL than the page itself. */
  canonicalElsewhere: boolean;
  /** The page's own robots flags (independent of global indexing). */
  pageIndex: boolean;
  pageFollow: boolean;
  /** Effective robots directives: global indexability AND the page flags. */
  index: boolean;
  follow: boolean;
  ogTitle: string;
  ogDescription: string | undefined;
  ogImage: { url: string; width?: number; height?: number; generated: boolean };
};

const trimmed = (value: string | null | undefined) => value?.trim() || "";

/** Compares two absolute URLs, ignoring the host's letter case, a trailing slash and the hash. */
export function sameUrl(a: string, b: string): boolean {
  try {
    const normalize = (value: string) => {
      const url = new URL(value);
      const path = url.pathname.length > 1 ? url.pathname.replace(/\/+$/, "") : "/";
      return `${url.protocol}//${url.host.toLowerCase()}${path}${url.search}`;
    };
    return normalize(a) === normalize(b);
  } catch {
    return a.trim() === b.trim();
  }
}

/**
 * The one authoritative SEO resolution, used by live metadata, the Admin previews and the factual SEO states.
 *   title          = SEO title → "<code title> | <site name>" → default meta title → site name
 *   description    = SEO description → code description (e.g. post excerpt) → default meta description
 *   canonical      = canonical override → site URL + path
 *   OG title       = OG title → resolved title
 *   OG description = OG description → resolved description
 *   OG image       = OG image → page image (e.g. featured image) → default share image → generated /og-default.png
 *   robots         = global indexability AND the page's own index / follow flags
 */
export function resolveSeo(input: SeoInput): ResolvedSeo {
  const { settings, seo } = input;
  const title =
    trimmed(seo?.meta_title) ||
    (input.fallbackTitle ? [input.fallbackTitle, settings.siteName].filter(Boolean).join(" | ") : "") ||
    settings.defaultMetaTitle ||
    settings.siteName;
  const description = trimmed(seo?.meta_description) || input.fallbackDescription || settings.defaultMetaDescription || undefined;
  const selfUrl = absoluteUrl(settings.siteUrl, input.path);
  const override = trimmed(seo?.canonical_url);
  const canonical = override || selfUrl;
  const customImage = trimmed(seo?.og_image_url) || input.fallbackImage || settings.defaultOgImageUrl;
  const ogImage = customImage
    ? { url: absoluteUrl(settings.siteUrl, customImage), generated: false }
    : { url: absoluteUrl(settings.siteUrl, DEFAULT_OG_IMAGE.path), width: DEFAULT_OG_IMAGE.width, height: DEFAULT_OG_IMAGE.height, generated: true };
  const pageIndex = seo?.robots_index !== false;
  const pageFollow = seo?.robots_follow !== false;
  return {
    title,
    description,
    selfUrl,
    canonical,
    canonicalElsewhere: Boolean(override) && !sameUrl(override, selfUrl),
    pageIndex,
    pageFollow,
    index: input.indexable && pageIndex,
    follow: input.indexable && pageFollow,
    ogTitle: trimmed(seo?.og_title) || title,
    ogDescription: trimmed(seo?.og_description) || description,
    ogImage,
  };
}

export function composeMetadata(input: ComposeInput): Metadata {
  const { settings } = input;
  const seo = resolveSeo(input);
  const { generated, ...image } = seo.ogImage;
  void generated;

  return {
    title: { absolute: seo.title },
    description: seo.description,
    alternates: { canonical: seo.canonical },
    robots: { index: seo.index, follow: seo.follow },
    openGraph: {
      type: input.type ?? "website",
      locale: input.ogLocale,
      siteName: settings.siteName || undefined,
      url: seo.canonical,
      title: seo.ogTitle,
      description: seo.ogDescription,
      images: [image],
      ...(input.type === "article" ? { publishedTime: input.publishedTime, modifiedTime: input.modifiedTime } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: seo.ogTitle,
      description: seo.ogDescription,
      images: [image.url],
    },
  };
}

/** The fields of a post that take part in its SEO (og_title/og_description/robots_follow need migration 8). */
export type PostSeoSource = SeoFields & {
  slug: string;
  title: string;
  excerpt?: string | null;
  featured_image_url?: string | null;
};

export function postPath(blogPath: string, slug: string): string {
  return `${blogPath}/${encodeURIComponent(slug)}`;
}

/** SEO input of a blog post: post fields over the post title, excerpt and featured image. */
export function postSeoInput(post: PostSeoSource, settings: SeoSettings, blogPath: string, indexable: boolean): SeoInput {
  return {
    settings,
    path: postPath(blogPath, post.slug),
    seo: {
      meta_title: post.meta_title,
      meta_description: post.meta_description,
      canonical_url: post.canonical_url,
      og_title: post.og_title,
      og_description: post.og_description,
      og_image_url: post.og_image_url,
      robots_index: post.robots_index,
      robots_follow: post.robots_follow,
    },
    fallbackTitle: post.title,
    fallbackDescription: post.excerpt ?? undefined,
    fallbackImage: post.featured_image_url,
    indexable,
  };
}

/** SEO input of a registered code-managed route: its page_seo row over the route's code title. */
export function pageSeoInput(
  route: { path: string; title?: string; description?: string },
  seo: SeoFields | undefined,
  settings: SeoSettings,
  indexable: boolean,
): SeoInput {
  return { settings, path: route.path, seo, fallbackTitle: route.title, fallbackDescription: route.description, indexable };
}

export type SeoStateLevel = "problem" | "improve" | "info";

export type SeoState =
  | { id: "missingTitle"; level: "problem" }
  | { id: "missingDescription"; level: "improve" }
  | { id: "titleTooLong"; level: "improve"; length: number }
  | { id: "descriptionTooLong"; level: "improve"; length: number }
  | { id: "noindex"; level: "info" }
  | { id: "nofollow"; level: "info" }
  | { id: "canonicalElsewhere"; level: "info" };

/**
 * Factual SEO states of the RESOLVED result: a value supplied by a valid fallback is never "missing". Intentional
 * choices (noindex, nofollow, a canonical elsewhere) are informational, not problems. No scores.
 */
export function seoStates(seo: ResolvedSeo): SeoState[] {
  const states: SeoState[] = [];
  if (!seo.title) states.push({ id: "missingTitle", level: "problem" });
  else if (seo.title.length > RECOMMENDED_LENGTH.metaTitle) states.push({ id: "titleTooLong", level: "improve", length: seo.title.length });
  if (!seo.description) states.push({ id: "missingDescription", level: "improve" });
  else if (seo.description.length > RECOMMENDED_LENGTH.metaDescription) {
    states.push({ id: "descriptionTooLong", level: "improve", length: seo.description.length });
  }
  if (!seo.pageIndex) states.push({ id: "noindex", level: "info" });
  if (!seo.pageFollow) states.push({ id: "nofollow", level: "info" });
  if (seo.canonicalElsewhere) states.push({ id: "canonicalElsewhere", level: "info" });
  return states;
}

/** Latest updated_at of the given rows (ISO strings compare chronologically only after parsing). */
export function latestTimestamp(rows: { updated_at: string }[]): string | undefined {
  let latest: string | undefined;
  for (const row of rows) {
    if (!latest || new Date(row.updated_at).getTime() > new Date(latest).getTime()) latest = row.updated_at;
  }
  return latest;
}
