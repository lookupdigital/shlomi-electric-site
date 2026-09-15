import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { classifyClick, sanitizeEvent, sanitizeLocation } from "@/lookup/analytics/events";
import { ATTRIBUTION_TTL_MS, nextAttribution, type Attribution } from "@/lookup/attribution";
import { DEFAULT_OG_IMAGE } from "@/lookup/config";
import { csvCell, toCsv } from "@/lookup/leads/csv";
import {
  applyLeadFilters,
  leadFiltersToQuery,
  parseLeadFilters,
  sanitizeSearchTerm,
  type LeadFilterQuery,
} from "@/lookup/leads/filters";
import { signWebhookPayload } from "@/lookup/leads/notify";
import { clientIp, isAuthorizedTestSubmission, rateLimitBucket } from "@/lookup/leads/protection";
import { createLeadSchema } from "@/lookup/leads/schema";
import { leadSource } from "@/lookup/leads/source";
import { findRedirectLoop, isValidDestination, normalizePath } from "@/lookup/redirects";
import { safeHref, safeImageSrc } from "@/lookup/richtext";
import { getSiteEnvironment, isGtmAllowed, isProductionSite } from "@/lookup/runtime";
import { buildAdminCsp, buildPublicCsp } from "@/lookup/security/csp";
import { composeMetadata, latestTimestamp } from "@/lookup/seo-model";
import { mergeSiteSettings, phoneHref, whatsappHref } from "@/lookup/settings-model";
import { SLUG_PATTERN, slugify } from "@/lookup/slug";
import { ADMIN_COOKIE_PATH, isSupabaseAuthCookie, withAdminLifetime } from "@/lookup/supabase/cookies";
import { siteConfig } from "@/site.config";

describe("site settings", () => {
  it("keeps empty fields empty — no demo fallbacks — and indexing off by default", () => {
    const settings = mergeSiteSettings({ phone: "", email: null }, siteConfig, "example.vercel.app");
    expect(settings.phone).toBe("");
    expect(settings.email).toBe("");
    expect(settings.address).toBe("");
    expect(settings.siteName).toBe(siteConfig.identity.siteName);
    expect(settings.logoUrl).toBe(siteConfig.branding.logoUrl);
    expect(settings.siteUrl).toBe("https://example.vercel.app");
    expect(settings.indexingEnabled).toBe(false);
    expect(settings.consentDefault).toBe("granted");
  });

  it("builds international phone and WhatsApp links from the configured country rules", () => {
    expect(phoneHref("03-555-1234", siteConfig.phone)).toBe("tel:+97235551234");
    expect(whatsappHref("050-123-4567", siteConfig.phone)).toBe("https://wa.me/972501234567");
    expect(whatsappHref("972500000000", siteConfig.phone)).toBe("https://wa.me/972500000000");
    expect(phoneHref("(415) 555-0100", { countryCallingCode: "1", nationalTrunkPrefix: "" })).toBe("tel:+4155550100");
    expect(phoneHref("+1 415 555 0100", { countryCallingCode: "972", nationalTrunkPrefix: "0" })).toBe("tel:+14155550100");
    expect(phoneHref("", siteConfig.phone)).toBe("");
  });
});

describe("metadata", () => {
  const settings = mergeSiteSettings({ site_name: "Site" }, siteConfig, "example.com");

  it("uses the generated default OG image with dimensions and noindex when not indexable", () => {
    const meta = composeMetadata({ settings, ogLocale: "he_IL", path: "/projects", fallbackTitle: "Projects", indexable: false });
    expect(meta.title).toEqual({ absolute: "Projects | Site" });
    expect(meta.alternates?.canonical).toBe("https://example.com/projects");
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
    expect(classifyClick("tel:+97235551234", null)).toEqual({ event: "phone_click" });
    expect(classifyClick("mailto:a@b.co", null)).toEqual({ event: "email_click" });
    expect(classifyClick("/contact#contact-form", "header_quote")).toEqual({ event: "cta_click", ctaName: "header_quote" });
    expect(classifyClick("/projects", null)).toBeNull();
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
  const leadSchema = createLeadSchema(siteConfig.leads.messages);
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
