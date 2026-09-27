// The one contextual next action for a launch check or health row: where it is fixed in the admin, and how to say it.
// Pure (no data access). `optional` marks actions for unused optional integrations, rendered without urgency.
import { t } from "@/lookup/admin/i18n";
import type { CheckId, CheckItem, HealthRow } from "@/lookup/admin/readiness";

export type NextAction = { href: string; label: string; optional: boolean };

/** Anchors on /admin/settings (Fieldset ids) and /admin/system (integration cards). */
export const SETTINGS_BUSINESS = "/admin/settings#settings-business";
export const SETTINGS_SEO = "/admin/settings#settings-seo";
export const SETTINGS_TRACKING = "/admin/settings#settings-tracking";
export const integrationAnchor = (id: "supabase" | "turnstile" | "webhook" | "gtm" | "siteUrl") => `/admin/system#integration-${id}`;

const a = t.actions;

const CHECK_ACTIONS: Partial<Record<CheckId, { href: string; label: string }>> = {
  database: { href: integrationAnchor("supabase"), label: a.fix },
  leadStorage: { href: integrationAnchor("supabase"), label: a.fix },
  siteName: { href: SETTINGS_BUSINESS, label: a.siteDetails },
  businessName: { href: SETTINGS_BUSINESS, label: a.siteDetails },
  contact: { href: SETTINGS_BUSINESS, label: a.siteDetails },
  siteUrl: { href: SETTINGS_BUSINESS, label: a.siteUrl },
  logo: { href: SETTINGS_BUSINESS, label: a.uploadLogo },
  favicon: { href: SETTINGS_BUSINESS, label: a.uploadFavicon },
  ogImage: { href: SETTINGS_SEO, label: a.uploadImage },
  defaultSeo: { href: SETTINGS_SEO, label: a.seo },
  homeIndexable: { href: "/admin/pages", label: a.toSeo },
  imageAlt: { href: "/admin/posts?alt=missing", label: a.reviewPosts },
  // sitemap.xml / robots.txt are generated; when they fail the site URL is the cause.
  sitemap: { href: SETTINGS_BUSINESS, label: a.siteUrl },
  robots: { href: SETTINGS_BUSINESS, label: a.siteUrl },
  turnstile: { href: integrationAnchor("turnstile"), label: a.fix },
  turnstileConfigured: { href: integrationAnchor("turnstile"), label: a.configure },
  webhook: { href: integrationAnchor("webhook"), label: a.configure },
  gtm: { href: SETTINGS_TRACKING, label: a.configure },
  localBusiness: { href: SETTINGS_BUSINESS, label: a.configure },
};

// Setting up an integration is never required for launch, even where the checklist recommends it.
const INTEGRATION_SETUP: ReadonlySet<CheckId> = new Set<CheckId>(["turnstileConfigured"]);

/** Only unmet checks get an action; the environment, sign-up (Supabase dashboard) and the rate-limit salt have none. */
export function checkAction(item: CheckItem): NextAction | null {
  if (item.ok) return null;
  const action = CHECK_ACTIONS[item.id];
  return action ? { ...action, optional: item.level === "optional" || INTEGRATION_SETUP.has(item.id) } : null;
}

/** Health rows: fix what is broken, offer setup for unused optional integrations, nothing for healthy/informational rows. */
export function healthAction(row: HealthRow): NextAction | null {
  const broken = row.status === "warning" || row.status === "error";
  if (!broken && row.status !== "optional") return null;
  switch (row.id) {
    case "supabase":
    case "database":
    case "schema":
    case "storage":
    case "leadStorage":
      return broken ? { href: integrationAnchor("supabase"), label: a.fix, optional: false } : null;
    case "siteUrl":
    case "sitemap":
    case "robots":
      return broken ? { href: SETTINGS_BUSINESS, label: a.siteUrl, optional: false } : null;
    case "turnstile":
    case "webhook":
      return { href: integrationAnchor(row.id), label: broken ? a.fix : a.configure, optional: !broken };
    case "gtm":
      return row.status === "optional" ? { href: SETTINGS_TRACKING, label: a.configure, optional: true } : null;
    case "indexing":
      return broken ? { href: "/admin/launch", label: a.toLaunch, optional: false } : null;
    default:
      return null;
  }
}
