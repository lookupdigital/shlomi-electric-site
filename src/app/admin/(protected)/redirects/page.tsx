import type { Metadata } from "next";
import { createRedirect, deleteRedirect, toggleRedirect } from "@/lookup/admin/actions/redirects";
import AdminForm from "@/lookup/admin/AdminForm";
import { dangerButton, smallButton } from "@/lookup/admin/styles";
import { CheckboxField, Fieldset, formatDateTime, Notice, PageHeader, TextField } from "@/lookup/admin/ui";
import { requireAdmin } from "@/lookup/auth";

export const metadata: Metadata = { title: "הפניות" };

type RedirectRow = {
  id: string;
  source_path: string;
  destination: string;
  status_code: number;
  active: boolean;
  updated_at: string;
};

export default async function RedirectsPage({ searchParams }: PageProps<"/admin/redirects">) {
  const { supabase } = await requireAdmin();
  const { error: errorParam } = await searchParams;
  const { data, error } = await supabase.from("redirects").select("*").order("created_at", { ascending: false });
  const rules = (data ?? []) as RedirectRow[];

  return (
    <>
      <PageHeader
        title="הפניות (Redirects)"
        description="הפניה מנתיב ישן לנתיב חדש. שינויים נכנסים לתוקף תוך כדקה. עמודי הליבה (/, /projects, /contact) אינם ניתנים להפניה."
      />
      <div className="flex flex-col gap-6">
        {typeof errorParam === "string" && <Notice tone="error">{errorParam}</Notice>}
        {error && <Notice tone="error">הטעינה נכשלה: {error.message}</Notice>}

        <AdminForm action={createRedirect} submitLabel="הוספת הפניה">
          <Fieldset legend="הפניה חדשה">
            <TextField label="מנתיב" name="source_path" dir="ltr" placeholder="/old-page" required />
            <TextField label="אל" name="destination" dir="ltr" placeholder="/new-page או https://…" required />
            <label className="flex flex-col gap-1.5">
              <span className="font-heading text-sm font-bold text-ink">סוג</span>
              <select name="status_code" defaultValue="301" className="field">
                <option value="301">301 — קבועה</option>
                <option value="302">302 — זמנית</option>
              </select>
            </label>
            <CheckboxField label="פעילה" name="active" defaultChecked />
          </Fieldset>
        </AdminForm>

        <div className="overflow-x-auto rounded-xl border border-line bg-white">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-offwhite text-muted">
              <tr>
                {["מנתיב", "אל", "סוג", "סטטוס", "עודכן", ""].map((heading) => (
                  <th key={heading} className="px-4 py-3 text-start font-semibold">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rules.map((rule) => (
                <tr key={rule.id}>
                  <td className="px-4 py-3 font-semibold" dir="ltr">
                    {rule.source_path}
                  </td>
                  <td className="max-w-[260px] truncate px-4 py-3" dir="ltr" title={rule.destination}>
                    {rule.destination}
                  </td>
                  <td className="px-4 py-3">{rule.status_code}</td>
                  <td className="px-4 py-3">{rule.active ? "פעילה" : "מושבתת"}</td>
                  <td className="px-4 py-3 text-muted">{formatDateTime(rule.updated_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <form action={toggleRedirect}>
                        <input type="hidden" name="id" value={rule.id} />
                        <input type="hidden" name="activate" value={rule.active ? "0" : "1"} />
                        <button type="submit" className={smallButton}>
                          {rule.active ? "השבתה" : "הפעלה"}
                        </button>
                      </form>
                      <form action={deleteRedirect}>
                        <input type="hidden" name="id" value={rule.id} />
                        <button type="submit" className={dangerButton}>
                          מחיקה
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
              {rules.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted">
                    אין הפניות.
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
