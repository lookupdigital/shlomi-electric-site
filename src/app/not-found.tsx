import type { Metadata } from "next";
import { getSiteSettings } from "@/lookup/settings";
import { NotFoundView, SiteChrome } from "@/site/adapter";

export const metadata: Metadata = {
  title: "העמוד לא נמצא",
  robots: { index: false, follow: false },
};

export default async function NotFound() {
  const settings = await getSiteSettings();
  return (
    <SiteChrome settings={settings}>
      <NotFoundView />
    </SiteChrome>
  );
}
