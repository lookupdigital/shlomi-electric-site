// Launch readiness, system health and integration status: pure rules over facts gathered by site-report.ts.
// No data access and no secrets: facts carry only booleans, public identifiers and short error codes.
import type { SiteEnvironment } from "@/lookup/runtime";
import type { SiteSettingsRow } from "@/lookup/settings-model";

export type SiteUrlSource = "admin" | "env" | "vercel" | "none";

export type SiteFacts = {
  environment: SiteEnvironment;
  supabaseConfigured: boolean;
  /** site_settings and page_seo readable with the admin session. */
  databaseReadable: boolean;
  settings: Pick<
    SiteSettingsRow,
    | "site_name"
    | "business_name"
    | "logo_url"
    | "favicon_url"
    | "default_og_image_url"
    | "phone"
    | "email"
    | "default_meta_title"
    | "default_meta_description"
    | "indexing_enabled"
    | "local_business_schema_enabled"
    | "gtm_id"
  > | null;
  /** The home page is marked noindex in Page SEO. */
  homeNoindex: boolean;
  leadStorage: "ok" | "missing_key" | "error";
  storage: "ok" | "error";
  /** null = the Supabase Auth settings could not be read. */
  signupDisabled: boolean | null;
  adminHostConfigured: boolean;
  siteUrl: { source: SiteUrlSource; origin: string };
  turnstile: { siteKey: boolean; secretKey: boolean };
  webhook: { url: "none" | "valid" | "invalid"; host: string; secret: boolean };
  rateLimitSalt: boolean;
  gtmAllowed: boolean;
  /** Result of rendering sitemap.xml in-process: its URLs, or null when it failed. */
  sitemapUrls: string[] | null;
  /** Result of rendering robots.txt in-process, or null when it failed. */
  robots: { disallowAll: boolean; sitemap: string } | null;
  /** No logo uploaded and the site still ships the Starter placeholder logo. */
  placeholderLogo: boolean;
  /** Migration 8 (post social SEO columns): applied, missing, or the check itself failed. */
  postSeoSchema: "ok" | "missing" | "error";
  /** Posts with at least one image without alt text (content images not marked decorative, or the featured image); null = unknown. */
  postsMissingAlt: number | null;
};

export type CheckLevel = "required" | "recommended" | "optional";
export type CheckGroup = "site" | "seo" | "leads" | "launch";

export type CheckId =
  | "database"
  | "leadStorage"
  | "signup"
  | "siteName"
  | "businessName"
  | "siteUrl"
  | "turnstile"
  | "homeIndexable"
  | "production"
  | "logo"
  | "favicon"
  | "ogImage"
  | "contact"
  | "defaultSeo"
  | "sitemap"
  | "robots"
  | "imageAlt"
  | "turnstileConfigured"
  | "rateLimitSalt"
  | "webhook"
  | "gtm"
  | "localBusiness";

export type CheckItem = { id: CheckId; group: CheckGroup; level: CheckLevel; ok: boolean };

const filled = (value: string | null | undefined) => Boolean(value?.trim());

export function isExplicitSiteUrlValid(facts: Pick<SiteFacts, "siteUrl" | "environment">): boolean {
  const { source, origin } = facts.siteUrl;
  if (source !== "admin" && source !== "env") return false;
  if (!origin || /^https?:\/\/(localhost|127\.0\.0\.1)(:|$)/i.test(origin)) return false;
  return facts.environment !== "production" || origin.startsWith("https://");
}

export function turnstileState(turnstile: SiteFacts["turnstile"]): "none" | "configured" | "partial" {
  if (turnstile.siteKey && turnstile.secretKey) return "configured";
  return turnstile.siteKey || turnstile.secretKey ? "partial" : "none";
}

export function sitemapHealthy(facts: Pick<SiteFacts, "sitemapUrls" | "siteUrl">): boolean {
  const urls = facts.sitemapUrls;
  return Boolean(urls && urls.length > 0 && urls.every((url) => url.startsWith(`${facts.siteUrl.origin}/`) || url === facts.siteUrl.origin));
}

/** Outside production robots.txt blocks everything by design; in production it must allow crawling and list the sitemap. */
export function robotsHealthy(facts: Pick<SiteFacts, "robots" | "environment" | "siteUrl">): boolean {
  if (!facts.robots) return false;
  if (facts.environment !== "production") return facts.robots.disallowAll;
  return !facts.robots.disallowAll && facts.robots.sitemap === `${facts.siteUrl.origin}/sitemap.xml`;
}

