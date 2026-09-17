import type { Metadata } from "next";
import Link from "next/link";
import { t } from "@/lookup/admin/i18n";
import { primaryButton, secondaryButton, smallButton } from "@/lookup/admin/styles";
import { Badge, formatDateTime, LeadStatusBadge, Notice, PageHeader } from "@/lookup/admin/ui";
import { requireAdmin } from "@/lookup/auth";
import { applyLeadFilters, LEAD_STATUSES, leadFiltersToQuery, parseLeadFilters } from "@/lookup/leads/filters";
import { leadSource } from "@/lookup/leads/source";

export const metadata: Metadata = { title: t.leads.title };

const PAGE_SIZE = 50;
const COLUMNS =
  "id,created_at,name,phone,email,form_name,landing_page,referrer,utm_source,utm_medium,utm_campaign,gclid,gbraid,wbraid,fbclid,ttclid,status,is_test" as const;

const filterLabel = "text-xs font-bold text-ink";

export default async function LeadsPage({ searchParams }: PageProps<"/admin/leads">) {
  const { supabase } = await requireAdmin();
  const params = await searchParams;
  const filters = parseLeadFilters(params);
  const pageParam = Array.isArray(params.page) ? params.page[0] : params.page;
  const current = Math.max(1, Number(pageParam) || 1);
  const from = (current - 1) * PAGE_SIZE;

  const { data: leads, count, error } = await applyLeadFilters(supabase.from("leads").select(COLUMNS, { count: "exact" }), filters)
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  const l = t.leads;

  return (
    <>
      <PageHeader
        title={l.title}
        description={l.count(count ?? 0)}
        actions={
          <a href={`/admin/leads/export${leadFiltersToQuery(filters)}`} className={secondaryButton}>
            {l.exportCsv}
          </a>
        }
      />
      <div className="flex flex-col gap-4">
        {params.deleted === "1" && <Notice tone="success">{l.deleted}</Notice>}
        {error && <Notice tone="error">{t.common.loadFailed(error.message)}</Notice>}

        <form method="get" className="grid gap-3 rounded-xl border border-line bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex flex-col gap-1 sm:col-span-2">
            <span className={filterLabel}>{l.filters.search}</span>
            <input name="q" defaultValue={filters.q} className="field" />
          </label>
          <label className="flex flex-col gap-1">
            <span className={filterLabel}>{l.filters.status}</span>
            <select name="status" defaultValue={filters.status} className="field">
              <option value="all">{l.filters.allStatuses}</option>
              {LEAD_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {l.status[status]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className={filterLabel}>{l.filters.form}</span>
            <input name="form" defaultValue={filters.form} dir="ltr" className="field" />
          </label>
          <label className="flex flex-col gap-1">
            <span className={filterLabel}>{l.filters.source}</span>
            <input name="source" defaultValue={filters.source} dir="ltr" className="field" />
          </label>
          <label className="flex flex-col gap-1">
            <span className={filterLabel}>{l.filters.from}</span>
            <input type="date" name="from" defaultValue={filters.from} className="field" />
          </label>
          <label className="flex flex-col gap-1">
            <span className={filterLabel}>{l.filters.to}</span>
            <input type="date" name="to" defaultValue={filters.to} className="field" />
          </label>
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex items-center gap-2 pb-3 text-sm">
              <input type="checkbox" name="test" value="1" defaultChecked={filters.includeTest} className="consent" />
              {l.filters.includeTest}
            </label>
          </div>
          <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-4">
            <button type="submit" className={primaryButton}>
              {l.filters.apply}
            </button>
            <Link href="/admin/leads" className={secondaryButton}>
              {l.filters.reset}
            </Link>
          </div>
        </form>

        <div className="overflow-x-auto rounded-xl border border-line bg-white">
          <table className="w-full min-w-[1000px] text-sm">
            <thead className="bg-offwhite text-muted">
              <tr>
                {[l.columns.date, l.columns.name, l.columns.phone, l.columns.email, l.columns.form, l.columns.landing, l.columns.source, l.columns.status, ""].map(
                  (heading, index) => (
                    <th key={index} className="px-4 py-3 text-start font-semibold">
                      {heading}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {leads?.map((lead) => {
                const { source, campaign } = leadSource(lead, l.direct);
                return (
                  <tr key={lead.id} className="align-top">
                    <td className="whitespace-nowrap px-4 py-3 text-muted">{formatDateTime(lead.created_at)}</td>
                    <td className="px-4 py-3 font-semibold text-ink">
                      {lead.name}
                      {lead.is_test && (
                        <span className="ms-2">
                          <Badge tone="muted">{l.testBadge}</Badge>
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3" dir="ltr">
                      <a href={`tel:${lead.phone}`} className="hover:text-brand-dark">
                        {lead.phone}
                      </a>
                    </td>
                    <td className="px-4 py-3" dir="ltr">
                      {lead.email ?? t.common.empty}
                    </td>
                    <td className="px-4 py-3">{lead.form_name}</td>
                    <td className="max-w-[180px] truncate px-4 py-3" dir="ltr" title={lead.landing_page ?? ""}>
                      {lead.landing_page ?? t.common.empty}
                    </td>
                    <td className="px-4 py-3">
                      <span className="block">{source}</span>
                      {campaign && <span className="block text-xs text-muted">{campaign}</span>}
                    </td>
                    <td className="px-4 py-3">
                      <LeadStatusBadge status={lead.status} />
                    </td>
                    <td className="px-4 py-3 text-end">
                      <Link href={`/admin/leads/${lead.id}`} className={smallButton}>
                        {t.common.details}
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {!leads?.length && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-muted">
                    {l.empty}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <nav className="flex items-center justify-center gap-3 text-sm" aria-label={l.title}>
            {current > 1 && (
              <Link href={`/admin/leads${leadFiltersToQuery(filters, { page: String(current - 1) })}`} className={smallButton}>
                {t.common.previous}
              </Link>
            )}
            <span className="text-muted">{t.common.pageOf(current, totalPages)}</span>
            {current < totalPages && (
              <Link href={`/admin/leads${leadFiltersToQuery(filters, { page: String(current + 1) })}`} className={smallButton}>
                {t.common.next}
              </Link>
            )}
          </nav>
        )}
      </div>
    </>
  );
}
