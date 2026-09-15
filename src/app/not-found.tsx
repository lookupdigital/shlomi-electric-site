import type { Metadata } from "next";
import Button from "@/components/Button";
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
      <section className="bg-offwhite">
        <div className="container-x flex flex-col items-center gap-6 py-24 text-center lg:py-32">
          <p className="font-heading text-6xl font-semibold text-brand" aria-hidden="true">
            404
          </p>
          <h1 className="h1 text-navy">העמוד לא נמצא</h1>
          <p className="subheading max-w-[576px] text-muted">ייתכן שהקישור שגוי או שהעמוד הוסר.</p>
          <Button href="/">חזרה לדף הבית</Button>
        </div>
      </section>
    </SiteChrome>
  );
}
