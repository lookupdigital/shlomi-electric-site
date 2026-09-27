import type { Metadata } from "next";
import Link from "next/link";
import { sendTestWebhook } from "@/lookup/admin/actions/integrations";
import AdminForm from "@/lookup/admin/AdminForm";
import { t } from "@/lookup/admin/i18n";
import { getSiteReport } from "@/lookup/admin/site-report";
import { healthAction } from "@/lookup/admin/next-action";
import { ActionLink, HealthBadge, HealthList } from "@/lookup/admin/status-ui";
import { secondaryButton } from "@/lookup/admin/styles";
import { Card, PageHeader } from "@/lookup/admin/ui";

export const metadata: Metadata = { title: t.system.title };

/** The Turnstile site key is public by design; shortened so the page stays readable. */
const shortKey = (value: string) => (value.length > 12 ? `${value.slice(0, 8)}…${value.slice(-4)}` : value);

export default async function SystemPage() {
  const report = await getSiteReport();
  const i = t.integrations;
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

  const identifiers: Record<string, string | undefined> = {
    supabase: report.supabaseHost || undefined,
    turnstile: turnstileSiteKey ? shortKey(turnstileSiteKey) : undefined,
  };

  return (
    <>
      <PageHeader
        title={t.system.title}
        description={t.system.description}
        actions={
          <Link href="/admin/system" className={secondaryButton}>
            {t.dashboard.refresh}
          </Link>
        }
      />
      <div className="flex flex-col gap-6">
        <Card>
          <h2 className="mb-2 font-heading text-lg font-semibold text-ink">{t.system.health}</h2>
          <HealthList rows={report.health} />
        </Card>

        <section id="integrations" className="flex scroll-mt-6 flex-col gap-4">
          <h2 className="font-heading text-xl font-semibold text-ink">{i.title}</h2>
          {report.integrations.map((row) => {
            const item = i.items[row.id as keyof typeof i.items];
            const identifier = row.identifier ?? identifiers[row.id];
            const broken = row.status === "warning" || row.status === "error";
            // Settings that live in Admin (site URL, GTM) get a direct link; env-based integrations are explained here.
            const action = healthAction(row);
            const inAdminAction = action && !action.href.startsWith("/admin/system") ? action : null;
            return (
              <div key={row.id} id={`integration-${row.id}`} className="scroll-mt-6">
                <Card className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-heading text-lg font-semibold text-ink">{t.system.rows[row.id]}</h3>
                    <span className="flex items-center gap-3">
                      <ActionLink action={inAdminAction} />
                      <HealthBadge status={row.status} />
                    </span>
                  </div>
                  <p className="text-sm text-ink">{item.what}</p>
                  {identifier && (
                    <p className="text-sm text-muted">
                      {i.identifier}: <bdi dir="ltr" className="font-semibold text-ink">{identifier}</bdi>
                    </p>
                  )}
                  {broken || row.status === "optional" ? (
                    <div className={`rounded-lg border px-4 py-3 text-sm ${broken ? "border-amber-300 bg-amber-50" : "border-line bg-offwhite"}`}>
                      <p className="mb-1 font-heading font-bold text-ink">{broken ? i.howToFix : i.howToConfigure}</p>
                      {row.note && <p className="mb-1 text-ink">{t.system.notes[row.note]}</p>}
                      <p className="text-muted">{item.setup}</p>
                    </div>
                  ) : (
                    <>
                      {row.note && <p className="text-sm text-muted">{t.system.notes[row.note]}</p>}
                      <p className="text-xs text-muted">
                        {i.howToSet}: {item.setup}
                      </p>
                    </>
                  )}
                  {row.id === "webhook" && report.facts.webhook.url === "valid" && (
                    <div className="mt-2 border-t border-line pt-4">
                      <p className="mb-3 text-sm text-muted">{i.webhookTestDescription}</p>
                      <AdminForm action={sendTestWebhook} submitLabel={i.webhookTest} variant="inline">
                        {null}
                      </AdminForm>
                    </div>
                  )}
                </Card>
              </div>
            );
          })}
        </section>
      </div>
    </>
  );
}
