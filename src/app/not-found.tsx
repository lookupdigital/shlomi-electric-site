import type { Metadata } from "next";
import NotFoundView from "@/components/NotFoundView";
import SiteChrome from "@/components/SiteChrome";
import { getSiteSettings } from "@/lookup/settings";

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
