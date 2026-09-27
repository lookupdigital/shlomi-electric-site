import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  attentionItems,
  blockingItems,
  launchChecklist,
  readinessSummary,
  siteState,
  systemHealth,
  zonedPeriodStarts,
  type SiteFacts,
} from "@/lookup/admin/readiness";
import { classifyClick, sanitizeEvent, sanitizeLocation } from "@/lookup/analytics/events";
import { ATTRIBUTION_TTL_MS, nextAttribution, type Attribution } from "@/lookup/attribution";
import { freshValue, type Snapshot } from "@/lookup/cache";
import { DEFAULT_OG_IMAGE } from "@/lookup/config";
import { csvCell, toCsv } from "@/lookup/leads/csv";
import {
  applyLeadFilters,
  leadFiltersToQuery,
  parseLeadFilters,
  sanitizeSearchTerm,
  type LeadFilterQuery,
} from "@/lookup/leads/filters";
import { applyRecovery, canServerAutosave, leavesPage, parseRecovery, recoveryKey, recoveryOffer, sameSnapshot, snapshotEntries } from "@/lookup/admin/content-safety";
import { checkAction, healthAction } from "@/lookup/admin/next-action";
import { pageSeoFormKey, resetRedirect } from "@/lookup/admin/page-seo-form";
import { buildTestWebhookBody, LEAD_TEST_WEBHOOK_EVENT, postSignedWebhook, shouldDeliverLead, signWebhookPayload } from "@/lookup/leads/notify";
import { clientIp, isAuthorizedTestSubmission, isTestLead, rateLimitBucket } from "@/lookup/leads/protection";
import { createLeadSchema } from "@/lookup/leads/schema";
import { leadSource } from "@/lookup/leads/source";
import { IMAGE_EXTENSIONS, isManagedUploadPath, newUploadPath, ownUploadPaths, referencedUploadPaths } from "@/lookup/media-rules";
import { ogLogoSource } from "@/lookup/og-image";
import { POST_FRESHNESS_SECONDS } from "@/lookup/posts";
import { findRedirectLoop, isValidDestination, normalizePath } from "@/lookup/redirects";
import { safeHref, safeImageSrc } from "@/lookup/richtext";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { canEmitLocalBusiness, JsonLd, localBusinessSchema, siteSchemas } from "@/lookup/schema";
import { getSiteEnvironment, isGtmAllowed, isProductionSite } from "@/lookup/runtime";
import { buildAdminCsp, buildPublicCsp } from "@/lookup/security/csp";
import { composeMetadata, latestTimestamp, pageSeoInput, postSeoInput, resolveSeo, sameUrl, seoStates } from "@/lookup/seo-model";
import { contentImages, postAltFacts } from "@/lookup/alt-facts";
import { navigationRoutes } from "@/lookup/config";
import { isMissingSocialSeoColumn, withoutSocialSeo, writeWithSocialSeoFallback } from "@/lookup/post-schema";
import { RichText } from "@/lookup/richtext";
import { sitemapEntries } from "@/lookup/sitemap-model";
import { hasSiteIdentity, mergeSiteSettings, phoneHref, siteIconUrl, whatsappHref } from "@/lookup/settings-model";
import { SLUG_PATTERN, slugify } from "@/lookup/slug";
import { ADMIN_COOKIE_PATH, isSupabaseAuthCookie, withAdminLifetime } from "@/lookup/supabase/cookies";
import { siteConfig } from "@/site.config";

describe("site settings", () => {
  it("keeps empty fields empty — no demo fallbacks — and indexing off by default", () => {
    const settings = mergeSiteSettings({ phone: "", email: null }, siteConfig, "example.vercel.app");
    expect(settings.phone).toBe("");
    expect(settings.email).toBe("");
    expect(settings.address).toBe("");
    expect(settings.siteName).toBe("");
    expect(settings.logoUrl).toBe(siteConfig.branding.logoUrl);
    expect(settings.siteUrl).toBe("https://example.vercel.app");
    expect(settings.indexingEnabled).toBe(false);
    expect(settings.consentDefault).toBe("denied");
  });

  it("falls back to Consent Mode denied unless the database explicitly says granted", () => {
    expect(mergeSiteSettings(null, siteConfig).consentDefault).toBe("denied");
    expect(mergeSiteSettings({ phone: "" }, siteConfig).consentDefault).toBe("denied");
    expect(mergeSiteSettings({ consent_default: "denied" }, siteConfig).consentDefault).toBe("denied");
    expect(mergeSiteSettings({ consent_default: "granted" }, siteConfig).consentDefault).toBe("granted");
  });

  it("ships no public site-name fallback and reports missing identity", () => {
    expect(siteConfig.identity.siteName).toBe("");
    expect(hasSiteIdentity(mergeSiteSettings(null, siteConfig))).toBe(false);
    expect(hasSiteIdentity(mergeSiteSettings({ business_name: "Business" }, siteConfig))).toBe(false);
    // The business name falls back to the site name (audited behavior).
    expect(hasSiteIdentity(mergeSiteSettings({ site_name: "Site" }, siteConfig))).toBe(true);
    expect(hasSiteIdentity(mergeSiteSettings({ site_name: "Site", business_name: "Business" }, siteConfig))).toBe(true);
    const meta = composeMetadata({ settings: mergeSiteSettings(null, siteConfig, "example.com"), ogLocale: "he_IL", path: "/", fallbackTitle: "Home", indexable: false });
    expect(meta.title).toEqual({ absolute: "Home" });
    expect(meta.openGraph?.siteName).toBeUndefined();
  });

  it("builds international phone and WhatsApp links from the configured country rules", () => {
    expect(phoneHref("03-000-0000", siteConfig.phone)).toBe("tel:+97230000000");
    expect(whatsappHref("050-123-4567", siteConfig.phone)).toBe("https://wa.me/972501234567");
    expect(whatsappHref("972500000000", siteConfig.phone)).toBe("https://wa.me/972500000000");
    expect(phoneHref("(415) 555-0100", { countryCallingCode: "1", nationalTrunkPrefix: "" })).toBe("tel:+4155550100");
    expect(phoneHref("+1 415 555 0100", { countryCallingCode: "972", nationalTrunkPrefix: "0" })).toBe("tel:+14155550100");
    expect(phoneHref("", siteConfig.phone)).toBe("");
  });
});

describe("site icon", () => {
  it("uses the admin favicon, falling back to the logo", () => {
    expect(siteIconUrl(mergeSiteSettings({ favicon_url: "https://cdn.example.com/icon.png" }, siteConfig))).toBe("https://cdn.example.com/icon.png");
    expect(siteIconUrl(mergeSiteSettings({ favicon_url: "", logo_url: "https://cdn.example.com/logo.png" }, siteConfig))).toBe("https://cdn.example.com/logo.png");
    expect(siteIconUrl(mergeSiteSettings(null, siteConfig))).toBe(siteConfig.branding.logoUrl);
  });

  it("ships no static icon file in app/ that would override the admin setting", () => {
    const staticIcons = readdirSync(join(process.cwd(), "src", "app"), { withFileTypes: true })
      .filter((entry) => entry.isFile() && /^(favicon|icon|apple-icon)\b/.test(entry.name))
      .map((entry) => entry.name);
    expect(staticIcons).toEqual([]);
  });
});

