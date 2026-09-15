import { describe, expect, it } from "vitest";
import { sanitizeEvent, sanitizeLocation } from "@/lookup/analytics/events";
import { ATTRIBUTION_TTL_MS, nextAttribution, type Attribution } from "@/lookup/attribution";
import { leadSchema } from "@/lookup/leads/schema";
import { leadSource } from "@/lookup/leads/source";
import { SLUG_PATTERN, slugify } from "@/lookup/slug";
import { findRedirectLoop, isValidDestination, normalizePath } from "@/lookup/redirects";
import { safeHref, safeImageSrc } from "@/lookup/richtext";
import { composeMetadata } from "@/lookup/seo-model";
import { mergeSiteSettings, phoneHref, whatsappHref, type SiteDefaults } from "@/lookup/settings-model";

const defaults: SiteDefaults = {
  businessName: "Business",
  siteName: "Site",
  phone: "03-555-1234",
  whatsapp: "972500000000",
  email: "a@b.co",
  address: "Street 1",
  logoUrl: "/images/logo.png",
  defaultMetaDescription: "Default description",
};

describe("site settings", () => {
  it("falls back to code defaults and keeps indexing off", () => {
    const settings = mergeSiteSettings(null, defaults, "example.vercel.app");
    expect(settings.siteName).toBe("Site");
    expect(settings.siteUrl).toBe("https://example.vercel.app");
    expect(settings.indexingEnabled).toBe(false);
  });

  it("formats phone and WhatsApp links like the original site", () => {
    expect(phoneHref("03-555-1234")).toBe("tel:+97235551234");
    expect(whatsappHref("972500000000")).toBe("https://wa.me/972500000000");
    expect(whatsappHref("050-123-4567")).toBe("https://wa.me/972501234567");
  });
});

describe("metadata", () => {
  const settings = mergeSiteSettings(null, defaults, "example.com");

  it("uses code title with site name, canonical from site URL and noindex when not indexable", () => {
    const meta = composeMetadata({ settings, path: "/projects", fallbackTitle: "Projects", indexable: false });
    expect(meta.title).toEqual({ absolute: "Projects | Site" });
    expect(meta.alternates?.canonical).toBe("https://example.com/projects");
    expect(meta.robots).toEqual({ index: false, follow: false });
    expect(meta.description).toBe("Default description");
  });

  it("prefers admin SEO fields", () => {
    const meta = composeMetadata({
      settings,
      path: "/",
      indexable: true,
      seo: { meta_title: "Custom", canonical_url: "https://x.com/", og_image_url: "/og.png", robots_follow: false },
    });
    expect(meta.title).toEqual({ absolute: "Custom" });
    expect(meta.alternates?.canonical).toBe("https://x.com/");
    expect(meta.robots).toEqual({ index: true, follow: false });
    expect(meta.openGraph?.images).toEqual([{ url: "https://example.com/og.png" }]);
  });
});

describe("analytics PII guard", () => {
  it("drops unknown keys, emails and phone-like labels", () => {
    const event = sanitizeEvent({
      event: "generate_lead",
      form_name: "contact",
      page_path: "/contact",
      lead_type: "050-123-4567",
      // @ts-expect-error — extra keys must be stripped even if a caller bypasses the types
      email: "someone@example.com",
    });
    expect(event).toEqual({ event: "generate_lead", form_name: "contact", page_path: "/contact" });
  });

  it("keeps only campaign parameters in page_location", () => {
    expect(sanitizeLocation("https://s.co/p?utm_source=g&email=a@b.co&gclid=1")).toBe(
      "https://s.co/p?utm_source=g&gclid=1",
    );
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
    expect(
      nextAttribution(stored, { ...base, search: "", referrer: "https://facebook.com/x", now: base.now + 1000 }),
    ).toBeNull();
  });

  it("replaces an expired touch", () => {
    const stored: Attribution = { utm_source: "google", captured_at: base.now };
    const next = nextAttribution(stored, { ...base, search: "", now: base.now + ATTRIBUTION_TTL_MS + 1 });
    expect(next?.utm_source).toBeUndefined();
  });

  it("ignores same-site referrers and strips referrer query strings", () => {
    expect(nextAttribution(null, { ...base, search: "", referrer: "https://s.co/x" })?.referrer).toBeUndefined();
    expect(nextAttribution(null, { ...base, search: "", referrer: "https://google.com/search?q=x" })?.referrer).toBe(
      "https://google.com/search",
    );
  });
});

describe("lead validation", () => {
  const valid = {
    name: "ישראל ישראלי",
    phone: "050-1234567",
    form_name: "contact",
    submission_id: "11111111-1111-4111-8111-111111111111",
  };

  it("accepts a valid lead and normalises empty optionals to null", () => {
    const result = leadSchema.safeParse({ ...valid, email: "", utm_source: "google" });
    expect(result.success).toBe(true);
    expect(result.data?.email).toBeNull();
    expect(result.data?.utm_source).toBe("google");
  });

  it("rejects bad phone, bad email and missing required consent", () => {
    expect(leadSchema.safeParse({ ...valid, phone: "123" }).success).toBe(false);
    expect(leadSchema.safeParse({ ...valid, email: "nope" }).success).toBe(false);
    expect(leadSchema.safeParse({ ...valid, consent_required: "1" }).success).toBe(false);
    expect(leadSchema.safeParse({ ...valid, consent_required: "1", consent: "on" }).success).toBe(true);
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
  it("creates URL-safe slugs from Latin and Hebrew titles", () => {
    expect(slugify("  Office Renovation: 5 Tips! ")).toBe("office-renovation-5-tips");
    expect(slugify("שיפוץ משרדים – מדריך")).toBe("שיפוץ-משרדים-מדריך");
    expect(SLUG_PATTERN.test(slugify("שיפוץ משרדים – מדריך"))).toBe(true);
  });
});

describe("lead source", () => {
  it("prefers UTMs, then click IDs, then referrer", () => {
    expect(leadSource({ utm_source: "google", utm_medium: "cpc", utm_campaign: "brand" })).toEqual({
      source: "google / cpc",
      campaign: "brand",
    });
    expect(leadSource({ fbclid: "x" }).source).toBe("Meta");
    expect(leadSource({ referrer: "https://www.google.com/" }).source).toBe("www.google.com");
    expect(leadSource({}).source).toBe("ישיר / לא ידוע");
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
