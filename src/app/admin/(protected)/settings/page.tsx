import type { Metadata } from "next";
import { siteDefaults } from "@/lib/site";
import { saveSiteSettings } from "@/lookup/admin/actions/settings";
import AdminForm from "@/lookup/admin/AdminForm";
import ImageField from "@/lookup/admin/ImageField";
import { CheckboxField, Fieldset, Notice, PageHeader, TextAreaField, TextField } from "@/lookup/admin/ui";
import { requireAdmin } from "@/lookup/auth";
import type { SiteSettingsRow } from "@/lookup/settings-model";

export const metadata: Metadata = { title: "הגדרות אתר" };

export default async function SettingsPage() {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.from("site_settings").select("*").eq("id", 1).maybeSingle();
  const s = (data ?? {}) as Partial<SiteSettingsRow>;

  return (
    <>
      <PageHeader title="הגדרות אתר" description="שדה ריק = ערך ברירת המחדל שמופיע כ-placeholder (מהקוד)." />
      {error && <Notice tone="error">טעינת ההגדרות נכשלה: {error.message}</Notice>}

      <AdminForm action={saveSiteSettings} submitLabel="שמירת ההגדרות">
        <Fieldset legend="פרטי העסק">
          <TextField label="שם העסק" name="business_name" defaultValue={s.business_name} placeholder={siteDefaults.businessName} />
          <TextField label="שם האתר" name="site_name" defaultValue={s.site_name} placeholder={siteDefaults.siteName} />
          <TextField
            label="כתובת האתר (דומיין ראשי)"
            name="site_url"
            defaultValue={s.site_url}
            dir="ltr"
            placeholder="https://www.example.co.il"
            hint="משמשת ל-canonical, sitemap ו-Open Graph. ריק = כתובת הפרודקשן של Vercel."
          />
          <TextField label="טלפון" name="phone" defaultValue={s.phone} dir="ltr" placeholder={siteDefaults.phone} />
          <TextField label="WhatsApp" name="whatsapp" defaultValue={s.whatsapp} dir="ltr" placeholder={siteDefaults.whatsapp} />
          <TextField label="אימייל" name="email" defaultValue={s.email} dir="ltr" placeholder={siteDefaults.email} />
          <TextField label="כתובת" name="address" defaultValue={s.address} placeholder={siteDefaults.address} wide />
          <ImageField label="לוגו" name="logo_url" defaultValue={s.logo_url} hint={`ריק = ${siteDefaults.logoUrl}`} />
          <ImageField label="Favicon" name="favicon_url" defaultValue={s.favicon_url} hint="PNG/ICO ריבועי. ריק = favicon.ico הקיים." />
          <CheckboxField
            label="פרטי העסק אומתו — הצג LocalBusiness בנתונים מובנים"
            name="local_business_schema_enabled"
            defaultChecked={s.local_business_schema_enabled}
            hint="להפעיל רק אחרי שהטלפון, הכתובת והאימייל האמיתיים הוזנו."
          />
        </Fieldset>

        <Fieldset legend="רשתות חברתיות">
          <TextField label="Facebook" name="facebook_url" defaultValue={s.facebook_url} dir="ltr" placeholder="https://facebook.com/…" />
          <TextField label="Instagram" name="instagram_url" defaultValue={s.instagram_url} dir="ltr" placeholder="https://instagram.com/…" />
          <TextField label="LinkedIn" name="linkedin_url" defaultValue={s.linkedin_url} dir="ltr" placeholder="https://linkedin.com/…" />
          <TextField label="TikTok" name="tiktok_url" defaultValue={s.tiktok_url} dir="ltr" placeholder="https://tiktok.com/@…" />
          <TextField label="YouTube" name="youtube_url" defaultValue={s.youtube_url} dir="ltr" placeholder="https://youtube.com/…" />
        </Fieldset>

        <Fieldset legend="SEO כללי">
          <TextField label="Meta title ברירת מחדל" name="default_meta_title" defaultValue={s.default_meta_title} placeholder={siteDefaults.siteName} wide />
          <TextAreaField
            label="Meta description ברירת מחדל"
            name="default_meta_description"
            defaultValue={s.default_meta_description}
            placeholder={siteDefaults.defaultMetaDescription}
          />
          <ImageField label="תמונת שיתוף ברירת מחדל (OG)" name="default_og_image_url" defaultValue={s.default_og_image_url} hint="מומלץ 1200×630." />
          <CheckboxField
            label="לאפשר אינדוקס במנועי חיפוש"
            name="indexing_enabled"
            defaultChecked={s.indexing_enabled}
            hint="כבוי = כל העמודים noindex. פועל רק בפריסת Production — Preview ופיתוח לעולם אינם מאונדקסים."
          />
        </Fieldset>

        <Fieldset legend="מעקב ופיקסלים" description="מזהים ציבוריים בלבד. GTM נטען רק בפרודקשן; שאר המזהים נחשפים ל-GTM כמשתני dataLayer.">
          <TextField label="Google Tag Manager ID" name="gtm_id" defaultValue={s.gtm_id} dir="ltr" placeholder="GTM-XXXXXXX" />
          <TextField label="GA4 Measurement ID" name="ga4_id" defaultValue={s.ga4_id} dir="ltr" placeholder="G-XXXXXXXXXX" />
          <TextField label="Meta Pixel ID" name="meta_pixel_id" defaultValue={s.meta_pixel_id} dir="ltr" />
          <TextField label="TikTok Pixel ID" name="tiktok_pixel_id" defaultValue={s.tiktok_pixel_id} dir="ltr" />
          <TextField label="LinkedIn Partner ID" name="linkedin_partner_id" defaultValue={s.linkedin_partner_id} dir="ltr" />
        </Fieldset>
      </AdminForm>
    </>
  );
}