/** The launch checklist. Only required and recommended items count toward readiness; optional items never block. */
export function launchChecklist(facts: SiteFacts): CheckItem[] {
  const s = facts.settings;
  const localBusiness = s?.local_business_schema_enabled === true;
  const items: CheckItem[] = [
    { id: "database", group: "launch", level: "required", ok: facts.supabaseConfigured && facts.databaseReadable },
    { id: "production", group: "launch", level: "required", ok: facts.environment === "production" },
    { id: "signup", group: "launch", level: "required", ok: facts.signupDisabled === true },
    { id: "siteName", group: "site", level: "required", ok: filled(s?.site_name) },
    ...(localBusiness ? [{ id: "businessName", group: "site", level: "required", ok: filled(s?.business_name) } as CheckItem] : []),
    { id: "siteUrl", group: "site", level: "required", ok: isExplicitSiteUrlValid(facts) },
    { id: "logo", group: "site", level: "recommended", ok: filled(s?.logo_url) || !facts.placeholderLogo },
    { id: "favicon", group: "site", level: "recommended", ok: filled(s?.favicon_url) },
    { id: "ogImage", group: "site", level: "recommended", ok: filled(s?.default_og_image_url) },
    { id: "contact", group: "site", level: "recommended", ok: filled(s?.phone) || filled(s?.email) },
    { id: "homeIndexable", group: "seo", level: "required", ok: !facts.homeNoindex },
    { id: "defaultSeo", group: "seo", level: "recommended", ok: filled(s?.default_meta_title) && filled(s?.default_meta_description) },
    { id: "sitemap", group: "seo", level: "recommended", ok: sitemapHealthy(facts) },
    { id: "robots", group: "seo", level: "recommended", ok: robotsHealthy(facts) },
    // Accessibility of admin-managed images: recommended, never a launch blocker. Omitted when the count is unknown.
    ...(facts.postsMissingAlt === null ? [] : [{ id: "imageAlt", group: "seo", level: "recommended", ok: facts.postsMissingAlt === 0 } as CheckItem]),
    { id: "leadStorage", group: "leads", level: "required", ok: facts.leadStorage === "ok" },
    { id: "turnstile", group: "leads", level: "required", ok: turnstileState(facts.turnstile) !== "partial" },
    { id: "turnstileConfigured", group: "leads", level: "recommended", ok: turnstileState(facts.turnstile) === "configured" },
    { id: "rateLimitSalt", group: "leads", level: "recommended", ok: facts.rateLimitSalt },
    { id: "webhook", group: "leads", level: "optional", ok: facts.webhook.url === "valid" },
    { id: "gtm", group: "launch", level: "optional", ok: filled(s?.gtm_id) },
    { id: "localBusiness", group: "site", level: "optional", ok: localBusiness },
  ];
  return items;
}

export type Readiness = { required: { done: number; total: number }; recommended: { done: number; total: number } };

/**
 * Configuration readiness. The Production-environment check only gates Go live (it describes where the site runs, not
 * how it is configured), so it is not counted: a fully configured Preview shows every required item done.
 */
export function readinessSummary(items: CheckItem[]): Readiness {
  const count = (level: CheckLevel) => {
    const relevant = items.filter((item) => item.level === level && item.id !== "production");
    return { done: relevant.filter((item) => item.ok).length, total: relevant.length };
  };
  return { required: count("required"), recommended: count("recommended") };
}

/** Required items that block going live. */
export function blockingItems(items: CheckItem[]): CheckItem[] {
  return items.filter((item) => item.level === "required" && !item.ok);
}

export type SiteState = "development" | "ready" | "live";

/**
 * Derived, never stored: indexing_enabled is the only launch switch.
 * LIVE = indexing on; READY = indexing off and the configuration is complete (every required check except the
 * environment, which describes where the site runs, not how it is configured); otherwise DEVELOPMENT.
 * Going live still requires every required check, including Production.
 */
export function siteState(facts: Pick<SiteFacts, "settings">, items: CheckItem[]): SiteState {
  if (facts.settings?.indexing_enabled) return "live";
  return blockingItems(items).every((item) => item.id === "production") ? "ready" : "development";
}

export type HealthStatus = "healthy" | "configured" | "optional" | "info" | "warning" | "error";

