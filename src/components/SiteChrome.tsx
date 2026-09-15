import type { ReactNode } from "react";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { getPublishedPosts } from "@/lookup/posts";
import { phoneHref, type SiteSettings } from "@/lookup/settings-model";
import { siteConfig } from "@/site.config";

export type NavLink = { href: string; label: string };

/** Public header + main + footer. The blog link appears once at least one post is published. */
export default async function SiteChrome({ settings, children }: { settings: SiteSettings; children: ReactNode }) {
  const posts = await getPublishedPosts();
  const { corePages, blog } = siteConfig.routes;
  const links: NavLink[] = [...corePages, ...(posts.length > 0 ? [blog] : [])].map((route) => ({
    href: route.path,
    label: route.navLabel ?? route.label,
  }));
  const tel = phoneHref(settings.phone, siteConfig.phone);

  return (
    <>
      <Header siteName={settings.siteName} logoUrl={settings.logoUrl} phoneDisplay={settings.phone} phoneHref={tel} links={links} />
      <main className="flex-1">{children}</main>
      <Footer
        businessName={settings.businessName}
        phoneDisplay={settings.phone}
        phoneHref={tel}
        email={settings.email}
        address={settings.address}
        links={links}
      />
    </>
  );
}
