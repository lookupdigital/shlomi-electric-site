import Link from "next/link";
import { Card, formatDateTime, Notice, PageHeader } from "@/lookup/admin/ui";
import { requireAdmin } from "@/lookup/auth";

type AdminClient = Awaited<ReturnType<typeof requireAdmin>>["supabase"];

function loadDashboard(supabase: AdminClient) {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  return Promise.all([
    supabase.from("leads").select("id", { count: "exact", head: true }),
    supabase.from("leads").select("id", { count: "exact", head: true }).gte("created_at", weekAgo),
    supabase.from("posts").select("id", { count: "exact", head: true }).eq("status", "published"),
    supabase.from("posts").select("id", { count: "exact", head: true }).eq("status", "draft"),
    supabase.from("redirects").select("id", { count: "exact", head: true }).eq("active", true),
    supabase.from("site_settings").select("indexing_enabled,gtm_id").eq("id", 1).maybeSingle(),
    supabase
      .from("leads")
      .select("id,created_at,name,form_name,utm_source,utm_campaign")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);
}

export default async function AdminDashboardPage() {
  const { supabase } = await requireAdmin();
  const [leadsTotal, leadsWeek, published, drafts, redirects, settings, recentLeads] = await loadDashboard(supabase);

  const schemaMissing = [leadsTotal, published, settings].some((result) => result.error);
  const stats = [
    { label: "לידים (7 ימים)", value: leadsWeek.count ?? 0, href: "/admin/leads" },
    { label: "לידים (סה״כ)", value: leadsTotal.count ?? 0, href: "/admin/leads" },
    { label: "פוסטים שפורסמו", value: published.count ?? 0, href: "/admin/posts" },
    { label: "טיוטות", value: drafts.count ?? 0, href: "/admin/posts" },
    { label: "הפניות פעילות", value: redirects.count ?? 0, href: "/admin/redirects" },
  ];

  return (
    <>
      <PageHeader title="דשבורד" />
      <div className="flex flex-col gap-6">
        {schemaMissing && (
          <Notice tone="error">לא ניתן לקרוא את טבלאות האתר. ודאו שהמיגרציות של Supabase הורצו (supabase/migrations).</Notice>
        )}
        {!settings.error && !settings.data?.indexing_enabled && (
          <Notice tone="warning">
            האינדוקס במנועי חיפוש כבוי. ניתן להפעיל ב<Link href="/admin/settings" className="underline">הגדרות האתר</Link>{" "}
            כשהתוכן האמיתי מוכן.
          </Notice>
        )}
        {!settings.error && !settings.data?.gtm_id && (
          <Notice>Google Tag Manager עדיין לא הוגדר — אירועי המעקב נאספים ב-dataLayer אך לא נשלחים לשום כלי.</Notice>
        )}

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
          {stats.map((stat) => (
            <Link key={stat.label} href={stat.href}>
              <Card className="transition-colors hover:border-brand">
                <p className="text-sm text-muted">{stat.label}</p>
                <p className="font-heading text-3xl font-semibold text-ink">{stat.value}</p>
              </Card>
            </Link>
          ))}
        </div>

        <Card>
          <h2 className="mb-4 font-heading text-lg font-semibold text-ink">לידים אחרונים</h2>
          {recentLeads.data?.length ? (
            <ul className="divide-y divide-line">
              {recentLeads.data.map((lead) => (
                <li key={lead.id}>
                  <Link href={`/admin/leads/${lead.id}`} className="flex flex-wrap justify-between gap-2 py-3 hover:text-brand-dark">
                    <span className="font-semibold">{lead.name}</span>
                    <span className="text-sm text-muted">
                      {lead.form_name} · {lead.utm_source ?? "ללא מקור"} · {formatDateTime(lead.created_at)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">עדיין אין לידים.</p>
          )}
        </Card>
      </div>
    </>
  );
}
