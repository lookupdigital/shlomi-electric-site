// Typed contract between the reusable Lookup infrastructure and one client site.
// Each site provides its values in src/site.config.ts; code under src/lookup never hardcodes client assumptions.

export type RouteEntry = {
  path: string;
  /** Label in the admin (e.g. the Pages & SEO screen). */
  label: string;
  /** Label in the public navigation; defaults to `label`. */
  navLabel?: string;
  /** Page title from code, rendered as "<title> | <site name>". */
  title?: string;
  /**
   * false = keep the route registered (Pages & SEO, metadata, sitemap) but leave it out of the site navigation.
   * Omitted = shown in the navigation (unchanged behavior).
   */
  nav?: boolean;
};

/** Routes shown in the public navigation: registered core pages (and the blog once it has posts) unless nav: false. */
export function navigationRoutes(routes: { corePages: RouteEntry[]; blog: RouteEntry }, blogHasPosts: boolean): RouteEntry[] {
  return [...routes.corePages, ...(blogHasPosts ? [routes.blog] : [])].filter((route) => route.nav !== false);
}

/** Visitor-facing lead form messages (in the site's language). */
export type LeadMessages = {
  nameRequired: string;
  nameTooLong: string;
  phoneInvalid: string;
  emailInvalid: string;
  consentRequired: string;
  serverError: string;
  rateLimited: string;
  verificationFailed: string;
};

export type PhoneRules = {
  /** Country calling code without "+", used to turn national numbers into tel:/WhatsApp links, e.g. "972". */
  countryCallingCode: string;
  /** National trunk prefix replaced by the country code, e.g. "0" (empty when the country has none). */
  nationalTrunkPrefix: string;
  /** Digit count accepted by the lead form (all non-digits are ignored). */
  minDigits: number;
  maxDigits: number;
};

export type SiteConfig = {
  /**
   * Fallback site name used only when the "site name" admin setting is empty. Keep it empty for a new client: the
   * admin dashboard then warns that the site identity is missing instead of publishing a placeholder name.
   */
  identity: { siteName: string };
  locale: {
    /** <html lang> */
    htmlLang: string;
    dir: "rtl" | "ltr";
    /** BCP 47 tag for Intl formatting and schema.org inLanguage, e.g. "he-IL". */
    bcp47: string;
    /** Open Graph locale, e.g. "he_IL". */
    ogLocale: string;
    /** IANA time zone for displaying dates, e.g. "Asia/Jerusalem". */
    timeZone: string;
  };
  /** Phone number normalization (links, structured data) and lead-form validation for the client's country. */
  phone: PhoneRules;
  business: {
    /**
     * Resilience fallback for the service area. The admin setting (site_settings.service_area) is the source of truth;
     * this value is used only when the settings row cannot be read or the database predates that column.
     */
    serviceArea: string;
  };
  /**
   * schema.org types for the LocalBusiness entity. It is emitted only when an admin enables it AND the business name
   * plus a phone or an address are set.
   */
  schema: { businessTypes: string[] };
  routes: {
    /** Public static pages. Must match the core-page exclusions in src/proxy.ts (enforced by a unit test). */
    corePages: RouteEntry[];
    /** Blog index. The route folder is app/(site)/blog, so the path is "/blog". */
    blog: RouteEntry;
  };
  leads: {
    /** Value sent as lead_type with the generate_lead event. */
    leadType: string;
    /** Options for the optional "project type" field of the lead form; empty hides the field. */
    projectTypes: string[];
    rateLimit: { maxSubmissions: number; windowSeconds: number };
    messages: LeadMessages;
  };
  branding: {
    /** Logo in /public (PNG), also used for the generated default Open Graph image. */
    logoUrl: string;
    ogBackground: string;
    ogAccent: string;
  };
  faq: {
    /** Emit FAQPage structured data. Enable only when the visible questions and answers are final. */
    structuredData: boolean;
  };
  admin: {
    /** Admin session cookie lifetime (sliding: renewed whenever the access token refreshes). */
    sessionMaxAgeSeconds: number;
  };
};

/** Generated default Open Graph image (src/app/og-default.png/route.tsx). */
export const DEFAULT_OG_IMAGE = { path: "/og-default.png", width: 1200, height: 630 } as const;

export function defineSiteConfig(config: SiteConfig): SiteConfig {
  return config;
}
