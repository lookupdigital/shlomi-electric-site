import type { Metadata } from "next";
import { publicPages, siteDefaults } from "@/lib/site";
import { savePageSeo } from "@/lookup/admin/actions/pages";
import AdminForm from "@/lookup/admin/AdminForm";
import ImageField from "@/lookup/admin/ImageField";
import { CheckboxField, Fieldset, Notice, PageHeader, TextAreaField, TextField } from "@/lookup/admin/ui";
import { requireAdmin } from "@/lookup/auth";
import type { PageSeoRow } from "@/lookup/seo-model";

export const metadata: Metadata = { title: "עמודים ו-SEO" };

const PAGES = [...publicPages, { path: "/blog", label: "בלוג", title: "בלוג" }];

export default async function PagesSeoPage() {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.from("page_seo").select("*");
  const rows = new Map(((data ?? []) as PageSeoRow[]).map((row) => [row.path, row]));
  const siteName = siteDefaults.siteName;

  return (
    <>
      <PageHeader title="עמודים ו-SEO" description="שדה ריק = ברירת מחדל אוטומטית (מוצגת כ-placeholder)." />
      {error && <Notice tone="error">הטעינה נכשלה: {error.message}</Notice>}

      <div className="flex flex-col gap-4">
        {PAGES.map((page) => {
          const seo = rows.get(page.path);
          const fallbackTitle = page.title ? `${page.title} | ${siteName}` : siteName;
          return (
            <details key={page.path} className="rounded-xl border border-line bg-white" open={PAGES.length === 1}>
              <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 px-5 py-4 font-heading font-semibold text-ink">
                <span>{page.label}</span>
                <span className="text-sm font-normal text-muted" dir="ltr">
                  {page.path}
                  {seo && seo.robots_index === false ? " · noindex" : ""}
                </span>
              </summary>
              <div className="border-t border-line p-5">
                <AdminForm action={savePageSeo} submitLabel="שמירת SEO">
                  <input type="hidden" name="path" value={page.path} />
                  <Fieldset legend="Meta">
                    <TextField label="Meta title" name="meta_title" defaultValue={seo?.meta_title} placeholder={fallbackTitle} maxLength={200} wide />
                    <TextAreaField
                      label="Meta description"
                      name="meta_description"
                      defaultValue={seo?.meta_description}
                      placeholder={siteDefaults.defaultMetaDescription}
                      maxLength={500}
                    />
                    <TextField
                      label="Canonical URL"
                      name="canonical_url"
                      defaultValue={seo?.canonical_url}
                      dir="ltr"
                      placeholder="אוטומטי: כתובת האתר + הנתיב"
                      wide
                    />
                  </Fieldset>
                  <Fieldset legend="שיתוף (Open Graph)">
                    <TextField label="OG title" name="og_title" defaultValue={seo?.og_title} placeholder="ברירת מחדל: Meta title" />
                    <ImageField label="OG image" name="og_image_url" defaultValue={seo?.og_image_url} hint="ריק = תמונת השיתוף הכללית" />
                    <TextAreaField label="OG description" name="og_description" defaultValue={seo?.og_description} placeholder="ברירת מחדל: Meta description" />
                  </Fieldset>
                  <Fieldset legend="רובוטים">
                    <CheckboxField label="index" name="robots_index" defaultChecked={seo?.robots_index ?? true} hint="כבוי = העמוד לא יאונדקס ולא ייכלל ב-sitemap." />
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
