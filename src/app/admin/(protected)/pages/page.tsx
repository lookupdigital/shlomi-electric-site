import type { Metadata } from "next";
import { resetPageSeo, savePageSeo } from "@/lookup/admin/actions/pages";
import AdminForm from "@/lookup/admin/AdminForm";
import ConfirmSubmit from "@/lookup/admin/ConfirmSubmit";
import CountedField from "@/lookup/admin/CountedField";
import { t } from "@/lookup/admin/i18n";
import ImageField from "@/lookup/admin/ImageField";
import { pageSeoFormKey } from "@/lookup/admin/page-seo-form";
import { GooglePreview, SocialPreview } from "@/lookup/admin/SeoPreview";
import SeoStates from "@/lookup/admin/SeoStates";
import { smallDangerButton } from "@/lookup/admin/styles";
import { CheckboxField, Fieldset, Notice, PageHeader, TextAreaField, TextField } from "@/lookup/admin/ui";
import { requireAdmin } from "@/lookup/auth";
import { pageSeoInput, RECOMMENDED_LENGTH, resolveSeo, seoSettings, seoStates } from "@/lookup/seo-model";
import { getSiteSettings, isIndexable } from "@/lookup/settings";
import { siteConfig } from "@/site.config";

export const metadata: Metadata = { title: t.pages.title };

export default async function PagesSeoPage({ searchParams }: PageProps<"/admin/pages">) {
  const { supabase } = await requireAdmin();
  const { reset, at, error: errorParam } = await searchParams;
  const [{ data, error }, settings] = await Promise.all([supabase.from("page_seo").select("*"), getSiteSettings()]);
  const rows = new Map((data ?? []).map((row) => [row.path, row]));
  const pages = [...siteConfig.routes.corePages, siteConfig.routes.blog];
  const p = t.pages;
  const shared = { settings: seoSettings(settings), indexable: isIndexable(settings) };

  return (
    <>
      <PageHeader title={p.title} description={p.description} />
      <div className="flex flex-col gap-4">
        {typeof reset === "string" && <Notice tone="success">{p.resetDone(reset)}</Notice>}
        {typeof errorParam === "string" && <Notice tone="error">{errorParam}</Notice>}
        {error && <Notice tone="error">{t.common.loadFailed(error.message)}</Notice>}

        {pages.map((page) => {
          const seo = rows.get(page.path);
          const route = { path: page.path, title: page.title };
          const resolved = resolveSeo(pageSeoInput(route, seo, shared.settings, shared.indexable));
          const target = { kind: "page", route } as const;
          // What the title falls back to when the field is left empty.
          const fallbackTitle = resolveSeo(pageSeoInput(route, { ...seo, meta_title: null }, shared.settings, shared.indexable)).title;
          return (
            <details key={page.path} className="rounded-xl border border-line bg-white">
              <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 px-5 py-4 font-heading font-semibold text-ink">
                <span className="flex flex-col gap-1">
                  <span>{page.label}</span>
                  <span className="text-sm font-normal text-muted" dir="ltr">
                    {page.path}
                    {seo ? ` · ${p.customized}` : ""}
                  </span>
                </span>
                <SeoStates states={seoStates(resolved)} />
              </summary>
              <div className="border-t border-line p-5">
                {/* Remounts from the defaults after a successful reset, so the old values cannot be saved back. */}
                <AdminForm key={pageSeoFormKey(page.path, { reset, at })} action={savePageSeo} submitLabel={p.submit} guardUnsaved>
                  <input type="hidden" name="path" value={page.path} />
                  <Fieldset legend={t.seo.search} description={t.seo.searchDescription}>
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
                    <GooglePreview {...shared} target={target} />
                  </Fieldset>
                  <Fieldset legend={t.seo.social} description={t.seo.socialDescription}>
                    <TextField label="OG title" name="og_title" defaultValue={seo?.og_title} placeholder={t.seo.ogTitlePlaceholder} maxLength={200} wide />
                    <TextAreaField label="OG description" name="og_description" defaultValue={seo?.og_description} placeholder={t.seo.ogDescriptionPlaceholder} maxLength={500} />
                    <ImageField label="OG image" name="og_image_url" defaultValue={seo?.og_image_url} hint={p.ogImageHint} wide />
                    <SocialPreview {...shared} target={target} />
                  </Fieldset>
                  <Fieldset legend={t.seo.advanced} description={t.seo.advancedDescription}>
                    <TextField label="Canonical URL" name="canonical_url" defaultValue={seo?.canonical_url} dir="ltr" placeholder={p.canonicalPlaceholder} hint={t.seo.canonicalHint} wide />
                    <CheckboxField label="index" name="robots_index" defaultChecked={seo?.robots_index ?? true} hint={p.indexHint} />
                    <CheckboxField label="follow" name="robots_follow" defaultChecked={seo?.robots_follow ?? true} hint={t.seo.followHint} />
                  </Fieldset>
                </AdminForm>
                {seo && (
                  <form action={resetPageSeo} className="mt-4 flex justify-end">
                    <input type="hidden" name="path" value={page.path} />
                    <ConfirmSubmit message={p.resetConfirm} className={smallDangerButton}>
                      {p.reset}
                    </ConfirmSubmit>
                  </form>
                )}
              </div>
            </details>
          );
        })}
      </div>
    </>
  );
}
