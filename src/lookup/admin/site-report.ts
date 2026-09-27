import "server-only";
import { cache } from "react";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import {
  attentionItems,
  integrationRows,
  launchChecklist,
  readinessSummary,
  siteState,
  systemHealth,
  type SiteFacts,
  type SiteUrlSource,
} from "@/lookup/admin/readiness";
import { requireAdmin } from "@/lookup/auth";
import { isSupabaseConfigured, supabaseUrl } from "@/lookup/env";
import { postAltFacts } from "@/lookup/alt-facts";
import { MEDIA_BUCKET } from "@/lookup/media-rules";
import { isMissingSocialSeoColumn } from "@/lookup/post-schema";
import { getSiteEnvironment, isGtmAllowed } from "@/lookup/runtime";
import { normalizeOrigin } from "@/lookup/settings-model";
import { isPublicSignupDisabled } from "@/lookup/supabase/auth-settings";
import { createServiceClient } from "@/lookup/supabase/service";
import { siteConfig } from "@/site.config";

/** The logo file shipped with the Starter; a site still using it has not been branded yet. */
const STARTER_PLACEHOLDER_LOGO = "/images/logo-placeholder.png";

const SETTINGS_COLUMNS =
  "site_name,business_name,site_url,logo_url,favicon_url,default_og_image_url,phone,email,default_meta_title,default_meta_description,indexing_enabled,local_business_schema_enabled,gtm_id" as const;

function siteUrlFacts(adminValue: string | null | undefined): SiteFacts["siteUrl"] {
  const candidates: [SiteUrlSource, string | undefined | null][] = [
    ["admin", adminValue],
    ["env", process.env.LOOKUP_SITE_URL],
    ["vercel", process.env.VERCEL_PROJECT_PRODUCTION_URL],
  ];
  for (const [source, value] of candidates) {
    const origin = normalizeOrigin(value);
    if (origin) return { source, origin };
  }
  return { source: "none", origin: "" };
}

/** Only the host is exposed: webhook URLs often carry a secret token in the path. */
function webhookFacts(): SiteFacts["webhook"] {
  const raw = process.env.LEAD_WEBHOOK_URL?.trim() ?? "";
  const secret = Boolean(process.env.LEAD_WEBHOOK_SECRET);
  if (!raw) return { url: "none", host: "", secret };
  try {
    const url = new URL(raw);
    return url.protocol === "https:" || url.protocol === "http:" ? { url: "valid", host: url.host, secret } : { url: "invalid", host: "", secret };
  } catch {
    return { url: "invalid", host: "", secret };
  }
}

/** Read-only probe with the service key: proves the key works for the lead pipeline without writing anything. */
async function leadStorageFacts(): Promise<SiteFacts["leadStorage"]> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return "missing_key";
  try {
    const { error } = await createServiceClient().from("leads").select("id", { count: "exact", head: true }).limit(1);
    return error ? "error" : "ok";
  } catch {
    return "error";
  }
}

type AdminClient = Awaited<ReturnType<typeof requireAdmin>>["supabase"];

async function storageFacts(supabase: AdminClient): Promise<SiteFacts["storage"]> {
  try {
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const { data, error } = await createServiceClient().storage.getBucket(MEDIA_BUCKET);
      return !error && data?.public ? "ok" : "error";
    }
    const { error } = await supabase.storage.from(MEDIA_BUCKET).list("", { limit: 1 });
    return error ? "error" : "ok";
  } catch {
    return "error";
  }
}

/** Whether migration 8 is applied: only the specific missing-column error counts as "missing". */
async function postSeoSchemaFacts(supabase: AdminClient): Promise<SiteFacts["postSeoSchema"]> {
  const { error } = await supabase.from("posts").select("og_title,og_description,robots_follow").limit(1);
  if (!error) return "ok";
  return isMissingSocialSeoColumn(error) ? "missing" : "error";
}

/** Number of posts (any status) with an image lacking alt text. Admin-managed images only; no crawling. */
async function missingAltFacts(supabase: AdminClient): Promise<number | null> {
  const { data, error } = await supabase.from("posts").select("content,featured_image_url,featured_image_alt").limit(1000);
  if (error) return null;
  return data.filter((post) => postAltFacts(post).total > 0).length;
}

async function sitemapFacts(): Promise<string[] | null> {
  try {
    return (await sitemap()).map((entry) => entry.url);
  } catch {
    return null;
  }
}

async function robotsFacts(): Promise<SiteFacts["robots"]> {
  try {
    const result = await robots();
    const rules = Array.isArray(result.rules) ? result.rules : [result.rules];
    const disallowAll = rules.some((rule) => ([] as string[]).concat(rule.disallow ?? []).includes("/") && !rule.allow);
    const sitemapUrl = Array.isArray(result.sitemap) ? (result.sitemap[0] ?? "") : (result.sitemap ?? "");
    return { disallowAll, sitemap: sitemapUrl };
  } catch {
    return null;
  }
}

/**
 * Gathers the facts behind the dashboard, launch checklist, health and integrations pages. Runs only when one of
 * those admin pages (or the go-live action) is requested, once per request. Returns no secrets.
 */
export const getSiteReport = cache(async () => {
  const { supabase } = await requireAdmin();
  const homePath = siteConfig.routes.corePages[0]?.path ?? "/";

  const [settingsResult, homeSeo, leadStorage, storage, signupDisabled, sitemapUrls, robotsResult, postSeoSchema, postsMissingAlt] = await Promise.all([
    supabase.from("site_settings").select(SETTINGS_COLUMNS).eq("id", 1).maybeSingle(),
    supabase.from("page_seo").select("robots_index").eq("path", homePath).maybeSingle(),
    leadStorageFacts(),
    storageFacts(supabase),
    isPublicSignupDisabled(),
    sitemapFacts(),
    robotsFacts(),
    postSeoSchemaFacts(supabase),
    missingAltFacts(supabase),
  ]);

  const settings = settingsResult.data;
  const facts: SiteFacts = {
    environment: getSiteEnvironment(),
    supabaseConfigured: isSupabaseConfigured,
    databaseReadable: !settingsResult.error && !homeSeo.error && Boolean(settings),
    settings,
    homeNoindex: homeSeo.data?.robots_index === false,
    leadStorage,
    storage,
    signupDisabled,
    adminHostConfigured: Boolean(process.env.NEXT_PUBLIC_ADMIN_HOST),
    siteUrl: siteUrlFacts(settings?.site_url),
    turnstile: { siteKey: Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY), secretKey: Boolean(process.env.TURNSTILE_SECRET_KEY) },
    webhook: webhookFacts(),
    rateLimitSalt: Boolean(process.env.LEAD_RATE_LIMIT_SALT),
    gtmAllowed: isGtmAllowed(),
    sitemapUrls,
    robots: robotsResult,
    placeholderLogo: siteConfig.branding.logoUrl === STARTER_PLACEHOLDER_LOGO,
    postSeoSchema,
    postsMissingAlt,
  };

  const checklist = launchChecklist(facts);
  const health = systemHealth(facts);
  return {
    facts,
    checklist,
    readiness: readinessSummary(checklist),
    state: siteState(facts, checklist),
    health,
    integrations: integrationRows(health),
    attention: attentionItems(checklist, health),
    supabaseHost: supabaseUrl ? new URL(supabaseUrl).host : "",
  };
});

export type SiteReport = Awaited<ReturnType<typeof getSiteReport>>;
