import type { Metadata } from "next";
import { Assistant, Heebo } from "next/font/google";
import Analytics from "@/lookup/analytics/Analytics";
import { isGtmAllowed } from "@/lookup/runtime";
import { getSiteSettings, isIndexable } from "@/lookup/settings";
import { siteConfig } from "@/site.config";
import "./globals.css";

const heebo = Heebo({
  variable: "--font-heebo",
  subsets: ["hebrew", "latin"],
});

const assistant = Assistant({
  variable: "--font-assistant",
  subsets: ["hebrew", "latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const indexable = isIndexable(settings);
  return {
    metadataBase: new URL(settings.siteUrl),
    applicationName: settings.siteName,
    title: {
      default: settings.defaultMetaTitle || settings.siteName,
      template: `%s | ${settings.siteName}`,
    },
    description: settings.defaultMetaDescription || undefined,
    robots: { index: indexable, follow: indexable },
    openGraph: { type: "website", locale: siteConfig.locale.ogLocale, siteName: settings.siteName },
    ...(settings.faviconUrl ? { icons: { icon: settings.faviconUrl } } : {}),
  };
}

const GTM_ID_PATTERN = /^GTM-[A-Z0-9]{4,12}$/;

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const settings = await getSiteSettings();
  const { gtmId, ga4Id, metaPixelId, tiktokPixelId, linkedinPartnerId } = settings.tracking;
  // GTM loads only in the production environment (or with LOOKUP_GTM_DEBUG=1), never locally by accident.
  const loadGtm = isGtmAllowed() && GTM_ID_PATTERN.test(gtmId);

  return (
    <html
      lang={siteConfig.locale.htmlLang}
      dir={siteConfig.locale.dir}
      className={`${heebo.variable} ${assistant.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        {children}
        <Analytics
          gtmId={loadGtm ? gtmId : null}
          consentDefault={settings.consentDefault}
          trackingConfig={{
            ga4_measurement_id: ga4Id,
            meta_pixel_id: metaPixelId,
            tiktok_pixel_id: tiktokPixelId,
            linkedin_partner_id: linkedinPartnerId,
          }}
        />
      </body>
    </html>
  );
}
