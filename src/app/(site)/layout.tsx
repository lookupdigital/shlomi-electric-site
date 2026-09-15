import type { ReactNode } from "react";
import SiteChrome from "@/components/SiteChrome";
import { JsonLd, siteSchemas } from "@/lookup/schema";
import { getSiteSettings } from "@/lookup/settings";

export default async function SiteLayout({ children }: { children: ReactNode }) {
  const settings = await getSiteSettings();
  return (
    <>
      <JsonLd data={siteSchemas(settings)} />
      <SiteChrome settings={settings}>{children}</SiteChrome>
    </>
  );
}