export type HealthId =
  | "supabase"
  | "database"
  | "schema"
  | "storage"
  | "adminAuth"
  | "leadStorage"
  | "siteUrl"
  | "webhook"
  | "turnstile"
  | "gtm"
  | "indexing"
  | "sitemap"
  | "robots";

export type HealthRow = { id: HealthId; status: HealthStatus; note?: HealthNote; identifier?: string };

/** Short machine keys for the explanation shown next to a status (translated in the admin UI). */
export type HealthNote =
  | "notConfigured"
  | "schemaMissing"
  | "postSeoMigrationMissing"
  | "schemaCheckFailed"
  | "missingServiceKey"
  | "queryFailed"
  | "signupEnabled"
  | "signupUnknown"
  | "adminHost"
  | "siteUrlVercelFallback"
  | "siteUrlMissing"
  | "siteUrlHttp"
  | "webhookUnsigned"
  | "webhookSecretOnly"
  | "webhookInvalidUrl"
  | "turnstilePartial"
  | "gtmInactiveHere"
  | "indexingOn"
  | "indexingOff"
  | "indexingNoEffectHere"
  | "robotsBlockedOutsideProduction"
  | "sitemapFailed"
  | "sitemapWrongOrigin"
  | "robotsMismatch";

export function webhookHealth(webhook: SiteFacts["webhook"]): Pick<HealthRow, "status" | "note"> {
  if (webhook.url === "none") return webhook.secret ? { status: "warning", note: "webhookSecretOnly" } : { status: "optional" };
  if (webhook.url === "invalid") return { status: "error", note: "webhookInvalidUrl" };
  return webhook.secret ? { status: "configured" } : { status: "warning", note: "webhookUnsigned" };
}

export function systemHealth(facts: SiteFacts): HealthRow[] {
  const s = facts.settings;
  const production = facts.environment === "production";
  const rows: HealthRow[] = [];

  rows.push(facts.supabaseConfigured ? { id: "supabase", status: "configured" } : { id: "supabase", status: "error", note: "notConfigured" });
  rows.push(facts.databaseReadable ? { id: "database", status: "healthy" } : { id: "database", status: "error", note: "schemaMissing" });
  // Database version: only meaningful once the base schema is readable (otherwise the database row already errors).
  if (facts.databaseReadable) {
    if (facts.postSeoSchema === "ok") rows.push({ id: "schema", status: "healthy" });
    else if (facts.postSeoSchema === "missing") rows.push({ id: "schema", status: "warning", note: "postSeoMigrationMissing" });
    else rows.push({ id: "schema", status: "warning", note: "schemaCheckFailed" });
  }
  rows.push(facts.storage === "ok" ? { id: "storage", status: "healthy" } : { id: "storage", status: "error", note: "queryFailed" });

  if (facts.signupDisabled === true) rows.push({ id: "adminAuth", status: "healthy", note: facts.adminHostConfigured ? "adminHost" : undefined });
  else if (facts.signupDisabled === false) rows.push({ id: "adminAuth", status: "error", note: "signupEnabled" });
  else rows.push({ id: "adminAuth", status: "warning", note: "signupUnknown" });

  if (facts.leadStorage === "ok") rows.push({ id: "leadStorage", status: "healthy" });
  else rows.push({ id: "leadStorage", status: "error", note: facts.leadStorage === "missing_key" ? "missingServiceKey" : "queryFailed" });

  const { source, origin } = facts.siteUrl;
  if (source === "admin" || source === "env") {
    if (isExplicitSiteUrlValid(facts)) rows.push({ id: "siteUrl", status: "configured", identifier: origin });
    else rows.push({ id: "siteUrl", status: "warning", note: production && origin.startsWith("http://") ? "siteUrlHttp" : "siteUrlMissing", identifier: origin });
  } else if (source === "vercel") {
    rows.push({ id: "siteUrl", status: "warning", note: "siteUrlVercelFallback", identifier: origin });
  } else {
    rows.push({ id: "siteUrl", status: "warning", note: "siteUrlMissing" });
  }

  rows.push({ id: "webhook", ...webhookHealth(facts.webhook), identifier: facts.webhook.host || undefined });

  const turnstile = turnstileState(facts.turnstile);
  rows.push(
    turnstile === "configured"
      ? { id: "turnstile", status: "configured" }
      : turnstile === "partial"
        ? { id: "turnstile", status: "error", note: "turnstilePartial" }
        : { id: "turnstile", status: "optional" },
  );

  const gtmId = s?.gtm_id?.trim() ?? "";
  if (!gtmId) rows.push({ id: "gtm", status: "optional" });
  else rows.push({ id: "gtm", status: facts.gtmAllowed ? "configured" : "info", note: facts.gtmAllowed ? undefined : "gtmInactiveHere", identifier: gtmId });

  if (!s?.indexing_enabled) rows.push({ id: "indexing", status: "info", note: "indexingOff" });
  else if (!production) rows.push({ id: "indexing", status: "warning", note: "indexingNoEffectHere" });
  else rows.push({ id: "indexing", status: "info", note: "indexingOn" });

  if (!facts.sitemapUrls) rows.push({ id: "sitemap", status: "error", note: "sitemapFailed" });
  else rows.push(sitemapHealthy(facts) ? { id: "sitemap", status: "healthy" } : { id: "sitemap", status: "warning", note: "sitemapWrongOrigin" });

  if (!facts.robots) rows.push({ id: "robots", status: "error", note: "sitemapFailed" });
  else if (!robotsHealthy(facts)) rows.push({ id: "robots", status: "warning", note: "robotsMismatch" });
  else rows.push({ id: "robots", status: "healthy", note: production ? undefined : "robotsBlockedOutsideProduction" });

  return rows;
}

