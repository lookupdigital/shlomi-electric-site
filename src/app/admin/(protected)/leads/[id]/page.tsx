import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteLead, resendLeadNotification, updateLeadStatus } from "@/lookup/admin/actions/leads";
import AdminForm from "@/lookup/admin/AdminForm";
import { t } from "@/lookup/admin/i18n";
import { secondaryButton } from "@/lookup/admin/styles";
import { Badge, Card, formatDateTime, LeadStatusBadge, PageHeader, type Tone } from "@/lookup/admin/ui";
import { requireAdmin } from "@/lookup/auth";
import { LEAD_STATUSES } from "@/lookup/leads/filters";
import { leadSource } from "@/lookup/leads/source";

export const metadata: Metadata = { title: t.leads.detailTitle };

const UUID = /^[0-9a-f-]{36}$/i;

type Row = [label: string, value: string | null | undefined, ltr?: boolean];

function DetailList({ rows }: { rows: Row[] }) {
  return (
    <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-[180px_1fr]">
      {rows.map(([label, value, ltr]) => (
        <div key={label} className="contents">
          <dt className="font-heading text-sm font-bold text-muted">{label}</dt>
          <dd className="break-words text-ink" dir={ltr ? "ltr" : undefined}>
            {value || t.common.empty}
          </dd>
        </div>
      ))}
    </dl>
  );
}

const NOTIFICATION_TONES: Record<string, Tone> = { sent: "success", failed: "error", pending: "warning", skipped: "muted" };

export default async function LeadDetailPage({ params }: PageProps<"/admin/leads/[id]">) {
  const { id } = await params;
  const { supabase } = await requireAdmin();
  if (!UUID.test(id)) notFound();

  const { data: lead } = await supabase.from("leads").select("*").eq("id", id).maybeSingle();
  if (!lead) notFound();

  const l = t.leads;
  const { source, campaign } = leadSource(lead, l.direct);
  const notificationLabel = l.notificationStatus[lead.notification_status as keyof typeof l.notificationStatus] ?? lead.notification_status;

  return (
    <>
      <PageHeader
        title={lead.name}
        description={formatDateTime(lead.created_at)}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <LeadStatusBadge status={lead.status} />
            {lead.is_test && <Badge tone="muted">{l.testBadge}</Badge>}
            <Link href="/admin/leads" className={secondaryButton}>
              {l.backToList}
            </Link>
          </div>
        }
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-6 lg:col-span-2">
          <Card>
            <h2 className="mb-4 font-heading text-lg font-semibold text-ink">{l.request}</h2>
            <DetailList
              rows={[
                [l.fields.name, lead.name],
                [l.fields.phone, lead.phone, true],
                [l.fields.email, lead.email, true],
                [l.fields.projectType, lead.project_type],
                [l.fields.message, lead.message],
                [l.fields.form, lead.form_name],
                [l.fields.consent, lead.consent ? t.common.yes : t.common.no],
              ]}
            />
          </Card>
          <Card>
            <h2 className="mb-4 font-heading text-lg font-semibold text-ink">{l.attribution}</h2>
            <DetailList
              rows={[
                [l.fields.source, source],
                [l.fields.campaign, campaign],
                [l.fields.landing, lead.landing_page, true],
                [l.fields.referrer, lead.referrer, true],
                ["utm_source", lead.utm_source, true],
                ["utm_medium", lead.utm_medium, true],
                ["utm_campaign", lead.utm_campaign, true],
                ["utm_content", lead.utm_content, true],
                ["utm_term", lead.utm_term, true],
                ["gclid", lead.gclid, true],
                ["gbraid", lead.gbraid, true],
                ["wbraid", lead.wbraid, true],
                ["fbclid", lead.fbclid, true],
                ["ttclid", lead.ttclid, true],
              ]}
            />
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          <Card>
            <h2 className="mb-4 font-heading text-lg font-semibold text-ink">{l.workflow}</h2>
            <AdminForm action={updateLeadStatus} submitLabel={l.updateStatus} variant="inline">
              <input type="hidden" name="id" value={lead.id} />
              <select name="status" defaultValue={lead.status} className="field" aria-label={l.columns.status}>
                {LEAD_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {l.status[status]}
                  </option>
                ))}
              </select>
            </AdminForm>
          </Card>

          <Card>
            <h2 className="mb-3 font-heading text-lg font-semibold text-ink">{l.notification}</h2>
            <div className="mb-3 flex flex-col gap-1">
              <Badge tone={NOTIFICATION_TONES[lead.notification_status] ?? "muted"}>{notificationLabel}</Badge>
              {lead.notified_at && <span className="text-xs text-muted">{formatDateTime(lead.notified_at)}</span>}
              {lead.notification_error && (
                <span className="break-words text-xs text-red-700" dir="ltr">
                  {l.notificationError}: {lead.notification_error}
                </span>
              )}
            </div>
            <AdminForm action={resendLeadNotification} submitLabel={l.resendNotification} variant="inline">
              <input type="hidden" name="id" value={lead.id} />
            </AdminForm>
          </Card>

          <Card className="border-red-200">
            <h2 className="mb-2 font-heading text-lg font-semibold text-red-800">{l.deleteTitle}</h2>
            <p className="mb-3 text-sm text-muted">
              {l.deleteDescription} <strong className="text-ink">{l.deleteConfirmWord}</strong>
            </p>
            <AdminForm action={deleteLead} submitLabel={l.deleteSubmit} variant="inline" danger>
              <input type="hidden" name="id" value={lead.id} />
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-bold text-ink">{l.deleteConfirmLabel}</span>
                <input name="confirm" required autoComplete="off" className="field" />
              </label>
            </AdminForm>
          </Card>
        </div>
      </div>
    </>
  );
}
