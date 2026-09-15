"use server";

import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";
import { checkbox, firstIssue, formEntries, httpsUrl, httpUrl, imageUrl, optional, type FormState } from "@/lookup/admin/form-utils";
import { requireAdmin } from "@/lookup/auth";
import { SITE_SETTINGS_TAG } from "@/lookup/settings";

const LABELS: Record<string, string> = {
  site_url: "כתובת האתר",
  whatsapp: "WhatsApp",
  email: "אימייל",
  logo_url: "לוגו",
  favicon_url: "Favicon",
  default_og_image_url: "תמונת שיתוף",
  gtm_id: "GTM ID",
  ga4_id: "GA4 ID",
  meta_pixel_id: "Meta Pixel ID",
  tiktok_pixel_id: "TikTok Pixel ID",
  linkedin_partner_id: "LinkedIn Partner ID",
};

const text = (max: number) => optional(z.string().max(max, `עד ${max} תווים`));
const pattern = (regex: RegExp, message: string) => optional(z.string().regex(regex, message));

const settingsSchema = z.object({
  business_name: text(200),
  site_name: text(200),
  site_url: optional(httpUrl),
  phone: text(40),
  whatsapp: pattern(/^[0-9+ -]{6,25}$/, "ספרות בלבד, לדוגמה 972501234567"),
  email: optional(z.email("כתובת לא תקינה").max(200)),
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
  gtm_id: pattern(/^GTM-[A-Z0-9]{4,12}$/, "פורמט GTM-XXXXXXX"),
  ga4_id: pattern(/^G-[A-Z0-9]{4,20}$/, "פורמט G-XXXXXXXXXX"),
  meta_pixel_id: pattern(/^[0-9]{5,20}$/, "ספרות בלבד"),
  tiktok_pixel_id: pattern(/^[A-Za-z0-9]{5,40}$/, "אותיות וספרות בלבד"),
  linkedin_partner_id: pattern(/^[0-9]{3,15}$/, "ספרות בלבד"),
});

export async function saveSiteSettings(formData: FormData): Promise<FormState> {
  const { supabase } = await requireAdmin();
  const parsed = settingsSchema.safeParse(formEntries(formData));
  if (!parsed.success) return { ok: false, message: firstIssue(parsed.error, LABELS) };

  const { data, error } = await supabase.from("site_settings").update(parsed.data).eq("id", 1).select("id");
  if (error) return { ok: false, message: `השמירה נכשלה: ${error.message}` };
  if (!data?.length) return { ok: false, message: "השמירה נכשלה: אין הרשאה או שטבלת ההגדרות חסרה." };

  updateTag(SITE_SETTINGS_TAG);
  revalidatePath("/", "layout");
  return { ok: true, message: "ההגדרות נשמרו והאתר עודכן." };
}
