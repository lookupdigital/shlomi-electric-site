// Site settings model: pure, client-safe types and helpers (no data access).

export type SiteSettingsRow = {
  id: number;
  business_name: string | null;
  site_name: string | null;
  site_url: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  address: string | null;
  logo_url: string | null;
  favicon_url: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  linkedin_url: string | null;
  tiktok_url: string | null;
  youtube_url: string | null;
  default_meta_title: string | null;
  default_meta_description: string | null;
  default_og_image_url: string | null;
  indexing_enabled: boolean;
  local_business_schema_enabled: boolean;
  gtm_id: string | null;
  ga4_id: string | null;
  meta_pixel_id: string | null;
  tiktok_pixel_id: string | null;
  linkedin_partner_id: string | null;
  updated_at: string;
};

/** Client-specific fallbacks used when a setting is empty or the database is unavailable. */
export type SiteDefaults = {
  businessName: string;
  siteName: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  logoUrl: string;
  defaultMetaDescription: string;
};

export type SiteSettings = {
  businessName: string;
  siteName: string;
  siteUrl: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  logoUrl: string;
  faviconUrl: string;
  social: { facebook: string; instagram: string; linkedin: string; tiktok: string; youtube: string };
  defaultMetaTitle: string;
  defaultMetaDescription: string;
  defaultOgImageUrl: string;
  indexingEnabled: boolean;
  localBusinessSchemaEnabled: boolean;
  tracking: { gtmId: string; ga4Id: string; metaPixelId: string; tiktokPixelId: string; linkedinPartnerId: string };
};

const text = (value: string | null | undefined, fallback = "") => value?.trim() || fallback;

export function normalizeOrigin(value?: string | null): string {
  if (!value) return "";
  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    return new URL(withProtocol).origin;
  } catch {
    return "";
  }
}

export function mergeSiteSettings(
  row: SiteSettingsRow | null,
  defaults: SiteDefaults,
  productionHost?: string,
): SiteSettings {
  return {
    businessName: text(row?.business_name, defaults.businessName),
    siteName: text(row?.site_name, defaults.siteName),
    siteUrl: normalizeOrigin(row?.site_url) || normalizeOrigin(productionHost) || "http://localhost:3000",
    phone: text(row?.phone, defaults.phone),
    whatsapp: text(row?.whatsapp, defaults.whatsapp),
    email: text(row?.email, defaults.email),
    address: text(row?.address, defaults.address),
    logoUrl: text(row?.logo_url, defaults.logoUrl),
    faviconUrl: text(row?.favicon_url),
    social: {
      facebook: text(row?.facebook_url),
      instagram: text(row?.instagram_url),
      linkedin: text(row?.linkedin_url),
      tiktok: text(row?.tiktok_url),
      youtube: text(row?.youtube_url),
    },
    defaultMetaTitle: text(row?.default_meta_title),
    defaultMetaDescription: text(row?.default_meta_description, defaults.defaultMetaDescription),
    defaultOgImageUrl: text(row?.default_og_image_url),
    indexingEnabled: row?.indexing_enabled === true,
    localBusinessSchemaEnabled: row?.local_business_schema_enabled === true,
    tracking: {
      gtmId: text(row?.gtm_id),
      ga4Id: text(row?.ga4_id),
      metaPixelId: text(row?.meta_pixel_id),
      tiktokPixelId: text(row?.tiktok_pixel_id),
      linkedinPartnerId: text(row?.linkedin_partner_id),
    },
  };
}

/** "03-555-1234" → "tel:+97235551234" (Israeli local numbers get the +972 prefix). */
export function phoneHref(phone: string): string {
  const trimmed = phone.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return "";
  if (trimmed.startsWith("+")) return `tel:+${digits}`;
  if (digits.startsWith("0")) return `tel:+972${digits.slice(1)}`;
  return `tel:+${digits}`;
}

/** "050-000-0000" or "972500000000" → "https://wa.me/972500000000". */
export function whatsappHref(number: string): string {
  let digits = number.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("0")) digits = `972${digits.slice(1)}`;
  return `https://wa.me/${digits}`;
}

export function absoluteUrl(origin: string, pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return `${origin}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;
}
