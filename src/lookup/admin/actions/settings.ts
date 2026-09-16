"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { checkbox, firstIssue, formEntries, httpsUrl, httpUrl, imageUrl, optional, type FormState } from "@/lookup/admin/form-utils";
import { t } from "@/lookup/admin/i18n";
import { revalidatePublicSite } from "@/lookup/admin/revalidate";
import { requireAdmin } from "@/lookup/auth";
import { SITE_SETTINGS_TAG } from "@/lookup/settings";

const s = t.settings;

const LABELS: Record<string, string> = {
  business_name: s.businessName,
  site_name: s.siteName,
  site_url: s.siteUrl,
  whatsapp: s.whatsapp,
  email: s.email,
  logo_url: s.logo,
  favicon_url: s.favicon,
  default_og_image_url: s.defaultOgImage,
  gtm_id: s.gtm,
  ga4_id: s.ga4,
  meta_pixel_id: s.metaPixel,
  tiktok_pixel_id: s.tiktokPixel,
  linkedin_partner_id: s.linkedinPartner,
};

const text = (max: number) => optional(z.string().max(max, t.common.maxChars(max)));
const required = (max: number) => z.string().trim().min(1, t.common.required).max(max, t.common.maxChars(max));
const pattern = (regex: RegExp, message: string) => optional(z.string().regex(regex, message));

const settingsSchema = z.object({
  business_name: required(200),
  site_name: required(200),
  site_url: optional(httpUrl),
  phone: text(40),
  whatsapp: pattern(/^[0-9+ -]{6,25}$/, s.validation.whatsapp),
  email: optional(z.email(s.validation.email).max(200)),
  address: text(300),
  logo_url: optional(imageUrl),
  favicon_url: optional(imageUrl),
  facebook_url: optional(httpsUrl),
  instagram_url: optional(httpsUrl),
  linkedin_url: optional(httpsUrl),
  tiktok_url: optional(httpsUrl),
  youtube_url: optional(httpsUrl),
  default_meta_title: text(200),
  default_meta_description: text(500),
  default_og_image_url: optional(imageUrl),
  indexing_enabled: checkbox,
  local_business_schema_enabled: checkbox,
  consent_default: z.enum(["granted", "denied"]),
  gtm_id: pattern(/^GTM-[A-Z0-9]{4,12}$/, s.validation.gtm),
  ga4_id: pattern(/^G-[A-Z0-9]{4,20}$/, s.validation.ga4),
  meta_pixel_id: pattern(/^[0-9]{5,20}$/, s.validation.digits),
  tiktok_pixel_id: pattern(/^[A-Za-z0-9]{5,40}$/, s.validation.alphanumeric),
  linkedin_partner_id: pattern(/^[0-9]{3,15}$/, s.validation.digits),
});

export async function saveSiteSettings(formData: FormData): Promise<FormState> {
  const { supabase } = await requireAdmin();
  const parsed = settingsSchema.safeParse(formEntries(formData));
  if (!parsed.success) return { ok: false, message: firstIssue(parsed.error, LABELS) };

  const { data, error } = await supabase.from("site_settings").update(parsed.data).eq("id", 1).select("id");
  if (error) return { ok: false, message: t.common.saveFailed(error.message) };
  if (!data?.length) return { ok: false, message: s.missingTable };

  updateTag(SITE_SETTINGS_TAG);
  revalidatePublicSite();
  return { ok: true, message: s.saved };
}
