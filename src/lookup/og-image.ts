import type { SiteConfig } from "@/lookup/config";
import type { SiteSettings } from "@/lookup/settings-model";

export type OgLogoSource = { kind: "remote"; url: string } | { kind: "file"; path: string };

/**
 * Where the generated default Open Graph image takes its logo from: the logo set in Admin → Site settings
 * (an uploaded image URL or a file in /public), falling back to the logo shipped with the site.
 */
export function ogLogoSource(settings: Pick<SiteSettings, "logoUrl">, config: Pick<SiteConfig, "branding">): OgLogoSource {
  const logo = settings.logoUrl || config.branding.logoUrl;
  if (/^https:\/\//i.test(logo)) return { kind: "remote", url: logo };
  return { kind: "file", path: logo.replace(/^\/+/, "") };
}

export const OG_LOGO_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  svg: "image/svg+xml",
};
