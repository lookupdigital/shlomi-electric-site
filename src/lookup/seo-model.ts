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

type ComposeInput = {
  settings: SiteSettings;
  /** Open Graph locale, e.g. "he_IL". */
  ogLocale: string;
  path: string;
  seo?: SeoFields;
  /** Title from code, rendered as "<title> | <site name>". */
  fallbackTitle?: string;
  fallbackDescription?: string;
  fallbackImage?: string | null;
  indexable: boolean;
  type?: "website" | "article";
  publishedTime?: string;
  modifiedTime?: string;
};

/**
 * Fallback chain:
 *   title       = SEO meta title → "<code title> | <site name>" → default meta title → site name
 *   description = SEO meta description → code description → default meta description
 *   canonical   = SEO canonical → site URL + path
 *   OG image    = SEO OG image → page image → default OG image setting → generated default (1200×630)
 *   robots      = global indexability AND the page's own index/follow flags
 */
export function composeMetadata(input: ComposeInput): Metadata {
  const { settings, seo } = input;
  const title =
    seo?.meta_title?.trim() ||
    (input.fallbackTitle ? `${input.fallbackTitle} | ${settings.siteName}` : "") ||
    settings.defaultMetaTitle ||
    settings.siteName;
  const description =
    seo?.meta_description?.trim() || input.fallbackDescription || settings.defaultMetaDescription || undefined;
  const canonical = seo?.canonical_url?.trim() || absoluteUrl(settings.siteUrl, input.path);
  const customImage = seo?.og_image_url?.trim() || input.fallbackImage || settings.defaultOgImageUrl;
  const image = customImage
    ? { url: absoluteUrl(settings.siteUrl, customImage) }
    : { url: absoluteUrl(settings.siteUrl, DEFAULT_OG_IMAGE.path), width: DEFAULT_OG_IMAGE.width, height: DEFAULT_OG_IMAGE.height };
  const ogTitle = seo?.og_title?.trim() || title;
  const ogDescription = seo?.og_description?.trim() || description;

  return {
    title: { absolute: title },
    description,
    alternates: { canonical },
    robots: {
      index: input.indexable && seo?.robots_index !== false,
      follow: input.indexable && seo?.robots_follow !== false,
    },
    openGraph: {
      type: input.type ?? "website",
      locale: input.ogLocale,
      siteName: settings.siteName,
      url: canonical,
      title: ogTitle,
      description: ogDescription,
      images: [image],
      ...(input.type === "article" ? { publishedTime: input.publishedTime, modifiedTime: input.modifiedTime } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description: ogDescription,
      images: [image.url],
    },
  };
}

/** Latest updated_at of the given rows (ISO strings compare chronologically only after parsing). */
export function latestTimestamp(rows: { updated_at: string }[]): string | undefined {
  let latest: string | undefined;
  for (const row of rows) {
    if (!latest || new Date(row.updated_at).getTime() > new Date(latest).getTime()) latest = row.updated_at;
  }
  return latest;
}
