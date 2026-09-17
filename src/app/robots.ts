import type { MetadataRoute } from "next";
import { isProductionSite } from "@/lookup/runtime";
import { getSiteSettings } from "@/lookup/settings";

// Per request for the same reason as sitemap.ts: the sitemap URL follows the admin "site URL" setting.
export const dynamic = "force-dynamic";

/**
 * Non-production environments (LOOKUP_SITE_ENV / VERCEL_ENV): block all crawling.
 * Production: allow crawling except private paths. Whether pages may be INDEXED is controlled by the
 * "indexing enabled" site setting through <meta name="robots">, because a robots.txt block would stop
 * search engines from ever seeing that noindex instruction.
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  if (!isProductionSite()) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  const settings = await getSiteSettings();
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api/"] },
    sitemap: `${settings.siteUrl}/sitemap.xml`,
  };
}
