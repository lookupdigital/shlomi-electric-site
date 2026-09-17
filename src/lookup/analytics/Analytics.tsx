"use client";

import { usePathname } from "next/navigation";
import Script from "next/script";
import { useEffect } from "react";
import {
  classifyClick,
  initializeConsent,
  pushTrackingConfig,
  sanitizeLocation,
  track,
  type ConsentValue,
} from "@/lookup/analytics/events";
import { captureAttribution } from "@/lookup/attribution";

type Props = {
  /** Validated GTM container ID, or null when GTM must not load (not production, or not configured). */
  gtmId: string | null;
  consentDefault: ConsentValue;
  trackingConfig: Record<string, string>;
};

let lastPageView: string | null = null;

const isAdminPath = (pathname: string) => pathname === "/admin" || pathname.startsWith("/admin/");

/** Never track on the admin, or on the dedicated admin host when host isolation is enabled. */
function trackingDisabled(pathname: string): boolean {
  if (isAdminPath(pathname)) return true;
  const adminHost = process.env.NEXT_PUBLIC_ADMIN_HOST;
  return typeof window !== "undefined" && Boolean(adminHost) && window.location.host === adminHost;
}

function linkLocation(element: Element) {
  if (element.closest("header")) return "header";
  if (element.closest("footer")) return "footer";
  return "content";
}

export default function Analytics({ gtmId, consentDefault, trackingConfig }: Props) {
  const pathname = usePathname();
  const disabled = isAdminPath(pathname);

  // Order matters: consent default → tracking config → page_view, all before GTM loads.
  useEffect(() => {
    if (trackingDisabled(pathname)) return;
    initializeConsent(consentDefault);
    pushTrackingConfig(trackingConfig);
    captureAttribution();
    const pageKey = window.location.pathname + window.location.search;
    if (pageKey === lastPageView) return;
    lastPageView = pageKey;
    track({ event: "page_view", page_path: window.location.pathname, page_location: sanitizeLocation(window.location.href) });
  }, [pathname, consentDefault, trackingConfig]);

  // One delegated listener; each click produces at most one event (see classifyClick).
  useEffect(() => {
    if (trackingDisabled(pathname)) return;
    function onClick(event: MouseEvent) {
      const target = event.target instanceof Element ? event.target : null;
      if (!target) return;
      const link = target.closest<HTMLAnchorElement>("a[href]");
      const cta = target.closest<HTMLElement>("[data-track-cta]");
      const result = classifyClick(link?.getAttribute("href") ?? null, cta?.dataset.trackCta || null);
      if (!result) return;
      const page_path = window.location.pathname;
      const link_location = linkLocation(link ?? cta ?? target);
      if (result.event === "cta_click") {
        track({ event: "cta_click", page_path, cta_name: result.ctaName, link_location });
      } else {
        track({ event: result.event, page_path, link_location, ...(result.ctaName ? { cta_name: result.ctaName } : {}) });
      }
    }
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, [pathname]);

  if (disabled || !gtmId) return null;

  return (
    <Script id="lookup-gtm" strategy="afterInteractive">
      {`(function(w,d,s,l,i){if(w.__lookupGtmLoaded||(${JSON.stringify(process.env.NEXT_PUBLIC_ADMIN_HOST ?? "")}&&w.location.host===${JSON.stringify(process.env.NEXT_PUBLIC_ADMIN_HOST ?? "")}))return;w.__lookupGtmLoaded=true;w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s);j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer',${JSON.stringify(gtmId)});`}
    </Script>
  );
}
