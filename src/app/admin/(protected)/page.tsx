import Link from "next/link";
import { t } from "@/lookup/admin/i18n";
import { zonedPeriodStarts } from "@/lookup/admin/readiness";
import { getSiteReport } from "@/lookup/admin/site-report";
import { AttentionList, HealthBadge, SectionCard, SiteStateBanner } from "@/lookup/admin/status-ui";
import { secondaryButton } from "@/lookup/admin/styles";
import { formatDateTime, LeadStatusBadge, Notice, PageHeader } from "@/lookup/admin/ui";
import { requireAdmin } from "@/lookup/auth";
import { siteConfig } from "@/site.config";

type AdminClient = Awaited<ReturnType<typeof requireAdmin>>["supabase"];

// Count-only queries (head: true) plus the five most recent leads. Test leads are never counted.
function loadActivity(supabase: AdminClient) {
  const now = new Date();
  const nowIso = now.toISOString();
  const { day, month } = zonedPeriodStarts(now, siteConfig.locale.timeZone);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const leadCount = () => supabase.from("leads").select("id", { count: "exact", head: true }).eq("is_test", false);
  const postCount = () => supabase.from("posts").select("id", { count: "exact", head: true });
  return Promise.all([
    leadCount().gte("created_at", day.toISOString()),
    leadCount().gte("created_at", weekAgo),
    leadCount().gte("created_at", month.toISOString()),
    leadCount().eq("status", "new"),
    leadCount().eq("notification_status", "failed"),
    postCount().eq("status", "published").lte("published_at", nowIso),
    postCount().eq("status", "published").gt("published_at", nowIso),
    postCount().eq("status", "draft"),
    supabase.from("redirects").select("id", { count: "exact", head: true }).eq("active", true),
    supabase
      .from("leads")
      .select("id,created_at,name,form_name,utm_source,status")
      .eq("is_test", false)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);
}

function Stat({ label, value, href }: { label: string; value: number | null; href: string }) {
  return (
    <Link href={href} className="rounded-lg border border-line p-3 transition-colors hover:border-brand">
      <p className="text-xs text-muted">{label}</p>
      <p className="font-heading text-2xl font-semibold text-ink">{value ?? "—"}</p>
    </Link>
  );
}

const CRITICAL_HEALTH = new Set(["database", "leadStorage", "storage", "adminAuth"]);

export default async function AdminDashboardPage() {
  const { supabase } = await requireAdmin();
  const [report, activity] = await Promise.all([getSiteReport(), loadActivity(supabase)]);
  const [today, week, month, newLeads, failedNotifications, published, scheduled, drafts, redirects, recent] = activity;

  const d = t.dashboard;
  const { required, recommended } = report.readiness;
  const counts = { healthy: 0, warnings: 0, errors: 0 };
  for (const row of report.health) {
    if (row.status === "error") counts.errors += 1;
    else if (row.status === "warning") counts.warnings += 1;
    else if (row.status === "healthy" || row.status === "configured") counts.healthy += 1;
  }
  const failed = failedNotifications.count ?? 0;

  return (
    <>
      <PageHeader
        title={d.title}
        actions={
          <Link href="/admin" className={secondaryButton}>
            {d.refresh}
          </Link>
        }
      />
      <div className="flex flex-col gap-6">
        <SiteStateBanner
          report={report}
          action={
            <Link href="/admin/launch" className={secondaryButton}>
              {d.toLaunch}
            </Link>
          }
        />

        <SectionCard title={d.attention}>
          <AttentionList
            items={report.attention}
            extra={failed > 0 ? [<Notice key="failed" tone="warning">{d.notificationFailures(failed)}</Notice>] : undefined}
          />
        </SectionCard>

        <div className="grid gap-6 lg:grid-cols-3">
          <SectionCard title={d.readiness} link={{ href: "/admin/launch", label: d.fullChecklist }}>
            <p className="font-heading text-2xl font-semibold text-ink">
              {t.launch.levels.required} {required.done}/{required.total}
            </p>
            <p className="text-sm text-muted">
              {t.launch.levels.recommended} {recommended.done}/{recommended.total}
            </p>
          </SectionCard>

          <SectionCard title={d.health} link={{ href: "/admin/system", label: d.toSystem }}>
            <p className="text-sm text-muted">{d.healthCounts(counts.healthy, counts.warnings, counts.errors)}</p>
            <ul className="flex flex-col gap-2">
              {report.health
                .filter((row) => CRITICAL_HEALTH.has(row.id))
                .map((row) => (
                  <li key={row.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-ink">{t.system.rows[row.id]}</span>
                    <HealthBadge status={row.status} />
                  </li>
                ))}
            </ul>
          </SectionCard>

          <SectionCard title={d.integrations} link={{ href: "/admin/system#integrations", label: d.toSystem }}>
            <ul className="flex flex-col gap-2">
              {report.integrations
                .filter((row) => row.id !== "siteUrl")
                .map((row) => (
                  <li key={row.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-ink">{t.system.rows[row.id]}</span>
                    <HealthBadge status={row.status} />
                  </li>
                ))}
            </ul>
          </SectionCard>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <SectionCard title={d.leads} link={{ href: "/admin/leads", label: t.leads.title }}>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label={d.leadStats.today} value={today.count} href="/admin/leads" />
              <Stat label={d.leadStats.week} value={week.count} href="/admin/leads" />
              <Stat label={d.leadStats.month} value={month.count} href="/admin/leads" />
              <Stat label={d.leadStats.new} value={newLeads.count} href="/admin/leads?status=new" />
            </div>
            {recent.data?.[0] && <p className="text-xs text-muted">{d.lastLead(formatDateTime(recent.data[0].created_at))}</p>}
          </SectionCard>

          <SectionCard title={d.content} link={{ href: "/admin/posts", label: t.posts.title }}>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label={d.contentStats.published} value={published.count} href="/admin/posts" />
              <Stat label={d.contentStats.scheduled} value={scheduled.count} href="/admin/posts" />
              <Stat label={d.contentStats.drafts} value={drafts.count} href="/admin/posts" />
              <Stat label={d.contentStats.redirects} value={redirects.count} href="/admin/redirects" />
            </div>
          </SectionCard>
        </div>

        <SectionCard title={d.recentLeads}>
          {recent.data?.length ? (
            <ul className="divide-y divide-line">
              {recent.data.map((lead) => (
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
        </SectionCard>

        <SectionCard title={d.quickActions}>
          <div className="flex flex-wrap gap-2">
            {[
              { href: "/admin/settings", label: d.actions.settings },
              { href: "/admin/pages", label: d.actions.pages },
              { href: "/admin/posts/new", label: d.actions.newPost },
              { href: "/admin/leads", label: d.actions.leads },
              { href: "/admin/media", label: d.actions.media },
              { href: "/admin/redirects", label: d.actions.redirects },
              { href: "/admin/system#integrations", label: d.actions.integrations },
            ].map((action) => (
              <Link key={action.href} href={action.href} className={secondaryButton}>
                {action.label}
              </Link>
            ))}
          </div>
        </SectionCard>

      </div>
    </>
  );
}
