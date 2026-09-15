import type { Metadata } from "next";
import { saveSiteSettings } from "@/lookup/admin/actions/settings";
import AdminForm from "@/lookup/admin/AdminForm";
import CountedField from "@/lookup/admin/CountedField";
import { t } from "@/lookup/admin/i18n";
import ImageField from "@/lookup/admin/ImageField";
import { Badge, CheckboxField, Fieldset, Notice, PageHeader, SelectField, TextField, type Tone } from "@/lookup/admin/ui";
import { requireAdmin } from "@/lookup/auth";
import { isGtmAllowed } from "@/lookup/runtime";
import { RECOMMENDED_LENGTH } from "@/lookup/seo-model";
import { siteConfig } from "@/site.config";

export const metadata: Metadata = { title: t.settings.title };

const s = t.settings;

/** What a tracking ID actually does on the live site — IDs other than GTM do nothing without GTM tags. */
function trackingStatus(value: string | null | undefined, kind: "gtm" | "tag", gtmId: string | null | undefined): { label: string; tone: Tone } {
  if (!value) return { label: s.status.notConfigured, tone: "muted" };
  if (kind === "gtm") return isGtmAllowed() ? { label: s.status.active, tone: "success" } : { label: s.status.gtmNotInProduction, tone: "warning" };
  return gtmId ? { label: s.status.requiresGtmTag, tone: "warning" } : { label: s.status.requiresGtm, tone: "error" };
}

export default async function SettingsPage() {
  const { supabase } = await requireAdmin();
  const { data: row, error } = await supabase.from("site_settings").select("*").eq("id", 1).maybeSingle();

  const trackingField = (label: string, name: "gtm_id" | "ga4_id" | "meta_pixel_id" | "tiktok_pixel_id" | "linkedin_partner_id", placeholder?: string) => {
    const status = trackingStatus(row?.[name], name === "gtm_id" ? "gtm" : "tag", row?.gtm_id);
    return (
      <TextField label={label} name={name} defaultValue={row?.[name]} dir="ltr" placeholder={placeholder} extra={<Badge tone={status.tone}>{status.label}</Badge>} />
    );
  };

  return (
    <>
      <PageHeader title={s.title} description={s.description} />
      {error && <Notice tone="error">{t.common.loadFailed(error.message)}</Notice>}

      <AdminForm action={saveSiteSettings} submitLabel={s.submit}>
        <Fieldset legend={s.business}>
          <TextField label={s.businessName} name="business_name" defaultValue={row?.business_name} required maxLength={200} />
          <TextField label={s.siteName} name="site_name" defaultValue={row?.site_name} required maxLength={200} placeholder={siteConfig.identity.siteName} />
          <TextField label={s.siteUrl} name="site_url" defaultValue={row?.site_url} dir="ltr" placeholder="https://www.example.com" hint={s.siteUrlHint} />
          <TextField label={s.phone} name="phone" defaultValue={row?.phone} dir="ltr" maxLength={40} />
          <TextField label={s.whatsapp} name="whatsapp" defaultValue={row?.whatsapp} dir="ltr" hint={s.whatsappHint} />
          <TextField label={s.email} name="email" defaultValue={row?.email} dir="ltr" />
          <TextField label={s.address} name="address" defaultValue={row?.address} maxLength={300} wide />
          <ImageField label={s.logo} name="logo_url" defaultValue={row?.logo_url} hint={s.logoHint} />
          <ImageField label={s.favicon} name="favicon_url" defaultValue={row?.favicon_url} hint={s.faviconHint} />
          <CheckboxField label={s.localBusiness} name="local_business_schema_enabled" defaultChecked={row?.local_business_schema_enabled} hint={s.localBusinessHint} />
        </Fieldset>

        <Fieldset legend={s.social}>
          <TextField label="Facebook" name="facebook_url" defaultValue={row?.facebook_url} dir="ltr" placeholder="https://facebook.com/…" />
          <TextField label="Instagram" name="instagram_url" defaultValue={row?.instagram_url} dir="ltr" placeholder="https://instagram.com/…" />
          <TextField label="LinkedIn" name="linkedin_url" defaultValue={row?.linkedin_url} dir="ltr" placeholder="https://linkedin.com/…" />
          <TextField label="TikTok" name="tiktok_url" defaultValue={row?.tiktok_url} dir="ltr" placeholder="https://tiktok.com/@…" />
          <TextField label="YouTube" name="youtube_url" defaultValue={row?.youtube_url} dir="ltr" placeholder="https://youtube.com/…" />
        </Fieldset>

        <Fieldset legend={s.seo}>
          <CountedField label={s.defaultMetaTitle} name="default_meta_title" defaultValue={row?.default_meta_title} recommended={RECOMMENDED_LENGTH.metaTitle} maxLength={200} wide />
          <CountedField
            label={s.defaultMetaDescription}
            name="default_meta_description"
            defaultValue={row?.default_meta_description}
            recommended={RECOMMENDED_LENGTH.metaDescription}
            maxLength={500}
            multiline
          />
          <ImageField label={s.defaultOgImage} name="default_og_image_url" defaultValue={row?.default_og_image_url} hint={s.defaultOgImageHint} />
          <CheckboxField label={s.indexing} name="indexing_enabled" defaultChecked={row?.indexing_enabled} hint={s.indexingHint} />
          <SelectField
            label={s.consentDefault}
            name="consent_default"
            defaultValue={row?.consent_default ?? "granted"}
            options={[
              { value: "granted", label: s.consentGranted },
              { value: "denied", label: s.consentDenied },
            ]}
            hint={s.consentHint}
            wide
          />
        </Fieldset>

        <Fieldset legend={s.tracking} description={s.trackingDescription}>
          {trackingField(s.gtm, "gtm_id", "GTM-XXXXXXX")}
          {trackingField(s.ga4, "ga4_id", "G-XXXXXXXXXX")}
          {trackingField(s.metaPixel, "meta_pixel_id")}
          {trackingField(s.tiktokPixel, "tiktok_pixel_id")}
          {trackingField(s.linkedinPartner, "linkedin_partner_id")}
        </Fieldset>
      </AdminForm>
    </>
  );
}
