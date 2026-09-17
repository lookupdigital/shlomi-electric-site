import type { Metadata } from "next";
import { savePageSeo } from "@/lookup/admin/actions/pages";
import AdminForm from "@/lookup/admin/AdminForm";
import CountedField from "@/lookup/admin/CountedField";
import { t } from "@/lookup/admin/i18n";
import ImageField from "@/lookup/admin/ImageField";
import { CheckboxField, Fieldset, Notice, PageHeader, TextAreaField, TextField } from "@/lookup/admin/ui";
import { requireAdmin } from "@/lookup/auth";
import { RECOMMENDED_LENGTH } from "@/lookup/seo-model";
import { getSiteSettings } from "@/lookup/settings";
import { siteConfig } from "@/site.config";

export const metadata: Metadata = { title: t.pages.title };

export default async function PagesSeoPage() {
  const { supabase } = await requireAdmin();
  const [{ data, error }, settings] = await Promise.all([supabase.from("page_seo").select("*"), getSiteSettings()]);
  const rows = new Map((data ?? []).map((row) => [row.path, row]));
  const pages = [...siteConfig.routes.corePages, siteConfig.routes.blog];
  const p = t.pages;

  return (
    <>
      <PageHeader title={p.title} description={p.description} />
      {error && <Notice tone="error">{t.common.loadFailed(error.message)}</Notice>}

      <div className="flex flex-col gap-4">
        {pages.map((page) => {
          const seo = rows.get(page.path);
          const fallbackTitle = page.title ? `${page.title} | ${settings.siteName}` : settings.defaultMetaTitle || settings.siteName;
          return (
            <details key={page.path} className="rounded-xl border border-line bg-white">
              <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 px-5 py-4 font-heading font-semibold text-ink">
                <span>{page.label}</span>
                <span className="text-sm font-normal text-muted" dir="ltr">
                  {page.path}
                  {seo?.robots_index === false ? " · noindex" : ""}
                </span>
              </summary>
              <div className="border-t border-line p-5">
                <AdminForm action={savePageSeo} submitLabel={p.submit}>
                  <input type="hidden" name="path" value={page.path} />
                  <Fieldset legend={p.meta}>
                    <CountedField label="Meta title" name="meta_title" defaultValue={seo?.meta_title} placeholder={fallbackTitle} recommended={RECOMMENDED_LENGTH.metaTitle} maxLength={200} wide />
                    <CountedField
                      label="Meta description"
                      name="meta_description"
                      defaultValue={seo?.meta_description}
                      placeholder={settings.defaultMetaDescription}
                      recommended={RECOMMENDED_LENGTH.metaDescription}
                      maxLength={500}
                      multiline
                    />
                    <TextField label="Canonical URL" name="canonical_url" defaultValue={seo?.canonical_url} dir="ltr" placeholder={p.canonicalPlaceholder} wide />
                  </Fieldset>
                  <Fieldset legend={p.openGraph}>
                    <TextField label="OG title" name="og_title" defaultValue={seo?.og_title} placeholder={p.ogTitlePlaceholder} />
                    <ImageField label="OG image" name="og_image_url" defaultValue={seo?.og_image_url} hint={p.ogImageHint} />
                    <TextAreaField label="OG description" name="og_description" defaultValue={seo?.og_description} placeholder={p.ogDescriptionPlaceholder} />
                  </Fieldset>
                  <Fieldset legend={p.robots}>
                    <CheckboxField label="index" name="robots_index" defaultChecked={seo?.robots_index ?? true} hint={p.indexHint} />
                    <CheckboxField label="follow" name="robots_follow" defaultChecked={seo?.robots_follow ?? true} />
                  </Fieldset>
                </AdminForm>
              </div>
            </details>
          );
        })}
      </div>
    </>
  );
}