describe("admin-driven assets and routes", () => {
  it("takes the generated OG image logo from the admin logo, falling back to the shipped logo", () => {
    const uploaded = "https://abc.supabase.co/storage/v1/object/public/media/uploads/logo.png";
    expect(ogLogoSource({ logoUrl: uploaded }, siteConfig)).toEqual({ kind: "remote", url: uploaded });
    expect(ogLogoSource({ logoUrl: "/images/other.png" }, siteConfig)).toEqual({ kind: "file", path: "images/other.png" });
    expect(ogLogoSource({ logoUrl: "" }, siteConfig)).toEqual({ kind: "file", path: siteConfig.branding.logoUrl.replace(/^\//, "") });
  });

  it("renders routes that read admin settings per request (a prerendered copy goes stale after admin changes)", () => {
    for (const file of ["src/app/og-default.png/route.tsx", "src/app/favicon.ico/route.ts", "src/app/sitemap.ts", "src/app/robots.ts"]) {
      const source = readFileSync(join(process.cwd(), file), "utf8");
      expect(source, file).toContain('export const dynamic = "force-dynamic"');
      expect(source, file).not.toContain("force-static");
    }
  });
});

describe("service area setting", () => {
  it("reads the admin value, keeps a cleared value empty, and falls back to config only without a usable row", () => {
    expect(mergeSiteSettings({ service_area: "  North  " }, siteConfig).serviceArea).toBe("North");
    expect(mergeSiteSettings({ service_area: null }, siteConfig).serviceArea).toBe("");
    expect(mergeSiteSettings({ service_area: "" }, siteConfig).serviceArea).toBe("");
    // Database without migration 6 (column missing) or settings unavailable.
    expect(mergeSiteSettings({ phone: "050-000-0000" }, siteConfig).serviceArea).toBe(siteConfig.business.serviceArea);
    expect(mergeSiteSettings(null, siteConfig).serviceArea).toBe(siteConfig.business.serviceArea);
  });
});

describe("structured data", () => {
  const settings = mergeSiteSettings(
    { business_name: "Example Business", phone: "050-000-0000", service_area: "Example Area", local_business_schema_enabled: true },
    siteConfig,
    "example.com",
  );

  it("uses the service area from the settings and an international telephone in LocalBusiness", () => {
    const schema = localBusinessSchema(settings, siteConfig);
    expect(schema.areaServed).toBe("Example Area");
    expect(schema.telephone).toBe("+972500000000");
    expect(localBusinessSchema({ ...settings, phone: "" }, siteConfig).telephone).toBeUndefined();
    // CLIENT-OVERRIDE: assert the single-type case with an explicit config, not the Starter default businessTypes
    // (this site uses ["Electrician", "GeneralContractor"]). See docs/client-notes.md.
    expect(localBusinessSchema(settings, { ...siteConfig, schema: { businessTypes: ["LocalBusiness"] } })["@type"]).toBe("LocalBusiness");
    expect(localBusinessSchema(settings, { ...siteConfig, schema: { businessTypes: ["LocalBusiness", "Dentist"] } })["@type"]).toEqual(["LocalBusiness", "Dentist"]);
    expect(localBusinessSchema({ ...settings, serviceArea: "" }, siteConfig).areaServed).toBeUndefined();
  });

  it("emits LocalBusiness only when enabled and complete, and never placeholder Organization/WebSite nodes", () => {
    const types = (s: typeof settings) => siteSchemas(s, siteConfig).map((node) => node["@type"]);
    expect(canEmitLocalBusiness(settings)).toBe(true);
    expect(canEmitLocalBusiness({ ...settings, localBusinessSchemaEnabled: false })).toBe(false);
    expect(canEmitLocalBusiness({ ...settings, businessName: "" })).toBe(false);
    expect(canEmitLocalBusiness({ ...settings, phone: "", address: "" })).toBe(false);
    expect(canEmitLocalBusiness({ ...settings, phone: "", address: "Example Street 1" })).toBe(true);
    const fresh = mergeSiteSettings(null, siteConfig, "example.com");
    expect(fresh.localBusinessSchemaEnabled).toBe(false);
    expect(siteSchemas(fresh, siteConfig)).toEqual([]);
    expect(renderToStaticMarkup(createElement(JsonLd, { data: siteSchemas(fresh, siteConfig) }))).toBe("");
    expect(types({ ...settings, localBusinessSchemaEnabled: false })).toEqual(["Organization"]);
  });

  it("never emits review or rating data", () => {
    expect(JSON.stringify(siteSchemas(settings, siteConfig))).not.toMatch(/Review|Rating/);
  });
});

describe("metadata", () => {
  const settings = mergeSiteSettings({ site_name: "Site" }, siteConfig, "example.com");

  it("uses the generated default OG image with dimensions and noindex when not indexable", () => {
    const meta = composeMetadata({ settings, ogLocale: "he_IL", path: "/services", fallbackTitle: "Services", indexable: false });
    expect(meta.title).toEqual({ absolute: "Services | Site" });
    expect(meta.alternates?.canonical).toBe("https://example.com/services");
    expect(meta.robots).toEqual({ index: false, follow: false });
    expect(meta.openGraph?.images).toEqual([
      { url: `https://example.com${DEFAULT_OG_IMAGE.path}`, width: DEFAULT_OG_IMAGE.width, height: DEFAULT_OG_IMAGE.height },
    ]);
    expect(meta.openGraph && "locale" in meta.openGraph ? meta.openGraph.locale : undefined).toBe("he_IL");
    expect(meta.twitter && "card" in meta.twitter ? meta.twitter.card : undefined).toBe("summary_large_image");
  });

  it("prefers admin SEO fields", () => {
    const meta = composeMetadata({
      settings,
      ogLocale: "en_US",
      path: "/",
      indexable: true,
      seo: { meta_title: "Custom", canonical_url: "https://x.com/", og_image_url: "/og.png", robots_follow: false },
    });
    expect(meta.title).toEqual({ absolute: "Custom" });
    expect(meta.alternates?.canonical).toBe("https://x.com/");
    expect(meta.robots).toEqual({ index: true, follow: false });
    expect(meta.openGraph?.images).toEqual([{ url: "https://example.com/og.png" }]);
  });

  it("finds the latest update time for the blog index lastModified", () => {
    expect(
      latestTimestamp([
        { updated_at: "2026-01-02T10:00:00+00:00" },
        { updated_at: "2026-03-01T09:00:00+00:00" },
        { updated_at: "2026-02-01T00:00:00+00:00" },
      ]),
    ).toBe("2026-03-01T09:00:00+00:00");
    expect(latestTimestamp([])).toBeUndefined();
  });
});

describe("analytics", () => {
  it("keeps event_id and drops unknown keys, emails and phone-like labels", () => {
    const event = sanitizeEvent({
      event: "generate_lead",
      form_name: "contact",
      page_path: "/contact",
      lead_type: "050-123-4567",
      event_id: "11111111-1111-4111-8111-111111111111",
      // @ts-expect-error — extra keys must be stripped even if a caller bypasses the types
      email: "someone@example.com",
    });
    expect(event).toEqual({ event: "generate_lead", form_name: "contact", page_path: "/contact", event_id: "11111111-1111-4111-8111-111111111111" });
  });

  it("keeps only campaign parameters in page_location", () => {
    expect(sanitizeLocation("https://s.co/p?utm_source=g&email=a@b.co&gclid=1")).toBe("https://s.co/p?utm_source=g&gclid=1");
  });

  it("counts a contact click once, even when the element is also a tracked CTA", () => {
    expect(classifyClick("https://wa.me/972500000000", "hero_whatsapp")).toEqual({ event: "whatsapp_click", ctaName: "hero_whatsapp" });
    expect(classifyClick("tel:+97230000000", null)).toEqual({ event: "phone_click" });
    expect(classifyClick("mailto:a@b.co", null)).toEqual({ event: "email_click" });
    expect(classifyClick("/contact#contact-form", "header_contact")).toEqual({ event: "cta_click", ctaName: "header_contact" });
    expect(classifyClick("/services", null)).toBeNull();
  });
});

describe("attribution", () => {
  const base = { pathname: "/", referrer: "", host: "s.co", now: 1_000_000 };

  it("stores campaign params with landing page", () => {
    const touch = nextAttribution(null, { ...base, search: "?utm_source=google&gclid=abc", pathname: "/contact" });
    expect(touch).toMatchObject({ utm_source: "google", gclid: "abc", landing_page: "/contact" });
  });

  it("does not let a later direct or referral visit overwrite a campaign touch", () => {
    const stored: Attribution = { utm_source: "google", landing_page: "/", captured_at: base.now };
    expect(nextAttribution(stored, { ...base, search: "", now: base.now + 1000 })).toBeNull();
    expect(nextAttribution(stored, { ...base, search: "", referrer: "https://facebook.com/x", now: base.now + 1000 })).toBeNull();
  });

  it("replaces an expired touch", () => {
    const stored: Attribution = { utm_source: "google", captured_at: base.now };
    const next = nextAttribution(stored, { ...base, search: "", now: base.now + ATTRIBUTION_TTL_MS + 1 });
    expect(next?.utm_source).toBeUndefined();
  });

  it("ignores same-site referrers and strips referrer query strings", () => {
    expect(nextAttribution(null, { ...base, search: "", referrer: "https://s.co/x" })?.referrer).toBeUndefined();
    expect(nextAttribution(null, { ...base, search: "", referrer: "https://google.com/search?q=x" })?.referrer).toBe("https://google.com/search");
  });
});

describe("lead validation", () => {
  const leadSchema = createLeadSchema(siteConfig.leads.messages, siteConfig.phone);
  const valid = { name: "ישראל ישראלי", phone: "050-1234567", form_name: "contact", submission_id: "11111111-1111-4111-8111-111111111111" };

  it("accepts a valid lead (with a Turnstile token) and normalises empty optionals to null", () => {
    const result = leadSchema.safeParse({ ...valid, email: "", utm_source: "google", "cf-turnstile-response": "token" });
    expect(result.success).toBe(true);
    expect(result.data?.email).toBeNull();
    expect(result.data?.utm_source).toBe("google");
  });

  it("rejects bad phone, bad email and missing required consent with the site's messages", () => {
    const phone = leadSchema.safeParse({ ...valid, phone: "123" });
    expect(phone.error?.issues[0]?.message).toBe(siteConfig.leads.messages.phoneInvalid);
    expect(leadSchema.safeParse({ ...valid, email: "nope" }).success).toBe(false);
    expect(leadSchema.safeParse({ ...valid, consent_required: "1" }).success).toBe(false);
    expect(leadSchema.safeParse({ ...valid, consent_required: "1", consent: "on" }).success).toBe(true);
  });

  it("takes the accepted phone length from the site config", () => {
    const strict = createLeadSchema(siteConfig.leads.messages, { minDigits: 10, maxDigits: 10 });
    expect(strict.safeParse({ ...valid, phone: "050-1234567" }).success).toBe(true);
    expect(strict.safeParse({ ...valid, phone: "03-0000000" }).success).toBe(false);
    expect(leadSchema.safeParse({ ...valid, phone: "03-0000000" }).success).toBe(true);
  });
});

describe("lead protection and notifications", () => {
  const originalToken = process.env.E2E_TEST_TOKEN;
  afterEach(() => {
    process.env.E2E_TEST_TOKEN = originalToken;
  });

  it("hashes the client IP into the rate-limit bucket", () => {
    const bucket = rateLimitBucket("203.0.113.7", "secret");
    expect(bucket).toMatch(/^lead:[A-Za-z0-9_-]{32}$/);
    expect(bucket).not.toContain("203.0.113.7");
    expect(rateLimitBucket("203.0.113.7", "secret")).toBe(bucket);
    expect(rateLimitBucket("203.0.113.7", "other")).not.toBe(bucket);
  });

  it("reads the first forwarded client IP", () => {
    expect(clientIp(new Headers({ "x-forwarded-for": "198.51.100.1, 10.0.0.1" }))).toBe("198.51.100.1");
    expect(clientIp(new Headers({ "x-real-ip": "198.51.100.2" }))).toBe("198.51.100.2");
    expect(clientIp(new Headers())).toBe("unknown");
  });

  it("marks a submission as a test only with the exact server-side token", () => {
    process.env.E2E_TEST_TOKEN = "e2e-token-0123456789";
    expect(isAuthorizedTestSubmission("e2e-token-0123456789")).toBe(true);
    expect(isAuthorizedTestSubmission("e2e-token-0123456780")).toBe(false);
    expect(isAuthorizedTestSubmission(undefined)).toBe(false);
    process.env.E2E_TEST_TOKEN = "short";
    expect(isAuthorizedTestSubmission("short")).toBe(false);
  });

  it("marks every non-production lead as a test lead and keeps test leads away from the production webhook", () => {
    expect(isTestLead(false, { VERCEL_ENV: "production" })).toBe(false);
    expect(isTestLead(true, { VERCEL_ENV: "production" })).toBe(true);
    expect(isTestLead(false, { VERCEL_ENV: "preview" })).toBe(true);
    expect(isTestLead(false, {})).toBe(true);
    expect(isTestLead(false, { LOOKUP_SITE_ENV: "production" })).toBe(false);
    expect(shouldDeliverLead(false, { VERCEL_ENV: "production" })).toBe(true);
    expect(shouldDeliverLead(true, { VERCEL_ENV: "production" })).toBe(false);
    expect(shouldDeliverLead(true, { VERCEL_ENV: "preview" })).toBe(true);
  });

  it("signs webhook payloads with HMAC-SHA256 over timestamp and body", () => {
    const signature = signWebhookPayload('{"a":1}', "1700000000", "secret");
    expect(signature).toMatch(/^sha256=[0-9a-f]{64}$/);
    expect(signWebhookPayload('{"a":1}', "1700000001", "secret")).not.toBe(signature);
  });
});

describe("lead admin helpers", () => {
  it("neutralises spreadsheet formulas and escapes CSV cells", () => {
    expect(csvCell("=HYPERLINK(\"x\")")).toBe('"\'=HYPERLINK(""x"")"');
    expect(csvCell("+972500000000")).toBe("'+972500000000");
    expect(csvCell("a,b")).toBe('"a,b"');
    expect(csvCell(null)).toBe("");
    expect(toCsv([{ key: "name", label: "name" }, { key: "phone", label: "phone" }], [{ name: "Dana", phone: "050" }])).toBe("name,phone\r\nDana,050");
  });

  it("parses filters defensively", () => {
    const filters = parseLeadFilters({ q: "dana, (x)%", status: "bogus", form: "Bad Form", from: "2026-01-01", to: "not-a-date", test: "1" });
    expect(filters).toEqual({ q: "dana x", status: "all", form: "", source: "", from: "2026-01-01", to: "", includeTest: true });
    expect(sanitizeSearchTerm("a.b:c*d")).toBe("a b c d");
    expect(leadFiltersToQuery({ ...filters, status: "new" }, { page: "2" })).toBe("?q=dana+x&status=new&from=2026-01-01&test=1&page=2");
  });

  it("applies filters to the query builder", () => {
    class FakeQuery implements LeadFilterQuery<FakeQuery> {
      ops: string[] = [];
      eq(column: string, value: string | boolean) { this.ops.push(`eq ${column} ${value}`); return this; }
      gte(column: string, value: string) { this.ops.push(`gte ${column} ${value}`); return this; }
      lt(column: string, value: string) { this.ops.push(`lt ${column} ${value}`); return this; }
      ilike(column: string, pattern: string) { this.ops.push(`ilike ${column} ${pattern}`); return this; }
      or(filters: string) { this.ops.push(`or ${filters}`); return this; }
    }
    const defaults = applyLeadFilters(new FakeQuery(), parseLeadFilters({}));
    expect(defaults.ops).toEqual(["eq is_test false"]);
    const filtered = applyLeadFilters(new FakeQuery(), parseLeadFilters({ q: "dana", status: "spam", to: "2026-01-31" }));
    expect(filtered.ops).toEqual([
      "eq is_test false",
      "eq status spam",
      "lt created_at 2026-02-01T00:00:00Z",
      "or name.ilike.%dana%,phone.ilike.%dana%,email.ilike.%dana%",
    ]);
  });

  it("labels lead sources", () => {
    expect(leadSource({ utm_source: "google", utm_medium: "cpc", utm_campaign: "brand" }, "direct")).toEqual({ source: "google / cpc", campaign: "brand" });
    expect(leadSource({ fbclid: "x" }, "direct").source).toBe("Meta");
    expect(leadSource({ referrer: "https://www.google.com/" }, "direct").source).toBe("www.google.com");
    expect(leadSource({}, "direct").source).toBe("direct");
  });
});

describe("redirects", () => {
  it("normalises paths", () => {
    expect(normalizePath("/Old-Page/?x=1")).toBe("/Old-Page");
    expect(normalizePath("/%D7%91%D7%9C%D7%95%D7%92")).toBe("/בלוג");
  });

  it("validates destinations", () => {
    expect(isValidDestination("/new")).toBe(true);
    expect(isValidDestination("https://example.com/x")).toBe(true);
    expect(isValidDestination("//evil.com")).toBe(false);
    expect(isValidDestination("javascript:alert(1)")).toBe(false);
  });

  it("detects loops and allows chains that end", () => {
    const existing = [{ source_path: "/b", destination: "/c" }];
    expect(findRedirectLoop(existing, { source_path: "/a", destination: "/b" })).toBeNull();
    expect(findRedirectLoop(existing, { source_path: "/c", destination: "/b/" })).toEqual(["/c", "/b", "/c"]);
    expect(findRedirectLoop([], { source_path: "/a", destination: "/a/" })).toEqual(["/a", "/a"]);
    expect(findRedirectLoop(existing, { source_path: "/c", destination: "https://x.com/b" })).toBeNull();
  });
});

describe("slugs", () => {
  it("creates URL-safe slugs in any script", () => {
    expect(slugify("  Office Renovation: 5 Tips! ")).toBe("office-renovation-5-tips");
    expect(slugify("שיפוץ משרדים – מדריך")).toBe("שיפוץ-משרדים-מדריך");
    expect(slugify("Café Crème")).toBe("café-crème");
    for (const slug of ["office-renovation-5-tips", "שיפוץ-משרדים-מדריך", "café-crème"]) expect(SLUG_PATTERN.test(slug)).toBe(true);
    for (const slug of ["Bad-Slug", "bad slug", "a/b", "-a", "a--b"]) expect(SLUG_PATTERN.test(slug)).toBe(false);
  });
});

describe("rich text safety", () => {
  it("allows only safe link and image URLs", () => {
    expect(safeHref("javascript:alert(1)")).toBeNull();
    expect(safeHref("/contact")).toBe("/contact");
    expect(safeHref("tel:+972500000000")).toBe("tel:+972500000000");
    expect(safeImageSrc("http://insecure.com/a.png")).toBeNull();
    expect(safeImageSrc("data:image/png;base64,xx")).toBeNull();
    expect(safeImageSrc("https://x.supabase.co/storage/v1/object/public/media/a.png")).toBeTruthy();
  });
});

describe("environment", () => {
  it("detects the environment without depending on Vercel", () => {
    expect(getSiteEnvironment({ LOOKUP_SITE_ENV: "production" })).toBe("production");
    expect(getSiteEnvironment({ VERCEL_ENV: "preview" })).toBe("preview");
    expect(getSiteEnvironment({ LOOKUP_SITE_ENV: "production", VERCEL_ENV: "preview" })).toBe("production");
    expect(getSiteEnvironment({ NODE_ENV: "production" })).toBe("development");
    expect(isProductionSite({})).toBe(false);
    expect(isGtmAllowed({ LOOKUP_GTM_DEBUG: "1" })).toBe(true);
    expect(isGtmAllowed({ VERCEL_ENV: "preview" })).toBe(false);
  });
});

describe("security", () => {
  it("allows tracking origins on the public site but none on the admin", () => {
    const options = { development: false, supabaseOrigin: "https://abc.supabase.co" };
    const publicCsp = buildPublicCsp(options);
    const adminCsp = buildAdminCsp(options);
    expect(publicCsp).toContain("https://www.googletagmanager.com");
    expect(publicCsp).toContain("https://challenges.cloudflare.com");
    expect(publicCsp).toContain("object-src 'none'");
    expect(publicCsp).not.toContain("unsafe-eval");
    expect(adminCsp).not.toContain("googletagmanager");
    expect(adminCsp).not.toContain("facebook");
    expect(adminCsp).toContain("frame-ancestors 'none'");
    expect(adminCsp).toContain("connect-src 'self' https://abc.supabase.co");
    expect(buildAdminCsp({ ...options, development: true })).toContain("'unsafe-eval'");
  });

  it("makes admin auth cookies HttpOnly, /admin-scoped and short-lived", () => {
    const set = withAdminLifetime({ path: "/", maxAge: 400 * 24 * 60 * 60, sameSite: "lax", httpOnly: false });
    expect(set).toMatchObject({ path: ADMIN_COOKIE_PATH, httpOnly: true, sameSite: "lax", maxAge: siteConfig.admin.sessionMaxAgeSeconds });
    expect(withAdminLifetime({ maxAge: 0 }).maxAge).toBe(0);
    expect(isSupabaseAuthCookie("sb-abcdefgh-auth-token")).toBe(true);
    expect(isSupabaseAuthCookie("sb-abcdefgh-auth-token.1")).toBe(true);
    expect(isSupabaseAuthCookie("lookup-admin-auth")).toBe(false);
  });

  it("keeps the proxy matcher in sync with the configured core pages", () => {
    const source = readFileSync(join(process.cwd(), "src", "proxy.ts"), "utf8");
    const literal = source.match(/"(\/\(\(\?!_next\/[^"]+)"/)?.[1];
    expect(literal).toBeTruthy();
    const matcher = new RegExp(`^${literal!.replace(/\\\\/g, "\\")}$`);
    for (const page of siteConfig.routes.corePages) expect(matcher.test(page.path), page.path).toBe(false);
    for (const path of ["/blog", "/blog/some-post", "/old-page"]) expect(matcher.test(path), path).toBe(true);
    for (const path of ["/_next/static/a.js", "/images/logo.png", "/admin/leads", "/robots.txt", "/og-default.png"]) {
      expect(matcher.test(path), path).toBe(false);
    }
  });
});

describe("scheduled publication", () => {
  const snapshot = <T>(value: T, fetchedAt: number): (() => Promise<Snapshot<T>>) => () => Promise.resolve({ value, fetchedAt });

  it("re-reads public posts at least every minute, so a scheduled post goes live without an admin save", () => {
    expect(POST_FRESHNESS_SECONDS).toBeGreaterThan(0);
    expect(POST_FRESHNESS_SECONDS).toBeLessThanOrEqual(60);
    const posts = readFileSync(join(process.cwd(), "src", "lookup", "posts.ts"), "utf8");
    expect(posts.match(/revalidate: POST_FRESHNESS_SECONDS/g)).toHaveLength(2);
    expect(posts).not.toMatch(/revalidate: \d/);
  });

  it("serves a cached list while it is fresh", async () => {
    const load = () => Promise.reject(new Error("must not reload"));
    await expect(freshValue(snapshot(["a"], 1_000), load, 60, () => 60_000)).resolves.toEqual(["a"]);
  });

  it("never serves a list cached before a post went live once it is older than the window", async () => {
    // Saved at 10:00:00 (scheduled post not yet visible), requested at 10:05 after the post went live at 10:01.
    const savedAt = Date.UTC(2026, 0, 1, 10, 0, 0);
    const requestedAt = Date.UTC(2026, 0, 1, 10, 5, 0);
    const result = await freshValue(snapshot(["older"], savedAt), () => Promise.resolve(["scheduled", "older"]), POST_FRESHNESS_SECONDS, () => requestedAt);
    expect(result).toEqual(["scheduled", "older"]);
  });

  it("reloads a missing single post as well (a cached null does not outlive the window)", async () => {
    const result = await freshValue(snapshot<string | null>(null, 0), () => Promise.resolve("post"), 60, () => 61_000);
    expect(result).toBe("post");
  });
});

describe("media lifecycle", () => {
  const supabaseUrl = "https://abcdefgh.supabase.co";
  const id = "0f8b6f1e-3c1a-4d2b-9e7f-1234567890ab";
  const path = `uploads/2026-09/${id}.png`;
  const url = `${supabaseUrl}/storage/v1/object/public/media/${path}`;

  it("accepts exactly the paths the uploader creates", () => {
    for (const extension of new Set(Object.values(IMAGE_EXTENSIONS))) {
      expect(isManagedUploadPath(newUploadPath(extension, new Date("2026-09-16T12:00:00Z"), id)), extension).toBe(true);
    }
  });

  it("refuses any other bucket path, so Admin deletion cannot target arbitrary objects", () => {
    for (const unsafe of [
      "",
      "a.png",
      `/${path}`,
      `${path}/`,
      `uploads/2026-09/../../secret.png`,
      `uploads/2026-09/${id}.svg`,
      `uploads/2026-9/${id}.png`,
      `other/2026-09/${id}.png`,
      `uploads/2026-09/not-a-uuid.png`,
      `uploads/2026-09/${id}.png\nuploads/x`,
      `uploads/2026-09/${id.toUpperCase()}.png`,
    ]) {
      expect(isManagedUploadPath(unsafe), unsafe).toBe(false);
    }
  });

  it("takes removal candidates only from this project's public media URLs", () => {
    const row = {
      logo_url: url,
      favicon_url: `https://other.supabase.co/storage/v1/object/public/media/uploads/2026-09/${id.replace("0f", "1f")}.png`,
      default_og_image_url: "/images/logo-placeholder.png",
    };
    expect(ownUploadPaths(JSON.stringify(row), supabaseUrl)).toEqual([path]);
    expect(ownUploadPaths(JSON.stringify(row), "")).toEqual([]);
    expect(ownUploadPaths(JSON.stringify({ logo_url: url.replace("supabase.co", "supabase.co.evil.com") }), supabaseUrl)).toEqual([]);
  });

  it("counts any mention of a file as a reference, including rich-text content and other URL forms", () => {
    const content = { type: "doc", content: [{ type: "image", attrs: { src: `${url}?width=800` } }] };
    expect(referencedUploadPaths(JSON.stringify(content)).has(path)).toBe(true);
    expect(referencedUploadPaths(`https://cdn.example.com/${path}`).has(path)).toBe(true);
    expect(referencedUploadPaths(JSON.stringify({ logo_url: null })).size).toBe(0);
  });
});

describe("launch readiness and site status", () => {
  const readyFacts = (overrides: Partial<SiteFacts> = {}): SiteFacts => ({
    environment: "production",
    supabaseConfigured: true,
    databaseReadable: true,
    settings: {
      site_name: "Site",
      business_name: null,
      logo_url: "https://abc.supabase.co/storage/v1/object/public/media/uploads/2026-09/x.png",
      favicon_url: null,
      default_og_image_url: null,
      phone: null,
      email: null,
      default_meta_title: null,
      default_meta_description: null,
      indexing_enabled: false,
      local_business_schema_enabled: false,
      gtm_id: null,
    },
    homeNoindex: false,
    leadStorage: "ok",
    storage: "ok",
    signupDisabled: true,
    adminHostConfigured: false,
    siteUrl: { source: "admin", origin: "https://client-site.vercel.app" },
    turnstile: { siteKey: false, secretKey: false },
    webhook: { url: "none", host: "", secret: false },
    rateLimitSalt: false,
    gtmAllowed: true,
    sitemapUrls: ["https://client-site.vercel.app/", "https://client-site.vercel.app/contact"],
    robots: { disallowAll: false, sitemap: "https://client-site.vercel.app/sitemap.xml" },
    placeholderLogo: true,
    postSeoSchema: "ok",
    postsMissingAlt: 0,
    ...overrides,
  });
  const withSettings = (settings: Partial<NonNullable<SiteFacts["settings"]>>, overrides: Partial<SiteFacts> = {}) => {
    const base = readyFacts(overrides);
    return { ...base, settings: { ...base.settings!, ...settings } };
  };
  const ids = (facts: SiteFacts, level: string) => launchChecklist(facts).filter((item) => item.level === level).map((item) => item.id);

  it("is READY when every required check passes, even with recommended and optional items missing", () => {
    const facts = readyFacts();
    const items = launchChecklist(facts);
    expect(blockingItems(items)).toEqual([]);
    expect(siteState(facts, items)).toBe("ready");
    const summary = readinessSummary(items);
    expect(summary.required.done).toBe(summary.required.total);
    expect(summary.recommended.done).toBeLessThan(summary.recommended.total);
  });

  it("is DEVELOPMENT while a required check fails and LIVE whenever indexing is on", () => {
    const missingName = withSettings({ site_name: "" });
    expect(siteState(missingName, launchChecklist(missingName))).toBe("development");
    const live = withSettings({ indexing_enabled: true, site_name: "" });
    expect(siteState(live, launchChecklist(live))).toBe("live");
  });

  it("classifies checks as required, recommended and optional", () => {
    expect(ids(readyFacts(), "required")).toEqual(["database", "production", "signup", "siteName", "siteUrl", "homeIndexable", "leadStorage", "turnstile"]);
    expect(ids(readyFacts(), "recommended")).toEqual(["logo", "favicon", "ogImage", "contact", "defaultSeo", "sitemap", "robots", "imageAlt", "turnstileConfigured", "rateLimitSalt"]);
    expect(ids(readyFacts(), "optional")).toEqual(["webhook", "gtm", "localBusiness"]);
  });

  it("requires the business name only when LocalBusiness structured data is enabled", () => {
    expect(ids(withSettings({ business_name: null }), "required")).not.toContain("businessName");
    const localBusiness = withSettings({ local_business_schema_enabled: true, business_name: null });
    expect(blockingItems(launchChecklist(localBusiness)).map((item) => item.id)).toEqual(["businessName"]);
    expect(blockingItems(launchChecklist(withSettings({ local_business_schema_enabled: true, business_name: "Biz" })))).toEqual([]);
  });

  it("accepts an explicit site URL (including *.vercel.app) but not the inferred Vercel fallback, and requires HTTPS in production", () => {
    const blocking = (facts: SiteFacts) => blockingItems(launchChecklist(facts)).map((item) => item.id);
    expect(blocking(readyFacts({ siteUrl: { source: "env", origin: "https://www.client.co.il" } }))).toEqual([]);
    expect(blocking(readyFacts({ siteUrl: { source: "vercel", origin: "https://client-site.vercel.app" } }))).toContain("siteUrl");
    expect(blocking(readyFacts({ siteUrl: { source: "none", origin: "" } }))).toContain("siteUrl");
    expect(blocking(readyFacts({ siteUrl: { source: "admin", origin: "http://client-site.vercel.app" } }))).toContain("siteUrl");
    expect(blocking(readyFacts({ siteUrl: { source: "admin", origin: "http://localhost:3000" }, environment: "preview" }))).toContain("siteUrl");
    expect(blocking(readyFacts({ environment: "preview", siteUrl: { source: "admin", origin: "http://staging.example.com" } }))).not.toContain("siteUrl");
  });

  it("blocks going live outside production, with a noindex home page, open sign-up or a half-configured Turnstile", () => {
    const blocking = (facts: SiteFacts) => blockingItems(launchChecklist(facts)).map((item) => item.id);
    expect(blocking(readyFacts({ environment: "preview" }))).toEqual(["production"]);
    // A fully configured Preview is READY with every required configuration item done, but cannot go live.
    const preview = readyFacts({ environment: "preview" });
    expect(siteState(preview, launchChecklist(preview))).toBe("ready");
    const previewSummary = readinessSummary(launchChecklist(preview));
    expect(previewSummary.required.done).toBe(previewSummary.required.total);
    expect(blocking(readyFacts({ homeNoindex: true }))).toEqual(["homeIndexable"]);
    expect(blocking(readyFacts({ signupDisabled: null }))).toEqual(["signup"]);
    expect(blocking(readyFacts({ turnstile: { siteKey: true, secretKey: false } }))).toEqual(["turnstile"]);
    expect(blocking(readyFacts({ leadStorage: "missing_key" }))).toEqual(["leadStorage"]);
  });

  it("reports integration states: optional when absent, configured, warning or error when partial", () => {
    const row = (facts: SiteFacts, id: string) => systemHealth(facts).find((r) => r.id === id);
    expect(row(readyFacts(), "turnstile")?.status).toBe("optional");
    expect(row(readyFacts({ turnstile: { siteKey: true, secretKey: true } }), "turnstile")?.status).toBe("configured");
    expect(row(readyFacts({ turnstile: { siteKey: false, secretKey: true } }), "turnstile")?.status).toBe("error");
    expect(row(readyFacts(), "webhook")?.status).toBe("optional");
    expect(row(readyFacts({ webhook: { url: "valid", host: "hook.eu1.make.com", secret: true } }), "webhook")?.status).toBe("configured");
    expect(row(readyFacts({ webhook: { url: "valid", host: "hook.eu1.make.com", secret: false } }), "webhook")?.status).toBe("warning");
    expect(row(readyFacts({ webhook: { url: "none", host: "", secret: true } }), "webhook")?.status).toBe("warning");
    expect(row(readyFacts({ webhook: { url: "invalid", host: "", secret: true } }), "webhook")?.status).toBe("error");
    expect(row(readyFacts(), "gtm")?.status).toBe("optional");
    expect(row(withSettings({ gtm_id: "GTM-ABC123" }, { gtmAllowed: false, environment: "preview" }), "gtm")?.status).toBe("info");
    expect(row(withSettings({ gtm_id: "GTM-ABC123" }), "gtm")?.status).toBe("configured");
  });

  it("never lists intentionally unused optional integrations under 'requires attention'", () => {
    const facts = readyFacts();
    expect(attentionItems(launchChecklist(facts), systemHealth(facts))).toEqual([]);
    const broken = readyFacts({ webhook: { url: "valid", host: "hook.example.com", secret: false }, turnstile: { siteKey: true, secretKey: false } });
    const attention = attentionItems(launchChecklist(broken), systemHealth(broken));
    expect(attention).toEqual([
      { kind: "check", id: "turnstile" },
      { kind: "health", row: expect.objectContaining({ id: "webhook", status: "warning" }) },
    ]);
  });

  it("does not repeat the environment (not fixable in Admin) or duplicate a check as a health row", () => {
    const facts = readyFacts({ environment: "preview", signupDisabled: false, siteUrl: { source: "vercel", origin: "https://x.vercel.app" } });
    const attention = attentionItems(launchChecklist(facts), systemHealth(facts));
    expect(attention.filter((item) => item.kind === "check").map((item) => (item as { id: string }).id)).toEqual(["signup", "siteUrl"]);
    expect(attention.some((item) => item.kind === "health" && ["adminAuth", "siteUrl"].includes(item.row.id))).toBe(false);
    const noUrl = readyFacts({ siteUrl: { source: "none", origin: "" }, sitemapUrls: ["http://localhost:3000/"] });
    const noUrlAttention = attentionItems(launchChecklist(noUrl), systemHealth(noUrl));
    expect(noUrlAttention).toEqual([{ kind: "check", id: "siteUrl" }]);
  });

  it("warns when indexing is on in an environment that is never indexed", () => {
    const facts = withSettings({ indexing_enabled: true }, { environment: "preview", robots: { disallowAll: true, sitemap: "" } });
    expect(systemHealth(facts).find((row) => row.id === "indexing")).toMatchObject({ status: "warning", note: "indexingNoEffectHere" });
    expect(systemHealth(facts).find((row) => row.id === "robots")?.status).toBe("healthy");
  });

  it("counts leads from the start of the day and month in the site's time zone, across DST changes", () => {
    const summer = zonedPeriodStarts(new Date("2026-09-16T21:30:00Z"), "Asia/Jerusalem");
    expect(summer.day.toISOString()).toBe("2026-09-16T21:00:00.000Z");
    expect(summer.month.toISOString()).toBe("2026-08-31T21:00:00.000Z");
    const afterDstEnd = zonedPeriodStarts(new Date("2026-10-30T12:00:00Z"), "Asia/Jerusalem");
    expect(afterDstEnd.day.toISOString()).toBe("2026-10-29T22:00:00.000Z");
    expect(afterDstEnd.month.toISOString()).toBe("2026-09-30T21:00:00.000Z");
  });

  it("keeps indexing out of the settings form: only the launch action can switch it", () => {
    const actionsDir = join(process.cwd(), "src", "lookup", "admin", "actions");
    const writers = readdirSync(actionsDir).filter((file) => readFileSync(join(actionsDir, file), "utf8").includes("indexing_enabled"));
    expect(writers).toEqual(["launch.ts"]);
    const launch = readFileSync(join(actionsDir, "launch.ts"), "utf8");
    expect(launch.indexOf("blockingItems(report.checklist)")).toBeLessThan(launch.indexOf("setIndexing(true)"));
  });
});

describe("contextual admin actions", () => {
  const check = (id: Parameters<typeof checkAction>[0]["id"], level: "required" | "recommended" | "optional", ok = false) =>
    checkAction({ id, level, ok, group: "site" });
  const health = (id: Parameters<typeof healthAction>[0]["id"], status: Parameters<typeof healthAction>[0]["status"]) => healthAction({ id, status });

  it("points each unmet check at the place it is fixed, with a specific label", () => {
    expect(check("logo", "recommended")).toEqual({ href: "/admin/settings#settings-business", label: "העלאת לוגו", optional: false });
    expect(check("favicon", "recommended")).toMatchObject({ href: "/admin/settings#settings-business", label: "העלאת Favicon" });
    expect(check("ogImage", "recommended")).toMatchObject({ href: "/admin/settings#settings-seo", label: "העלאת תמונה" });
    expect(check("defaultSeo", "recommended")).toMatchObject({ href: "/admin/settings#settings-seo", label: "הגדרת SEO" });
    expect(check("siteUrl", "required")).toMatchObject({ href: "/admin/settings#settings-business", label: "הגדרת כתובת" });
    expect(check("homeIndexable", "required")).toMatchObject({ href: "/admin/pages", label: "מעבר ל-SEO" });
    expect(check("siteName", "required")).toMatchObject({ href: "/admin/settings#settings-business", label: "הגדרת פרטי אתר" });
    expect(check("contact", "recommended")).toMatchObject({ label: "הגדרת פרטי אתר" });
    expect(check("turnstile", "required")).toMatchObject({ href: "/admin/system#integration-turnstile", label: "תיקון" });
    expect(check("turnstileConfigured", "recommended")).toEqual({ href: "/admin/system#integration-turnstile", label: "הגדרה", optional: true });
  });

  it("gives no action to met checks or to checks that are not fixed in Admin", () => {
    expect(check("logo", "recommended", true)).toBeNull();
    for (const id of ["production", "signup", "rateLimitSalt"] as const) expect(check(id, "required")).toBeNull();
  });

  it("keeps unused optional integrations optional: quiet setup action, never 'fix'", () => {
    expect(check("gtm", "optional")).toEqual({ href: "/admin/settings#settings-tracking", label: "הגדרה", optional: true });
    expect(check("webhook", "optional")).toEqual({ href: "/admin/system#integration-webhook", label: "הגדרה", optional: true });
    expect(health("turnstile", "optional")).toEqual({ href: "/admin/system#integration-turnstile", label: "הגדרה", optional: true });
    expect(health("webhook", "optional")).toMatchObject({ label: "הגדרה", optional: true });
    expect(health("gtm", "optional")).toMatchObject({ href: "/admin/settings#settings-tracking", optional: true });
  });

  it("marks partial or broken integrations and system problems as 'fix' at their card", () => {
    expect(health("turnstile", "error")).toEqual({ href: "/admin/system#integration-turnstile", label: "תיקון", optional: false });
    expect(health("webhook", "warning")).toEqual({ href: "/admin/system#integration-webhook", label: "תיקון", optional: false });
    expect(health("leadStorage", "error")).toMatchObject({ href: "/admin/system#integration-supabase", label: "תיקון" });
    expect(health("siteUrl", "warning")).toMatchObject({ href: "/admin/settings#settings-business", label: "הגדרת כתובת" });
    expect(health("indexing", "warning")).toMatchObject({ href: "/admin/launch", label: "מעבר להשקה" });
    for (const [id, status] of [["database", "healthy"], ["gtm", "info"], ["gtm", "configured"], ["indexing", "info"], ["adminAuth", "error"]] as const) {
      expect(health(id, status), `${id}/${status}`).toBeNull();
    }
  });

  it("links only to anchors that exist", () => {
    const settings = readFileSync(join(process.cwd(), "src", "app", "admin", "(protected)", "settings", "page.tsx"), "utf8");
    for (const id of ["settings-business", "settings-seo", "settings-tracking"]) expect(settings, id).toContain(`id="${id}"`);
    const system = readFileSync(join(process.cwd(), "src", "app", "admin", "(protected)", "system", "page.tsx"), "utf8");
    expect(system).toContain("id={`integration-${row.id}`}");
  });
});

describe("webhook test", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.LEAD_WEBHOOK_SECRET;
  });

  it("sends lead-shaped TEST data with event lead.test and test: true", () => {
    const body = JSON.parse(buildTestWebhookBody("production", new Date("2026-01-01T00:00:00Z"), "abc"));
    expect(body).toMatchObject({ event: LEAD_TEST_WEBHOOK_EVENT, test: true, lead_id: "TEST-abc", environment: "production" });
    expect(Object.keys(body.lead)).toEqual(
      "name,phone,email,message,project_type,consent,form_name,landing_page,referrer,utm_source,utm_medium,utm_campaign,utm_content,utm_term,gclid,gbraid,wbraid,fbclid,ttclid,status".split(","),
    );
    for (const key of ["name", "phone", "message"]) expect(body.lead[key]).toMatch(/TEST/);
    for (const key of ["email", "form_name", "landing_page", "utm_source", "utm_campaign"]) expect(String(body.lead[key]).toLowerCase()).toMatch(/test/);
    expect(body.lead.email).toMatch(/\.invalid$/);
  });

  it("delivers through the same signed, retried path as real lead notifications", async () => {
    process.env.LEAD_WEBHOOK_SECRET = "test-secret";
    const calls: { headers: Record<string, string>; body: string }[] = [];
    const responses = [new Response("", { status: 500 }), new Response("", { status: 200 })];
    vi.stubGlobal("fetch", async (_url: string, init: { headers: Record<string, string>; body: string }) => {
      calls.push(init);
      return responses.shift()!;
    });
    vi.useFakeTimers();
    const body = buildTestWebhookBody("preview");
    const pending = postSignedWebhook("https://hooks.example.com/abc", LEAD_TEST_WEBHOOK_EVENT, body);
    await vi.runAllTimersAsync();
    const result = await pending;
    vi.useRealTimers();
    expect(result).toEqual({ ok: true, status: 200 });
    expect(calls).toHaveLength(2);
    const { headers } = calls[1];
    expect(headers["X-Lookup-Event"]).toBe("lead.test");
    expect(headers["X-Lookup-Delivery"]).toBe(calls[0].headers["X-Lookup-Delivery"]);
    expect(headers["X-Lookup-Signature"]).toBe(signWebhookPayload(body, headers["X-Lookup-Timestamp"], "test-secret"));
  });

  it("keeps server-only variable names out of the admin dictionary (it is bundled into client components)", () => {
    const dictionary = readFileSync(join(process.cwd(), "src", "lookup", "admin", "i18n.ts"), "utf8");
    for (const name of ["SUPABASE_SERVICE_ROLE_KEY", "TURNSTILE_SECRET_KEY", "LEAD_WEBHOOK_SECRET", "LEAD_RATE_LIMIT_SALT", "E2E_TEST_TOKEN"]) {
      expect(dictionary, name).not.toContain(name);
    }
  });

  it("stores nothing: the test action never touches the database or lead metrics", () => {
    const source = readFileSync(join(process.cwd(), "src", "lookup", "admin", "actions", "integrations.ts"), "utf8");
    expect(source).not.toMatch(/supabase|from\(|insert|update\(|revalidate/i);
  });
});

describe("content safety", () => {
  const click = { button: 0, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false, defaultPrevented: false };
  const here = "https://site.example/admin/posts/1";

  it("snapshots only user-editable fields and compares them exactly", () => {
    const a = snapshotEntries([["$ACTION_ID_abc", ""], ["id", "1"], ["base_updated_at", "t1"], ["title", "Hello"], ["robots_index", "on"]]);
    expect(a).toEqual({ title: "Hello", robots_index: "on" });
    expect(sameSnapshot(a, snapshotEntries([["base_updated_at", "t2"], ["title", "Hello"], ["robots_index", "on"]]))).toBe(true);
    expect(sameSnapshot(a, snapshotEntries([["title", "Hello"]]))).toBe(false);
    expect(sameSnapshot(a, snapshotEntries([["title", "Hello!"], ["robots_index", "on"]]))).toBe(false);
  });

  it("guards only clicks that leave the page in the same tab", () => {
    expect(leavesPage({ href: "/admin/leads" }, click, here)).toBe(true);
    expect(leavesPage({ href: "/admin/posts/1?x=1" }, click, here)).toBe(true);
    expect(leavesPage({ href: "/admin/posts/1#seo" }, click, here)).toBe(false);
    expect(leavesPage({ href: "/admin/preview/posts/1", target: "_blank" }, click, here)).toBe(false);
    expect(leavesPage({ href: "https://other.example/" }, click, here)).toBe(false);
    expect(leavesPage({ href: "/admin/leads" }, { ...click, metaKey: true }, here)).toBe(false);
    expect(leavesPage({ href: "/admin/leads" }, { ...click, defaultPrevented: true }, here)).toBe(false);
    expect(leavesPage({ href: "/files/a.csv", download: true }, click, here)).toBe(false);
  });

  it("autosaves to the server only posts stored as drafts", () => {
    expect(canServerAutosave({ id: "1", status: "draft" }, "draft")).toBe(true);
    expect(canServerAutosave({ id: "1", status: "published" }, "published")).toBe(false);
    expect(canServerAutosave({ id: "1", status: "draft" }, "published")).toBe(false); // explicitly published in this session
    expect(canServerAutosave(null, null)).toBe(false); // a new post is only protected locally until it is created
  });

  it("scopes local copies per editor and post and ignores foreign or corrupt records", () => {
    expect(recoveryKey("user-a", "post-1")).not.toBe(recoveryKey("user-b", "post-1"));
    expect(recoveryKey("user-a", null)).toContain(":new");
    const record = { v: 1, postId: "post-1", baseUpdatedAt: "t1", savedAt: 5, fields: { title: "x" } };
    expect(parseRecovery(JSON.stringify(record), "post-1")).toEqual(record);
    expect(parseRecovery(JSON.stringify(record), "post-2")).toBeNull();
    expect(parseRecovery("{not json", "post-1")).toBeNull();
    expect(parseRecovery(JSON.stringify({ ...record, v: 2 }), "post-1")).toBeNull();
  });

  it("offers a local copy only when it differs, and flags it stale when the server moved on", () => {
    const record = { v: 1 as const, postId: "p", baseUpdatedAt: "t1", savedAt: 5, fields: { title: "Local edit" } };
    expect(recoveryOffer(null, { title: "Server" }, "t1")).toBeNull();
    expect(recoveryOffer(record, { title: "Local edit" }, "t1")).toBeNull();
    expect(recoveryOffer(record, { title: "Server" }, "t1")).toEqual({ savedAt: 5, stale: false });
    expect(recoveryOffer(record, { title: "Newer server" }, "t2")).toEqual({ savedAt: 5, stale: true });
  });

  it("restores form fields onto the post shown in the editor", () => {
    const post = { id: "p", title: "Old", slug: "old", status: "published", content: { type: "doc", content: [] }, robots_index: true } as unknown as Parameters<typeof applyRecovery>[0];
    const restored = applyRecovery(post, {
      title: "New",
      slug: "new",
      status: "published",
      published_at: "2026-01-01T10:00:00.000Z",
      excerpt: "",
      content: JSON.stringify({ type: "doc", content: [{ type: "paragraph" }] }),
    });
    expect(restored).toMatchObject({ id: "p", title: "New", slug: "new", status: "published", excerpt: null, robots_index: false });
    expect(restored.content).toEqual({ type: "doc", content: [{ type: "paragraph" }] });
  });

  it("enforces draft-only autosave and stale-save protection on the server, without cache or media side effects", () => {
    const source = readFileSync(join(process.cwd(), "src", "lookup", "admin", "actions", "posts.ts"), "utf8");
    const autosave = source.slice(source.indexOf("export async function autosaveDraft"), source.indexOf("export async function deletePost"));
    expect(autosave.length).toBeGreaterThan(200);
    expect(autosave).toMatch(/\.eq\("status", "draft"\)/);
    expect(autosave).toMatch(/\.eq\("updated_at", baseUpdatedAt\)/);
    expect(autosave).not.toMatch(/updateTag|revalidatePath|removeUnreferencedUploads|redirect\(/);
    // Status and publish date are removed from the parsed fields and never written by autosave.
    expect(autosave).toMatch(/status: _status, published_at: _publishedAt, \.\.\.fields \} = parsed\.data/);
    expect(autosave).toMatch(/writeWithSocialSeoFallback\(\{ \.\.\.fields, slug \}/);
    expect(autosave).toMatch(/\.update\(values\)\.eq\("id", id\)\.eq\("status", "draft"\)\.eq\("updated_at", baseUpdatedAt\)/);
    const save = source.slice(source.indexOf("export async function savePost"), source.indexOf("export async function autosaveDraft"));
    expect(save).toMatch(/update\.eq\("updated_at", baseUpdatedAt\)/);
    expect(save).toMatch(/conflict: true/);
    // References dropped by autosave remain explicit-save cleanup candidates; only managed upload paths are accepted.
    expect(save).toMatch(/previous_uploads: previousUploadsField/);
    expect(save).toMatch(/split\(","\)\.filter\(isManagedUploadPath\)/);
    expect(snapshotEntries([["previous_uploads", "uploads/x.png"], ["title", "T"]])).toEqual({ title: "T" });
  });

  it("protects the meaningful admin edit forms against accidental navigation", () => {
    const read = (...parts: string[]) => readFileSync(join(process.cwd(), ...parts), "utf8");
    for (const page of ["settings", "pages", "redirects"]) {
      expect(read("src", "app", "admin", "(protected)", page, "page.tsx"), page).toMatch(/<AdminForm[^>]*guardUnsaved/);
    }
    expect(read("src", "lookup", "admin", "PostForm.tsx")).toContain("useUnsavedChanges(formRef)");
  });
});

describe("per-page SEO resolution (v1.2)", () => {
  const settings = mergeSiteSettings(
    { site_name: "Site", default_meta_title: "Default title", default_meta_description: "Default description" },
    siteConfig,
    "example.com",
  );

  it("resolves the same values composeMetadata emits — one resolution for live metadata and Admin previews", () => {
    const input = pageSeoInput({ path: "/contact", title: "Contact" }, { og_title: "Share me", robots_follow: false }, settings, true);
    const resolved = resolveSeo(input);
    const meta = composeMetadata({ ...input, ogLocale: "he_IL" });
    expect(meta.title).toEqual({ absolute: resolved.title });
    expect(meta.description).toBe(resolved.description);
    expect(meta.alternates?.canonical).toBe(resolved.canonical);
    expect(meta.robots).toEqual({ index: resolved.index, follow: resolved.follow });
    expect(meta.openGraph).toMatchObject({ title: resolved.ogTitle, description: resolved.ogDescription, url: resolved.canonical });
    expect(resolved).toMatchObject({ title: "Contact | Site", ogTitle: "Share me", ogDescription: "Default description", follow: false });
  });

  it("falls back OG title → SEO title, OG description → meta description, OG image → page image → default share image", () => {
    const withSeo = resolveSeo(pageSeoInput({ path: "/" }, { meta_title: "SEO title", meta_description: "SEO description" }, settings, false));
    expect(withSeo).toMatchObject({ ogTitle: "SEO title", ogDescription: "SEO description", canonical: "https://example.com/", canonicalElsewhere: false });
    expect(withSeo.ogImage.generated).toBe(true);
    const shared = mergeSiteSettings({ site_name: "Site", default_og_image_url: "/share.png" }, siteConfig, "example.com");
    expect(resolveSeo(pageSeoInput({ path: "/" }, undefined, shared, false)).ogImage).toEqual({ url: "https://example.com/share.png", generated: false });
    expect(resolveSeo(pageSeoInput({ path: "/" }, { og_image_url: "https://cdn.example.com/og.png" }, shared, false)).ogImage.url).toBe(
      "https://cdn.example.com/og.png",
    );
  });

  it("keeps existing post metadata unchanged when the v1.2 fields are absent (database without migration 8)", () => {
    const legacyPost = { slug: "hello", title: "Hello", excerpt: "Excerpt", featured_image_url: "https://cdn.example.com/f.png", robots_index: true };
    const meta = composeMetadata({ ...postSeoInput(legacyPost, settings, "/blog", true), ogLocale: "he_IL", type: "article" });
    expect(meta).toMatchObject({
      title: { absolute: "Hello | Site" },
      description: "Excerpt",
      alternates: { canonical: "https://example.com/blog/hello" },
      robots: { index: true, follow: true },
      openGraph: { title: "Hello | Site", description: "Excerpt", images: [{ url: "https://cdn.example.com/f.png" }] },
    });
    const withNew = resolveSeo(postSeoInput({ ...legacyPost, og_title: "OG", og_description: "OG description", robots_follow: false }, settings, "/blog", true));
    expect(withNew).toMatchObject({ ogTitle: "OG", ogDescription: "OG description", title: "Hello | Site", index: true, follow: false });
  });

  it("never lets page flags override global indexing, and keeps the page's own flags for the Admin states", () => {
    const resolved = resolveSeo(pageSeoInput({ path: "/" }, { robots_index: true, robots_follow: true }, settings, false));
    expect(resolved).toMatchObject({ index: false, follow: false, pageIndex: true, pageFollow: true });
  });

  it("compares canonical URLs ignoring host case, a trailing slash and the hash — not the path or query", () => {
    expect(sameUrl("https://Example.com/blog/", "https://example.com/blog")).toBe(true);
    expect(sameUrl("https://example.com/blog#top", "https://example.com/blog")).toBe(true);
    expect(sameUrl("https://example.com/blog?a=1", "https://example.com/blog")).toBe(false);
    expect(sameUrl("https://other.com/blog", "https://example.com/blog")).toBe(false);
    expect(sameUrl("http://example.com/blog", "https://example.com/blog")).toBe(false);
  });

  it("reports factual states on the resolved result, with intentional choices as information", () => {
    const fallbackOnly = resolveSeo(pageSeoInput({ path: "/" }, undefined, settings, true));
    expect(seoStates(fallbackOnly)).toEqual([]);
    const bare = mergeSiteSettings({ site_name: "" }, siteConfig, "example.com");
    const bareResolved = resolveSeo(pageSeoInput({ path: "/" }, undefined, { ...bare, siteName: "", defaultMetaTitle: "" }, true));
    expect(seoStates(bareResolved).map((state) => [state.id, state.level])).toEqual([
      ["missingTitle", "problem"],
      ["missingDescription", "improve"],
    ]);
    const long = resolveSeo(
      pageSeoInput(
        { path: "/" },
        { meta_title: "t".repeat(61), meta_description: "d".repeat(161), robots_index: false, robots_follow: false, canonical_url: "https://other.com/" },
        settings,
        true,
      ),
    );
    expect(seoStates(long)).toEqual([
      { id: "titleTooLong", level: "improve", length: 61 },
      { id: "descriptionTooLong", level: "improve", length: 161 },
      { id: "noindex", level: "info" },
      { id: "nofollow", level: "info" },
      { id: "canonicalElsewhere", level: "info" },
    ]);
    const selfCanonical = resolveSeo(pageSeoInput({ path: "/contact" }, { canonical_url: "https://example.com/contact/" }, settings, true));
    expect(seoStates(selfCanonical)).toEqual([]);
  });

  it("Admin routes and public metadata read the same registered route entries", () => {
    for (const file of [["page.tsx"], ["contact", "page.tsx"], ["blog", "page.tsx"]]) {
      const source = readFileSync(join(process.cwd(), "src", "app", "(site)", ...file), "utf8");
      expect(source, file.join("/")).toMatch(/buildPageMetadata\((registeredRoute\("[^"]+"\)|blog)\)/);
    }
  });
});

describe("sitemap rules (v1.2)", () => {
  const base = {
    siteUrl: "https://example.com",
    corePages: [{ path: "/", label: "Home" }, { path: "/contact", label: "Contact" }, { path: "/hidden", label: "Hidden", nav: false }],
    blog: { path: "/blog", label: "Blog" },
  };
  const post = (slug: string, extra: { robots_index?: boolean; canonical_url?: string | null } = {}) => ({
    slug,
    robots_index: true,
    canonical_url: null,
    updated_at: "2026-09-01T00:00:00+00:00",
    ...extra,
  });

  it("excludes noindex pages and pages or posts whose explicit canonical points elsewhere; keeps self canonicals", () => {
    const urls = sitemapEntries({
      ...base,
      pageSeo: new Map([
        ["/contact", { robots_index: true, canonical_url: "https://other.com/contact" }],
        ["/", { robots_index: true, canonical_url: "https://example.com/" }],
      ]),
      posts: [post("a"), post("b", { canonical_url: "https://medium.com/b" }), post("c", { robots_index: false }), post("d", { canonical_url: "https://example.com/blog/d/" })],
    }).map((entry) => entry.url);
    expect(urls).toEqual(["https://example.com/", "https://example.com/hidden", "https://example.com/blog", "https://example.com/blog/a", "https://example.com/blog/d"]);
    const noindexHome = sitemapEntries({ ...base, pageSeo: new Map([["/", { robots_index: false, canonical_url: null }]]), posts: [] }).map((e) => e.url);
    expect(noindexHome).toEqual(["https://example.com/contact", "https://example.com/hidden"]);
  });

  it("lists the blog index only when at least one post is listed", () => {
    const urls = sitemapEntries({ ...base, pageSeo: new Map(), posts: [post("x", { canonical_url: "https://other.com/x" })] }).map((e) => e.url);
    expect(urls).not.toContain("https://example.com/blog");
  });
});

describe("navigation visibility (v1.2)", () => {
  const routes = {
    corePages: [{ path: "/", label: "Home" }, { path: "/landing", label: "Landing", nav: false }, { path: "/about", label: "About", nav: true }],
    blog: { path: "/blog", label: "Blog" },
  };

  it("hides nav: false routes from navigation only; omitted keeps the current behavior", () => {
    expect(navigationRoutes(routes, true).map((route) => route.path)).toEqual(["/", "/about", "/blog"]);
    expect(navigationRoutes(routes, false).map((route) => route.path)).toEqual(["/", "/about"]);
    // CLIENT-OVERRIDE: this site registers its legal pages with nav: false (see docs/client-notes.md).
    expect(navigationRoutes(siteConfig.routes, true)).toEqual([...siteConfig.routes.corePages, siteConfig.routes.blog].filter((route) => route.nav !== false));
  });

  it("keeps nav: false routes registered for Pages & SEO", () => {
    const source = readFileSync(join(process.cwd(), "src", "app", "admin", "(protected)", "pages", "page.tsx"), "utf8");
    expect(source).toContain("[...siteConfig.routes.corePages, siteConfig.routes.blog]");
    const chrome = readFileSync(join(process.cwd(), "src", "components", "SiteChrome.tsx"), "utf8");
    expect(chrome).toContain("navigationRoutes(siteConfig.routes");
  });
});

describe("content image alt text (v1.2)", () => {
  const doc = (...images: Record<string, unknown>[]) => ({
    type: "doc",
    content: [{ type: "paragraph" }, ...images.map((attrs) => ({ type: "image", attrs: { src: "https://x.supabase.co/storage/v1/object/public/media/a.png", ...attrs } }))],
  });

  it("counts non-decorative images with empty alt as missing; decorative images and described images are fine", () => {
    expect(postAltFacts({ content: doc({ alt: "A dog" }) })).toEqual({ contentMissing: 0, featuredMissing: false, total: 0 });
    expect(postAltFacts({ content: doc({ alt: "" }) }).contentMissing).toBe(1);
    expect(postAltFacts({ content: doc({ alt: "   " }) }).contentMissing).toBe(1);
    expect(postAltFacts({ content: doc({ alt: null }) }).contentMissing).toBe(1);
    expect(postAltFacts({ content: doc({ alt: "", decorative: true }) }).contentMissing).toBe(0);
  });

  it("treats existing image JSON compatibly: an empty alt is never assumed decorative, existing alt is kept", () => {
    const legacy = doc({ alt: "" }, { alt: "Existing" });
    expect(contentImages(legacy)).toEqual([
      { src: "https://x.supabase.co/storage/v1/object/public/media/a.png", alt: "", decorative: false },
      { src: "https://x.supabase.co/storage/v1/object/public/media/a.png", alt: "Existing", decorative: false },
    ]);
    expect(contentImages(null)).toEqual([]);
    expect(contentImages({ type: "doc", content: [{ type: "blockquote", content: [{ type: "image", attrs: { alt: "" } }] }] })).toHaveLength(1);
  });

  it("requires alt text for a featured image only when one is used", () => {
    expect(postAltFacts({ featured_image_url: "https://cdn.example.com/f.png", featured_image_alt: "" })).toMatchObject({ featuredMissing: true, total: 1 });
    expect(postAltFacts({ featured_image_url: "https://cdn.example.com/f.png", featured_image_alt: "Team" }).featuredMissing).toBe(false);
    expect(postAltFacts({ featured_image_url: null, featured_image_alt: null }).featuredMissing).toBe(false);
    expect(postAltFacts({ featured_image_url: "https://cdn.example.com/f.png", content: doc({ alt: "" }) }).total).toBe(2);
  });

  it("renders decorative images with an empty alt and keeps other alt text unchanged", () => {
    const html = renderToStaticMarkup(createElement(RichText, { doc: doc({ alt: "Kept alt", decorative: true }, { alt: "Visible alt" }, { alt: "" }) }));
    expect(html).not.toContain("Kept alt");
    expect(html).toContain('alt="Visible alt"');
    expect(html.match(/alt=""/g)).toHaveLength(2);
  });

  it("adds a recommended (non-blocking) checklist item with an action to the affected posts", () => {
    const facts = (postsMissingAlt: number | null) => ({
      environment: "production",
      supabaseConfigured: true,
      databaseReadable: true,
      settings: null,
      homeNoindex: false,
      leadStorage: "ok",
      storage: "ok",
      signupDisabled: true,
      adminHostConfigured: false,
      siteUrl: { source: "admin", origin: "https://example.com" },
      turnstile: { siteKey: false, secretKey: false },
      webhook: { url: "none", host: "", secret: false },
      rateLimitSalt: false,
      gtmAllowed: true,
      sitemapUrls: [],
      robots: null,
      placeholderLogo: false,
      postSeoSchema: "ok",
      postsMissingAlt,
    }) as SiteFacts;
    const item = launchChecklist(facts(2)).find((check) => check.id === "imageAlt");
    expect(item).toEqual({ id: "imageAlt", group: "seo", level: "recommended", ok: false });
    expect(blockingItems(launchChecklist(facts(2))).some((check) => check.id === "imageAlt")).toBe(false);
    expect(attentionItems(launchChecklist(facts(2)), []).some((entry) => entry.kind === "check" && entry.id === "imageAlt")).toBe(false);
    expect(checkAction(item!)).toEqual({ href: "/admin/posts?alt=missing", label: "לפוסטים הרלוונטיים", optional: false });
    expect(launchChecklist(facts(0)).find((check) => check.id === "imageAlt")?.ok).toBe(true);
    expect(launchChecklist(facts(null)).some((check) => check.id === "imageAlt")).toBe(false);
  });

  it("keeps the rich-text editor's decorative flag and alt panel wired", () => {
    const editor = readFileSync(join(process.cwd(), "src", "lookup", "admin", "RichTextEditor.tsx"), "utf8");
    expect(editor).toMatch(/Image\.extend\(/);
    expect(editor).toMatch(/decorative: \{\s*default: false/);
    expect(editor).toMatch(/updateAttributes\("image"/);
  });
});

describe("migration 8 compatibility (v1.2)", () => {
  it("recognizes only the missing v1.2 post columns, never other database errors", () => {
    expect(isMissingSocialSeoColumn({ code: "PGRST204", message: "Could not find the 'og_title' column of 'posts' in the schema cache" })).toBe(true);
    expect(isMissingSocialSeoColumn({ code: "42703", message: "column posts.robots_follow does not exist" })).toBe(true);
    expect(isMissingSocialSeoColumn({ code: "42703", message: "column posts.other does not exist" })).toBe(false);
    expect(isMissingSocialSeoColumn({ code: "23505", message: "duplicate key og_title" })).toBe(false);
    expect(isMissingSocialSeoColumn({ code: "42501", message: "permission denied for table posts" })).toBe(false);
    expect(isMissingSocialSeoColumn(null)).toBe(false);
  });

  it("drops the v1.2 fields only when they are at their defaults", () => {
    expect(withoutSocialSeo({ title: "T", og_title: null, og_description: "", robots_follow: true })).toEqual({ rest: { title: "T" }, atDefaults: true });
    expect(withoutSocialSeo({ title: "T", og_title: "OG", robots_follow: true }).atDefaults).toBe(false);
    expect(withoutSocialSeo({ title: "T", og_title: null, robots_follow: false }).atDefaults).toBe(false);
  });

  it("retries a write without the v1.2 columns only for that specific error and only when nothing is lost", async () => {
    const missing = { data: null, error: { code: "PGRST204", message: "Could not find the 'og_description' column of 'posts' in the schema cache" } };
    const calls: object[] = [];
    const write = async (values: object) => {
      calls.push(values);
      return "og_title" in values ? missing : { data: [{ id: "1" }], error: null };
    };
    await expect(writeWithSocialSeoFallback({ title: "T", og_title: null, og_description: null, robots_follow: true }, write)).resolves.toEqual({
      data: [{ id: "1" }],
      error: null,
    });
    expect(calls).toEqual([{ title: "T", og_title: null, og_description: null, robots_follow: true }, { title: "T" }]);
    await expect(writeWithSocialSeoFallback({ title: "T", og_title: "Entered", robots_follow: true }, write)).resolves.toBe("migrationRequired");
    const unrelated = { data: null, error: { code: "23505", message: "duplicate" } };
    let unrelatedCalls = 0;
    await expect(
      writeWithSocialSeoFallback({ title: "T", og_title: null, robots_follow: true }, async () => {
        unrelatedCalls += 1;
        return unrelated;
      }),
    ).resolves.toBe(unrelated);
    expect(unrelatedCalls).toBe(1);
  });

  it("restores v1.2 fields from local copies, and keeps the stored follow flag for copies written before v1.2", () => {
    const post = { id: "p", title: "T", slug: "t", status: "draft", robots_follow: false } as unknown as Parameters<typeof applyRecovery>[0];
    expect(applyRecovery(post, { title: "T", og_title: "OG", og_description: "", robots_follow: "on" })).toMatchObject({ og_title: "OG", og_description: null, robots_follow: true });
    expect(applyRecovery(post, { title: "T", og_title: "" })).toMatchObject({ robots_follow: false });
    expect(applyRecovery(post, { title: "T" })).toMatchObject({ robots_follow: false });
    expect(applyRecovery(null, { title: "T" })).toMatchObject({ robots_follow: true });
  });

  it("reports a missing migration 8 as a database-version warning that is actionable", () => {
    const rows = systemHealth({
      environment: "production",
      supabaseConfigured: true,
      databaseReadable: true,
      settings: null,
      homeNoindex: false,
      leadStorage: "ok",
      storage: "ok",
      signupDisabled: true,
      adminHostConfigured: false,
      siteUrl: { source: "admin", origin: "https://example.com" },
      turnstile: { siteKey: false, secretKey: false },
      webhook: { url: "none", host: "", secret: false },
      rateLimitSalt: false,
      gtmAllowed: true,
      sitemapUrls: [],
      robots: null,
      placeholderLogo: false,
      postSeoSchema: "missing",
      postsMissingAlt: 0,
    });
    const schema = rows.find((row) => row.id === "schema");
    expect(schema).toEqual({ id: "schema", status: "warning", note: "postSeoMigrationMissing" });
    expect(healthAction(schema!)).toMatchObject({ href: "/admin/system#integration-supabase", label: "תיקון" });
    expect(attentionItems([], rows).some((entry) => entry.kind === "health" && entry.row.id === "schema")).toBe(true);
  });
});

describe("Pages & SEO reset (v1.2)", () => {
  const params = (url: string) => Object.fromEntries(new URL(url, "http://admin.test").searchParams);

  it("gives only the reset page's form a new identity after each successful reset, so it remounts from the defaults", () => {
    const before = pageSeoFormKey("/contact", {});
    const afterReset = pageSeoFormKey("/contact", params(resetRedirect("/contact", 1)));
    expect(afterReset).not.toBe(before);
    expect(pageSeoFormKey("/contact", params(resetRedirect("/contact", 2)))).not.toBe(afterReset);
    // Other pages keep their form (and any unsaved edits) when a different page is reset.
    expect(pageSeoFormKey("/", params(resetRedirect("/contact", 1)))).toBe(pageSeoFormKey("/", {}));
    // Saving does not navigate, so the key (and the save confirmation) stays stable.
    expect(pageSeoFormKey("/contact", params(resetRedirect("/contact", 1)))).toBe(afterReset);
    expect(params(resetRedirect("/contact", 1)).reset).toBe("/contact");
  });

  it("wires the key into the form and the nonce into the reset redirect", () => {
    const page = readFileSync(join(process.cwd(), "src", "app", "admin", "(protected)", "pages", "page.tsx"), "utf8");
    expect(page).toMatch(/<AdminForm key=\{pageSeoFormKey\(page\.path, \{ reset, at \}\)\} action=\{savePageSeo\}/);
    const action = readFileSync(join(process.cwd(), "src", "lookup", "admin", "actions", "pages.ts"), "utf8");
    const reset = action.slice(action.indexOf("export async function resetPageSeo"));
    expect(reset).toMatch(/\.from\("page_seo"\)\.delete\(\)\.eq\("path", parsed\.data\.path\)/);
    expect(reset).toMatch(/redirect\(resetRedirect\(parsed\.data\.path, Date\.now\(\)\)\)/);
  });
});
