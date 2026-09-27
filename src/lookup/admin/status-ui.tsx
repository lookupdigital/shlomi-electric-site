import Link from "next/link";
import { t } from "@/lookup/admin/i18n";
import { checkAction, healthAction, type NextAction } from "@/lookup/admin/next-action";
import type { AttentionItem, CheckItem, HealthRow, HealthStatus, SiteState } from "@/lookup/admin/readiness";
import type { SiteReport } from "@/lookup/admin/site-report";
import { Badge, Card, type Tone } from "@/lookup/admin/ui";

// Status building blocks shared by the dashboard, launch and system pages (server-safe, no secrets: they render
// only labels, statuses and public identifiers from the site report).

const HEALTH_TONES: Record<HealthStatus, Tone> = {
  healthy: "success",
  configured: "success",
  optional: "muted",
  info: "info",
  warning: "warning",
  error: "error",
};

export function HealthBadge({ status }: { status: HealthStatus }) {
  return <Badge tone={HEALTH_TONES[status]}>{t.status[status]}</Badge>;
}

/** The row's one contextual action. Optional-integration setup links are quiet so they never read as required. */
export function ActionLink({ action }: { action: NextAction | null }) {
  if (!action) return null;
  const style = action.optional
    ? "text-xs font-semibold text-muted underline-offset-2 hover:text-ink hover:underline"
    : "text-xs font-semibold text-brand-dark hover:underline";
  return (
    <Link href={action.href} className={`whitespace-nowrap ${style}`}>
      {action.label}
    </Link>
  );
}

const STATE_STYLES: Record<SiteState, string> = {
  development: "border-amber-300 bg-amber-50",
  ready: "border-sky-300 bg-sky-50",
  live: "border-green-300 bg-green-50",
};

const STATE_TONES: Record<SiteState, Tone> = { development: "warning", ready: "info", live: "success" };

export function SiteStateBanner({ report, action }: { report: SiteReport; action?: React.ReactNode }) {
  const { state, facts } = report;
  const production = facts.environment === "production";
  const indexingLabel = !facts.settings?.indexing_enabled
    ? t.siteState.indexingOff
    : production
      ? t.siteState.indexingEffective
      : t.siteState.indexingNoEffect;
  return (
    <div className={`flex flex-wrap items-center justify-between gap-4 rounded-xl border p-5 lg:p-6 ${STATE_STYLES[state]}`}>
      <div className="flex min-w-0 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-heading text-sm font-bold text-muted">{t.dashboard.siteStatus}</span>
          <Badge tone={STATE_TONES[state]}>{t.siteState[state].label}</Badge>
          <Badge tone="muted">{t.siteState.environment[facts.environment]}</Badge>
        </div>
        <p className="font-heading text-lg font-semibold text-ink">
          {state === "live" && !production ? t.siteState.liveNoEffect : t.siteState[state].description}
        </p>
        <p className="text-sm text-muted">{indexingLabel}</p>
      </div>
      {action}
    </div>
  );
}

export function HealthList({ rows }: { rows: HealthRow[] }) {
  return (
    <ul className="divide-y divide-line">
      {rows.map((row) => {
        return (
          <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="font-semibold text-ink">{t.system.rows[row.id]}</span>
              {(row.note || row.identifier) && (
                <span className="text-xs text-muted">
                  {row.note && t.system.notes[row.note]}
                  {row.note && row.identifier ? " · " : ""}
                  {row.identifier && <bdi dir="ltr">{row.identifier}</bdi>}
                </span>
              )}
            </span>
            <span className="flex items-center gap-3">
              <ActionLink action={healthAction(row)} />
              <HealthBadge status={row.status} />
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export function CheckRow({ item }: { item: CheckItem }) {
  const check = t.launch.checks[item.id];
  const optional = item.level === "optional";
  // Outside Production the environment check is not a configuration gap: it only means Go live happens in Production.
  const environmentGate = item.id === "production" && !item.ok;
  const tone: Tone = item.ok ? "success" : optional ? "muted" : environmentGate ? "info" : item.level === "required" ? "error" : "warning";
  const label = optional ? (item.ok ? t.launch.inUse : t.launch.notUsed) : environmentGate ? t.launch.productionOnly : item.ok ? t.launch.done : t.launch.missing;
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 py-3">
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="flex flex-wrap items-center gap-2 font-semibold text-ink">
          {check.label} <Badge tone="muted">{t.launch.levels[item.level]}</Badge>
        </span>
        {!item.ok && !optional && <span className="text-xs text-muted">{check.fix}</span>}
      </span>
      <span className="flex items-center gap-3">
        <ActionLink action={checkAction(item)} />
        <Badge tone={tone}>{label}</Badge>
      </span>
    </li>
  );
}

export function AttentionList({ items, extra }: { items: AttentionItem[]; extra?: React.ReactNode[] }) {
  const entries = [
    ...items.map((item) => {
      if (item.kind === "check") {
        const check = t.launch.checks[item.id];
        const action = checkAction({ id: item.id, group: "launch", level: "required", ok: false });
        return { key: `check-${item.id}`, tone: "error" as Tone, text: `${check.label}: ${check.fix}`, action };
      }
      const { row } = item;
      return {
        key: `health-${row.id}`,
        tone: (row.status === "error" ? "error" : "warning") as Tone,
        text: `${t.system.rows[row.id]}: ${row.note ? t.system.notes[row.note] : t.status[row.status]}`,
        action: healthAction(row),
      };
    }),
  ];
  if (entries.length === 0 && !extra?.length) return <p className="text-sm text-muted">{t.dashboard.attentionNone}</p>;
  return (
    <ul className="flex flex-col gap-2">
      {extra?.map((node, index) => <li key={`extra-${index}`}>{node}</li>)}
      {entries.map((entry) => (
        <li key={entry.key} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line px-3 py-2">
          <span className="flex min-w-0 items-center gap-2 text-sm text-ink">
            <Badge tone={entry.tone}>{t.status[entry.tone === "error" ? "error" : "warning"]}</Badge>
            <span className="break-words">{entry.text}</span>
          </span>
          <ActionLink action={entry.action} />
        </li>
      ))}
    </ul>
  );
}

export function SectionCard({ title, link, children }: { title: string; link?: { href: string; label: string }; children: React.ReactNode }) {
  return (
    <Card className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-heading text-lg font-semibold text-ink">{title}</h2>
        {link && (
          <Link href={link.href} className="text-xs font-semibold text-brand-dark hover:underline">
            {link.label}
          </Link>
        )}
      </div>
      {children}
    </Card>
  );
}
