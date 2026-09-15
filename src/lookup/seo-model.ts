import type { Metadata } from "next";
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

export type PageSeoRow = SeoFields & { path: string; updated_at: string };

type ComposeInput = {
  settings: SiteSettings;
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
 *   OG          = SEO OG fields → resolved title/description; image → SEO OG image → fallback → default OG image
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
  const imagePath = seo?.og_image_url?.trim() || input.fallbackImage || settings.defaultOgImageUrl;
  const image = imagePath ? absoluteUrl(settings.siteUrl, imagePath) : undefined;
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
      locale: "he_IL",
      siteName: settings.siteName,
      url: canonical,
      title: ogTitle,
      description: ogDescription,
      images: image ? [{ url: image }] : undefined,
      ...(input.type === "article"
        ? { publishedTime: input.publishedTime, modifiedTime: input.modifiedTime }
        : {}),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title: ogTitle,
      description: ogDescription,
      images: image ? [image] : undefined,
    },
  };
}