export type IntegrationId = "supabase" | "turnstile" | "webhook" | "gtm" | "siteUrl";

/** The integrations overview reuses the health rows, so both pages always agree. */
export function integrationRows(health: HealthRow[]): HealthRow[] {
  const order: IntegrationId[] = ["supabase", "turnstile", "webhook", "gtm", "siteUrl"];
  return order.map((id) => health.find((row) => row.id === id)).filter((row): row is HealthRow => Boolean(row));
}

export type AttentionItem = { kind: "check"; id: CheckId } | { kind: "health"; row: HealthRow };

// Health rows that repeat a required checklist item: the checklist item is shown instead.
const COVERED_BY_CHECK: Partial<Record<HealthId, CheckId>> = {
  database: "database",
  leadStorage: "leadStorage",
  adminAuth: "signup",
  siteUrl: "siteUrl",
  turnstile: "turnstile",
};

/**
 * Only actionable problems: failing required checks (except the environment, which is not changed in Admin) and
 * health warnings/errors. Optional integrations that are not configured have status "optional" and never appear.
 */
export function attentionItems(items: CheckItem[], health: HealthRow[]): AttentionItem[] {
  const failing = blockingItems(items).filter((item) => item.id !== "production");
  const failingIds = new Set(failing.map((item) => item.id));
  const healthProblems = health.filter((row) => {
    if (row.status !== "warning" && row.status !== "error") return false;
    // A sitemap/robots mismatch caused by the missing site URL is the same problem: show only its cause.
    if ((row.id === "sitemap" || row.id === "robots") && failingIds.has("siteUrl") && row.note !== "sitemapFailed") return false;
    const covered = COVERED_BY_CHECK[row.id];
    return !(covered && (failingIds.has(covered) || items.some((item) => item.id === covered && item.level === "required")));
  });
  return [...failing.map((item) => ({ kind: "check" as const, id: item.id })), ...healthProblems.map((row) => ({ kind: "health" as const, row }))];
}

/** Start of the current day and month in `timeZone`, as UTC instants (for lead counts). */
export function zonedPeriodStarts(now: Date, timeZone: string): { day: Date; month: Date } {
  const format = new Intl.DateTimeFormat("en-US", { timeZone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const wallClock = (date: Date) =>
    Object.fromEntries(format.formatToParts(date).map((part) => [part.type, Number(part.value)])) as Record<string, number>;
  // Offset of the zone from UTC at `date` (ms); evaluated at the target instant so a DST change in between is handled.
  const offsetAt = (date: Date) => {
    const p = wallClock(date);
    return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(date.getTime() / 1000) * 1000;
  };
  const toInstant = (wallClockUtc: number) => {
    const guess = wallClockUtc - offsetAt(now);
    return new Date(wallClockUtc - offsetAt(new Date(guess)));
  };
  const today = wallClock(now);
  return { day: toInstant(Date.UTC(today.year, today.month - 1, today.day)), month: toInstant(Date.UTC(today.year, today.month - 1, 1)) };
}
