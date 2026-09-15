import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { DEFAULT_OG_IMAGE } from "@/lookup/config";
import { siteConfig } from "@/site.config";

// Default Open Graph image (1200×630), generated at build time from the site logo and brand colours.
// Used whenever a page and the settings have no custom OG image. Text-free, so no font files are needed.
export const dynamic = "force-static";

export async function GET() {
  const { logoUrl, ogBackground, ogAccent } = siteConfig.branding;
  const logo = await readFile(join(process.cwd(), "public", logoUrl.replace(/^\//, "")));
  const logoSrc = `data:image/png;base64,${logo.toString("base64")}`;

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
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoSrc} width={250} height={316} alt="" style={{ objectFit: "contain" }} />
        </div>
      </div>
    ),
    { width: DEFAULT_OG_IMAGE.width, height: DEFAULT_OG_IMAGE.height },
  );
}
