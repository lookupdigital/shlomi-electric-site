import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { ImageResponse } from "next/og";
import { DEFAULT_OG_IMAGE } from "@/lookup/config";
import { OG_LOGO_TYPES, ogLogoSource, type OgLogoSource } from "@/lookup/og-image";
import { getSiteSettings } from "@/lookup/settings";
import { siteConfig } from "@/site.config";

// Default Open Graph image (1200×630) from the admin logo and the brand colours. Used whenever a page and the
// settings have no custom OG image. Text-free, so no font files are needed. Rendered per request so a logo changed
// in the admin is used immediately (a prerendered copy would keep the logo from build time).
export const dynamic = "force-dynamic";

const PUBLIC_DIR = resolve(process.cwd(), "public");

async function loadLogo(source: OgLogoSource): Promise<string | null> {
  try {
    if (source.kind === "remote") {
      const response = await fetch(source.url, { signal: AbortSignal.timeout(5000) });
      const type = response.headers.get("content-type")?.split(";")[0] ?? "";
      if (!response.ok || !Object.values(OG_LOGO_TYPES).includes(type)) return null;
      return `data:${type};base64,${Buffer.from(await response.arrayBuffer()).toString("base64")}`;
    }
    const file = resolve(PUBLIC_DIR, source.path);
    const type = OG_LOGO_TYPES[extname(file).slice(1).toLowerCase()];
    if (!type || !file.startsWith(PUBLIC_DIR + sep)) return null;
    return `data:${type};base64,${(await readFile(file)).toString("base64")}`;
  } catch {
    return null;
  }
}

export async function GET() {
  const { ogBackground, ogAccent } = siteConfig.branding;
  const settings = await getSiteSettings();
  // An unreachable or unsupported admin logo falls back to the logo shipped with the site.
  const logoSrc =
    (await loadLogo(ogLogoSource(settings, siteConfig))) ?? (await loadLogo(ogLogoSource({ logoUrl: "" }, siteConfig)));

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: ogBackground,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 420,
            height: 420,
            borderRadius: 48,
            background: "#ffffff",
            borderBottom: `18px solid ${ogAccent}`,
          }}
        >
          {logoSrc && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoSrc} width={250} height={316} alt="" style={{ objectFit: "contain" }} />
          )}
        </div>
      </div>
    ),
    { width: DEFAULT_OG_IMAGE.width, height: DEFAULT_OG_IMAGE.height },
  );
}
