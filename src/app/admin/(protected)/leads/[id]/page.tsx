import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { secondaryButton } from "@/lookup/admin/styles";
import { Card, formatDateTime, PageHeader } from "@/lookup/admin/ui";
import { requireAdmin } from "@/lookup/auth";
import { leadSource } from "@/lookup/leads/source";

export const metadata: Metadata = { title: "פרטי ליד" };

type Row = [label: string, value: string | null | undefined, ltr?: boolean];

function DetailList({ rows }: { rows: Row[] }) {
  return (
    <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-[180px_1fr]">
      {rows.map(([label, value, ltr]) => (
        <div key={label} className="contents">
          <dt className="font-heading text-sm font-bold text-muted">{label}</dt>
          <dd className="break-words text-ink" dir={ltr ? "ltr" : undefined}>
            {value || "—"}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export default async function LeadDetailPage({ params }: PageProps<"/admin/leads/[id]">) {
  const { id } = await params;
  const { supabase } = await requireAdmin();
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const { data: lead } = await supabase.from("leads").select("*").eq("id", id).maybeSingle();
  if (!lead) notFound();
  const { source, campaign } = leadSource(lead);

  return (
    <>
      <PageHeader
        title={lead.name}
        description={formatDateTime(lead.created_at)}
        actions={
          <Link href="/admin/leads" className={secondaryButton}>
            חזרה ללידים
          </Link>
        }
      />
      <div className="flex flex-col gap-6">
        <Card>
          <h2 className="mb-4 font-heading text-lg font-semibold text-ink">פרטי הפנייה</h2>
          <DetailList
            rows={[
              ["שם", lead.name],
              ["טלפון", lead.phone, true],
              ["אימייל", lead.email, true],
              ["סוג פרויקט", lead.project_type],
              ["הודעה", lead.message],
              ["טופס", lead.form_name],
              ["אישור יצירת קשר", lead.consent ? "כן" : "לא"],
            ]}
          />
        </Card>
        <Card>
          <h2 className="mb-4 font-heading text-lg font-semibold text-ink">מקור ושיוך</h2>
          <DetailList
            rows={[
              ["מקור", source],
              ["קמפיין", campaign],
              ["דף נחיתה", lead.landing_page, true],
              ["מפנה (referrer)", lead.referrer, true],
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
    </>
  );
}
