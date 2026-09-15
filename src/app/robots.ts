import type { MetadataRoute } from "next";
import { getSiteSettings } from "@/lookup/settings";

/**
 * Preview/development deployments: block all crawling.
 * Production: allow crawling except private paths. Whether pages may be INDEXED is controlled by the
 * "indexing enabled" site setting through <meta name="robots">, because a robots.txt block would stop
 * search engines from ever seeing that noindex instruction.
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  if (process.env.VERCEL_ENV !== "production") {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  const settings = await getSiteSettings();
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api/"] },
    sitemap: `${settings.siteUrl}/sitemap.xml`,
  };
}
