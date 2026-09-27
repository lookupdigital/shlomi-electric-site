import type { Metadata } from "next";
import { goLive, takeOffline } from "@/lookup/admin/actions/launch";
import AdminForm from "@/lookup/admin/AdminForm";
import ConfirmSubmit from "@/lookup/admin/ConfirmSubmit";
import { t } from "@/lookup/admin/i18n";
import { blockingItems, type CheckGroup } from "@/lookup/admin/readiness";
import { getSiteReport } from "@/lookup/admin/site-report";
import { CheckRow, SiteStateBanner } from "@/lookup/admin/status-ui";
import { dangerButton } from "@/lookup/admin/styles";
import { Card, Notice, PageHeader } from "@/lookup/admin/ui";

export const metadata: Metadata = { title: t.launch.title };

const GROUPS: CheckGroup[] = ["launch", "site", "seo", "leads"];

export default async function LaunchPage({ searchParams }: PageProps<"/admin/launch">) {
  const report = await getSiteReport();
  const { live, offline, error } = await searchParams;
  const l = t.launch;
  const { required, recommended } = report.readiness;
  const blocking = blockingItems(report.checklist);
  const isLive = report.state === "live";
  const production = report.facts.environment === "production";

  return (
    <>
      <PageHeader title={l.title} description={l.description} />
      <div className="flex flex-col gap-6">
        {live === "1" && <Notice tone="success">{l.wentLive}</Notice>}
        {offline === "1" && <Notice tone="success">{l.wentOffline}</Notice>}
        {typeof error === "string" && <Notice tone="error">{error}</Notice>}

        <SiteStateBanner report={report} />

        <Card>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-heading text-lg font-semibold text-ink">{t.dashboard.readiness}</h2>
            <span className="font-heading text-sm font-bold text-ink">{l.summary(required.done, required.total, recommended.done, recommended.total)}</span>
          </div>
          {GROUPS.map((group) => {
            const items = report.checklist.filter((item) => item.group === group);
            return (
              <section key={group} className="mt-4">
                <h3 className="font-heading text-sm font-bold text-muted">{l.groups[group]}</h3>
                <ul className="divide-y divide-line">
                  {items.map((item) => (
                    <CheckRow key={item.id} item={item} />
                  ))}
                </ul>
              </section>
            );
          })}
          <p className="mt-4 text-xs text-muted">{l.placeholderNote}</p>
        </Card>

        {isLive ? (
          <Card className="border-red-200">
            <h2 className="mb-2 font-heading text-lg font-semibold text-red-800">{l.offlineTitle}</h2>
            <p className="mb-3 text-sm text-muted">{l.offlineDescription}</p>
            <form action={takeOffline}>
              <ConfirmSubmit message={l.offlineConfirm} className={dangerButton}>
                {l.offlineSubmit}
              </ConfirmSubmit>
            </form>
          </Card>
        ) : (
          <Card>
            <h2 className="mb-2 font-heading text-lg font-semibold text-ink">{l.goLiveTitle}</h2>
            {!production ? (
              <Notice tone="info">{l.goLiveNotProduction}</Notice>
            ) : blocking.length > 0 ? (
              <Notice tone="warning">{l.goLiveBlocked(blocking.map((item) => l.checks[item.id].label).join(", "))}</Notice>
            ) : (
              <>
                <p className="mb-2 text-sm text-muted">{l.goLiveDescription}</p>
                <ul className="mb-4 list-disc ps-5 text-sm text-ink">
                  {report.checklist
                    .filter((item) => item.level === "required")
                    .map((item) => (
                      <li key={item.id}>{l.checks[item.id].label}</li>
                    ))}
                </ul>
                <AdminForm action={goLive} submitLabel={l.goLiveSubmit} variant="inline">
                  <label className="flex items-start gap-3">
                    <input type="checkbox" name="confirm" required className="consent mt-0.5" />
                    <span className="text-sm font-semibold text-ink">{l.goLiveConfirm}</span>
                  </label>
                </AdminForm>
              </>
            )}
          </Card>
        )}
      </div>
    </>
  );
}
