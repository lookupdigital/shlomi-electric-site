// Site settings model: pure, client-safe types and helpers (no data access).
import type { SiteConfig } from "@/lookup/config";
import type { Database } from "@/lookup/supabase/database.types";

export type SiteSettingsRow = Database["public"]["Tables"]["site_settings"]["Row"];

export type ConsentDefault = "granted" | "denied";

export type SiteSettings = {
  businessName: string;
  siteName: string;
  siteUrl: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  serviceArea: string;
  logoUrl: string;
  faviconUrl: string;
  social: { facebook: string; instagram: string; linkedin: string; tiktok: string; youtube: string };
  defaultMetaTitle: string;
  defaultMetaDescription: string;
  defaultOgImageUrl: string;
  indexingEnabled: boolean;
  localBusinessSchemaEnabled: boolean;
  consentDefault: ConsentDefault;
  tracking: { gtmId: string; ga4Id: string; metaPixelId: string; tiktokPixelId: string; linkedinPartnerId: string };
};

const text = (value: string | null | undefined) => value?.trim() ?? "";

export function normalizeOrigin(value?: string | null): string {
  if (!value) return "";
  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    return new URL(withProtocol).origin;
  } catch {
    return "";
  }
}

/**
 * The database is the source of truth: an empty value stays empty (no demo/code fallbacks), so a field an admin
 * clears never reappears. The only fallbacks are structural: the brand name when the site name is empty,
 * the logo file shipped with the site, the site URL from the environment, and the configured service area when the
 * settings row is unavailable or has no service_area column yet (migration 6 not applied).
 */
export function mergeSiteSettings(
  row: Partial<SiteSettingsRow> | null,
  config: Pick<SiteConfig, "identity" | "branding" | "business">,
  fallbackSiteUrl?: string,
): SiteSettings {
  const siteName = text(row?.site_name) || config.identity.siteName;
  return {
    businessName: text(row?.business_name) || siteName,
    siteName,
    siteUrl: normalizeOrigin(row?.site_url) || normalizeOrigin(fallbackSiteUrl) || "http://localhost:3000",
    phone: text(row?.phone),
    whatsapp: text(row?.whatsapp),
    email: text(row?.email),
    address: text(row?.address),
    serviceArea: row && row.service_area !== undefined ? text(row.service_area) : config.business.serviceArea,
    logoUrl: text(row?.logo_url) || config.branding.logoUrl,
    faviconUrl: text(row?.favicon_url),
    social: {
      facebook: text(row?.facebook_url),
      instagram: text(row?.instagram_url),
      linkedin: text(row?.linkedin_url),
      tiktok: text(row?.tiktok_url),
      youtube: text(row?.youtube_url),
    },
    defaultMetaTitle: text(row?.default_meta_title),
    defaultMetaDescription: text(row?.default_meta_description),
    defaultOgImageUrl: text(row?.default_og_image_url),
    indexingEnabled: row?.indexing_enabled === true,
    localBusinessSchemaEnabled: row?.local_business_schema_enabled === true,
    consentDefault: row?.consent_default === "denied" ? "denied" : "granted",
    tracking: {
      gtmId: text(row?.gtm_id),
      ga4Id: text(row?.ga4_id),
      metaPixelId: text(row?.meta_pixel_id),
      tiktokPixelId: text(row?.tiktok_pixel_id),
      linkedinPartnerId: text(row?.linkedin_partner_id),
    },
  };
}

type PhoneRules = SiteConfig["phone"];

function internationalDigits(value: string, rules: PhoneRules): string {
  const trimmed = value.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return "";
  if (trimmed.startsWith("+")) return digits;
  if (rules.nationalTrunkPrefix && digits.startsWith(rules.nationalTrunkPrefix)) {
    return `${rules.countryCallingCode}${digits.slice(rules.nationalTrunkPrefix.length)}`;
  }
  return digits;
}

/** National numbers get the configured country code, e.g. "03-555-1234" → "tel:+97235551234". */
export function phoneHref(phone: string, rules: PhoneRules): string {
  const digits = internationalDigits(phone, rules);
  return digits ? `tel:+${digits}` : "";
}

/** "050-000-0000" or "972500000000" → "https://wa.me/972500000000". */
export function whatsappHref(number: string, rules: PhoneRules): string {
  const digits = internationalDigits(number.replace(/^\+/, ""), rules);
  return digits ? `https://wa.me/${digits}` : "";
}

export function absoluteUrl(origin: string, pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return `${origin}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;
}
