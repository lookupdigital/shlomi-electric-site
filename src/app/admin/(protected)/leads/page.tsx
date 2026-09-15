import type { Metadata } from "next";
import Link from "next/link";
import { smallButton } from "@/lookup/admin/styles";
import { formatDateTime, Notice, PageHeader } from "@/lookup/admin/ui";
import { requireAdmin } from "@/lookup/auth";
import { leadSource } from "@/lookup/leads/source";

export const metadata: Metadata = { title: "לידים" };

const PAGE_SIZE = 50;

export default async function LeadsPage({ searchParams }: PageProps<"/admin/leads">) {
  const { supabase } = await requireAdmin();
  const { page } = await searchParams;
  const current = Math.max(1, Number(Array.isArray(page) ? page[0] : page) || 1);
  const from = (current - 1) * PAGE_SIZE;

  const { data: leads, count, error } = await supabase
    .from("leads")
    .select(
      "id,created_at,name,phone,email,form_name,landing_page,referrer,utm_source,utm_medium,utm_campaign,gclid,gbraid,wbraid,fbclid,ttclid",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  return (
    <>
      <PageHeader title="לידים" description={`${count ?? 0} לידים`} />
      {error && <Notice tone="error">הטעינה נכשלה: {error.message}</Notice>}

      <div className="overflow-x-auto rounded-xl border border-line bg-white">
        <table className="w-full min-w-[960px] text-sm">
          <thead className="bg-offwhite text-muted">
            <tr>
              {["תאריך", "שם", "טלפון", "אימייל", "טופס", "דף נחיתה", "מקור / קמפיין", ""].map((heading) => (
                <th key={heading} className="px-4 py-3 text-start font-semibold">
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {leads?.map((lead) => {
              const { source, campaign } = leadSource(lead);
              return (
                <tr key={lead.id} className="align-top">
                  <td className="whitespace-nowrap px-4 py-3 text-muted">{formatDateTime(lead.created_at)}</td>
                  <td className="px-4 py-3 font-semibold text-ink">{lead.name}</td>
                  <td className="whitespace-nowrap px-4 py-3" dir="ltr">
                    <a href={`tel:${lead.phone}`} className="hover:text-brand-dark">
                      {lead.phone}
                    </a>
                  </td>
                  <td className="px-4 py-3" dir="ltr">
                    {lead.email ?? "—"}
                  </td>
                  <td className="px-4 py-3">{lead.form_name}</td>
                  <td className="max-w-[180px] truncate px-4 py-3" dir="ltr" title={lead.landing_page ?? ""}>
                    {lead.landing_page ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className="block">{source}</span>
                    {campaign && <span className="block text-xs text-muted">{campaign}</span>}
                  </td>
                  <td className="px-4 py-3 text-end">
                    <Link href={`/admin/leads/${lead.id}`} className={smallButton}>
                      פרטים
                    </Link>
                  </td>
                </tr>
              );
            })}
            {!leads?.length && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-muted">
                  עדיין אין לידים.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <nav className="mt-6 flex items-center justify-center gap-3 text-sm" aria-label="עמודים">
          {current > 1 && (
            <Link href={`/admin/leads?page=${current - 1}`} className={smallButton}>
              הקודם
            </Link>
          )}
          <span className="text-muted">
            עמוד {current} מתוך {totalPages}
          </span>
          {current < totalPages && (
            <Link href={`/admin/leads?page=${current + 1}`} className={smallButton}>
              הבא
            </Link>
          )}
        </nav>
      )}
    </>
  );
}
