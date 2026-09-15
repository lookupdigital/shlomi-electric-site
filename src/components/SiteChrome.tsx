import type { ReactNode } from "react";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { phoneHref, type SiteSettings } from "@/lookup/settings-model";

/** Public header + main + footer, fed by site settings. Shared by the public layout and the 404 page. */
export default function SiteChrome({ settings, children }: { settings: SiteSettings; children: ReactNode }) {
  const tel = phoneHref(settings.phone);
  return (
    <>
      <Header siteName={settings.siteName} logoUrl={settings.logoUrl} phoneDisplay={settings.phone} phoneHref={tel} />
      <main className="flex-1">{children}</main>
      <Footer
        businessName={settings.businessName}
        phoneDisplay={settings.phone}
        phoneHref={tel}
        email={settings.email}
        address={settings.address}
      />
    </>
  );
}
