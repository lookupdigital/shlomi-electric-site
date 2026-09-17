import type { Metadata } from "next";
import { createRedirect, deleteRedirect, toggleRedirect } from "@/lookup/admin/actions/redirects";
import AdminForm from "@/lookup/admin/AdminForm";
import ConfirmSubmit from "@/lookup/admin/ConfirmSubmit";
import { t } from "@/lookup/admin/i18n";
import { smallButton, smallDangerButton } from "@/lookup/admin/styles";
import { CheckboxField, Fieldset, formatDateTime, Notice, PageHeader, SelectField, TextField } from "@/lookup/admin/ui";
import { requireAdmin } from "@/lookup/auth";

export const metadata: Metadata = { title: t.redirects.title };

export default async function RedirectsPage({ searchParams }: PageProps<"/admin/redirects">) {
  const { supabase } = await requireAdmin();
  const { error: errorParam } = await searchParams;
  const { data: rules, error } = await supabase.from("redirects").select("*").order("created_at", { ascending: false });
  const r = t.redirects;

  return (
    <>
      <PageHeader title={r.title} description={r.description} />
      <div className="flex flex-col gap-6">
        {typeof errorParam === "string" && <Notice tone="error">{errorParam}</Notice>}
        {error && <Notice tone="error">{t.common.loadFailed(error.message)}</Notice>}

        <AdminForm action={createRedirect} submitLabel={r.submit}>
          <Fieldset legend={r.newRedirect}>
            <TextField label={r.source} name="source_path" dir="ltr" placeholder="/old-page" required />
            <TextField label={r.destination} name="destination" dir="ltr" placeholder="/new-page · https://…" required />
            <SelectField
              label={r.type}
              name="status_code"
              defaultValue="301"
              options={[
                { value: "301", label: r.permanent },
                { value: "302", label: r.temporary },
              ]}
            />
            <CheckboxField label={r.active} name="active" defaultChecked />
          </Fieldset>
        </AdminForm>

        <div className="overflow-x-auto rounded-xl border border-line bg-white">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-offwhite text-muted">
              <tr>
                {[r.columns.source, r.columns.destination, r.columns.type, r.columns.status, r.columns.updated, ""].map((heading, index) => (
                  <th key={index} className="px-4 py-3 text-start font-semibold">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rules?.map((rule) => (
                <tr key={rule.id}>
                  <td className="px-4 py-3 font-semibold" dir="ltr">
                    {rule.source_path}
                  </td>
                  <td className="max-w-[260px] truncate px-4 py-3" dir="ltr" title={rule.destination}>
                    {rule.destination}
                  </td>
                  <td className="px-4 py-3">{rule.status_code}</td>
                  <td className="px-4 py-3">{rule.active ? r.active : r.inactive}</td>
                  <td className="px-4 py-3 text-muted">{formatDateTime(rule.updated_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <form action={toggleRedirect}>
                        <input type="hidden" name="id" value={rule.id} />
                        <input type="hidden" name="activate" value={rule.active ? "0" : "1"} />
                        <button type="submit" className={smallButton}>
                          {rule.active ? r.deactivate : r.activate}
                        </button>
                      </form>
                      <form action={deleteRedirect}>
                        <input type="hidden" name="id" value={rule.id} />
                        <ConfirmSubmit message={r.deleteConfirm} className={smallDangerButton}>
                          {r.delete}
                        </ConfirmSubmit>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
              {!rules?.length && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted">
                    {r.empty}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
