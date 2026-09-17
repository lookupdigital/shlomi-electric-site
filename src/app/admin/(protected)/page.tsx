import Link from "next/link";
import { t } from "@/lookup/admin/i18n";
import { Card, formatDateTime, LeadStatusBadge, Notice, PageHeader } from "@/lookup/admin/ui";
import { requireAdmin } from "@/lookup/auth";
import { isLeadWebhookConfigured } from "@/lookup/leads/notify";
import { isPublicSignupDisabled } from "@/lookup/supabase/auth-settings";

type AdminClient = Awaited<ReturnType<typeof requireAdmin>>["supabase"];

function loadDashboard(supabase: AdminClient) {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const leadCount = () => supabase.from("leads").select("id", { count: "exact", head: true }).eq("is_test", false);
  const postCount = () => supabase.from("posts").select("id", { count: "exact", head: true });
  return Promise.all([
    leadCount(),
    leadCount().gte("created_at", weekAgo),
    leadCount().eq("status", "new"),
    leadCount().eq("notification_status", "failed"),
    postCount().eq("status", "published"),
    postCount().eq("status", "draft"),
    supabase.from("redirects").select("id", { count: "exact", head: true }).eq("active", true),
    supabase.from("site_settings").select("indexing_enabled,gtm_id").eq("id", 1).maybeSingle(),
    supabase
      .from("leads")
      .select("id,created_at,name,form_name,utm_source,status")
      .eq("is_test", false)
      .order("created_at", { ascending: false })
      .limit(5),
    isPublicSignupDisabled(),
  ]);
}

export default async function AdminDashboardPage() {
  const { supabase } = await requireAdmin();
  const [leadsTotal, leadsWeek, leadsNew, notificationFailures, published, drafts, redirects, settings, recentLeads, signupDisabled] =
    await loadDashboard(supabase);

  const d = t.dashboard;
  const schemaMissing = [leadsTotal, published, settings].some((result) => result.error);
  const stats = [
    { label: d.stats.newLeads, value: leadsNew.count ?? 0, href: "/admin/leads?status=new" },
    { label: d.stats.leadsWeek, value: leadsWeek.count ?? 0, href: "/admin/leads" },
    { label: d.stats.leadsTotal, value: leadsTotal.count ?? 0, href: "/admin/leads" },
    { label: d.stats.published, value: published.count ?? 0, href: "/admin/posts" },
    { label: d.stats.drafts, value: drafts.count ?? 0, href: "/admin/posts" },
    { label: d.stats.redirects, value: redirects.count ?? 0, href: "/admin/redirects" },
  ];

  return (
    <>
      <PageHeader title={d.title} />
      <div className="flex flex-col gap-4">
        {signupDisabled === false && <Notice tone="error">{d.signupEnabled}</Notice>}
        {schemaMissing && <Notice tone="error">{d.schemaMissing}</Notice>}
        {(notificationFailures.count ?? 0) > 0 && <Notice tone="warning">{d.notificationFailures(notificationFailures.count ?? 0)}</Notice>}
        {!isLeadWebhookConfigured() && <Notice tone="warning">{d.webhookMissing}</Notice>}
        {!settings.error && !settings.data?.indexing_enabled && <Notice tone="warning">{d.indexingOff}</Notice>}
        {!settings.error && !settings.data?.gtm_id && <Notice>{d.gtmMissing}</Notice>}

        <div className="mt-2 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
          {stats.map((stat) => (
            <Link key={stat.label} href={stat.href}>
              <Card className="h-full transition-colors hover:border-brand">
                <p className="text-sm text-muted">{stat.label}</p>
                <p className="font-heading text-3xl font-semibold text-ink">{stat.value}</p>
              </Card>
            </Link>
          ))}
        </div>

        <Card>
          <h2 className="mb-4 font-heading text-lg font-semibold text-ink">{d.recentLeads}</h2>
          {recentLeads.data?.length ? (
            <ul className="divide-y divide-line">
              {recentLeads.data.map((lead) => (
                <li key={lead.id}>
                  <Link href={`/admin/leads/${lead.id}`} className="flex flex-wrap items-center justify-between gap-2 py-3 hover:text-brand-dark">
                    <span className="flex items-center gap-2 font-semibold">
                      {lead.name} <LeadStatusBadge status={lead.status} />
                    </span>
                    <span className="text-sm text-muted">
                      {lead.form_name} · {lead.utm_source ?? d.noSource} · {formatDateTime(lead.created_at)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">{d.noLeads}</p>
          )}
        </Card>
      </div>
    </>
  );
}
