import type { SiteConfig } from "@/lookup/config";
import { absoluteUrl, type SiteSettings } from "@/lookup/settings-model";

type Schema = Record<string, unknown>;

/** Renders JSON-LD safely ("<" is escaped so admin-edited text cannot break out of the script tag). */
export function JsonLd({ data }: { data: Schema | Schema[] }) {
  const payload = Array.isArray(data)
    ? { "@context": "https://schema.org", "@graph": data }
    : { "@context": "https://schema.org", ...data };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(payload).replace(/</g, "\\u003c") }}
    />
  );
}

type SchemaConfig = Pick<SiteConfig, "locale" | "schema">;

export function organizationSchema(settings: SiteSettings): Schema {
  const sameAs = Object.values(settings.social).filter(Boolean);
  return {
    "@type": "Organization",
    "@id": `${settings.siteUrl}/#organization`,
    name: settings.businessName,
    url: settings.siteUrl,
    logo: absoluteUrl(settings.siteUrl, settings.logoUrl),
    ...(sameAs.length ? { sameAs } : {}),
  };
}

export function websiteSchema(settings: SiteSettings, config: SchemaConfig): Schema {
  return {
    "@type": "WebSite",
    "@id": `${settings.siteUrl}/#website`,
    name: settings.siteName,
    url: settings.siteUrl,
    inLanguage: config.locale.bcp47,
    publisher: { "@id": `${settings.siteUrl}/#organization` },
  };
}

/** Only emitted after an admin confirms the business details are real (local_business_schema_enabled). */
export function localBusinessSchema(settings: SiteSettings, config: SchemaConfig): Schema {
  return {
    "@type": config.schema.businessTypes.length === 1 ? config.schema.businessTypes[0] : config.schema.businessTypes,
    "@id": `${settings.siteUrl}/#localbusiness`,
    name: settings.businessName,
    url: settings.siteUrl,
    image: absoluteUrl(settings.siteUrl, settings.logoUrl),
    telephone: settings.phone || undefined,
    email: settings.email || undefined,
    address: settings.address ? { "@type": "PostalAddress", streetAddress: settings.address } : undefined,
  };
}

export function siteSchemas(settings: SiteSettings, config: SchemaConfig): Schema[] {
  return [
    organizationSchema(settings),
    websiteSchema(settings, config),
    ...(settings.localBusinessSchemaEnabled ? [localBusinessSchema(settings, config)] : []),
  ];
}

export function breadcrumbSchema(items: { name: string; url: string }[]): Schema {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

/** Use only when every question and answer is visible on the page and final (see siteConfig.faq). */
export function faqSchema(items: { q: string; a: string }[]): Schema {
  return {
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
}

export function blogPostingSchema(post: {
  settings: SiteSettings;
  config: SchemaConfig;
  url: string;
  title: string;
  description?: string | null;
  image?: string | null;
  publishedAt: string;
  updatedAt: string;
  author?: string | null;
}): Schema {
  const { settings } = post;
  return {
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description || undefined,
    image: post.image ? absoluteUrl(settings.siteUrl, post.image) : undefined,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    inLanguage: post.config.locale.bcp47,
    mainEntityOfPage: post.url,
    author: post.author ? { "@type": "Person", name: post.author } : { "@id": `${settings.siteUrl}/#organization` },
    publisher: { "@id": `${settings.siteUrl}/#organization` },
  };
}
