"use client";

import { usePathname } from "next/navigation";
import Script from "next/script";
import { useEffect } from "react";
import { pushTrackingConfig, sanitizeLocation, track } from "@/lookup/analytics/events";
import { captureAttribution } from "@/lookup/attribution";

type Props = {
  /** Validated GTM container ID, or null when GTM must not load (not production, or not configured). */
  gtmId: string | null;
  trackingConfig: Record<string, string>;
};

let lastPageView: string | null = null;

const isAdminPath = (pathname: string) => pathname === "/admin" || pathname.startsWith("/admin/");

function linkLocation(element: Element) {
  if (element.closest("header")) return "header";
  if (element.closest("footer")) return "footer";
  return "content";
}

const WHATSAPP_LINK = /^(https?:\/\/(wa\.me|api\.whatsapp\.com|web\.whatsapp\.com)\/|whatsapp:)/i;

export default function Analytics({ gtmId, trackingConfig }: Props) {
  const pathname = usePathname();
  const isAdmin = isAdminPath(pathname);

  // page_view: exactly one per page (initial load and each client-side navigation).
  useEffect(() => {
    if (isAdmin) return;
    pushTrackingConfig(trackingConfig);
    captureAttribution();
    const pageKey = window.location.pathname + window.location.search;
    if (pageKey === lastPageView) return;
    lastPageView = pageKey;
    track({
      event: "page_view",
      page_path: window.location.pathname,
      page_location: sanitizeLocation(window.location.href),
    });
  }, [pathname, isAdmin, trackingConfig]);

  // One delegated listener for phone / WhatsApp / email links and [data-track-cta] elements.
  useEffect(() => {
    if (isAdmin) return;
    function onClick(event: MouseEvent) {
      const target = event.target instanceof Element ? event.target : null;
      if (!target) return;
      const page_path = window.location.pathname;

      const cta = target.closest<HTMLElement>("[data-track-cta]");
      if (cta) {
        track({ event: "cta_click", page_path, cta_name: cta.dataset.trackCta || "cta", link_location: linkLocation(cta) });
      }

      const link = target.closest<HTMLAnchorElement>("a[href]");
      if (!link) return;
      const href = link.getAttribute("href") ?? "";
      const link_location = linkLocation(link);
      if (href.startsWith("tel:")) track({ event: "phone_click", page_path, link_location });
      else if (href.startsWith("mailto:")) track({ event: "email_click", page_path, link_location });
      else if (WHATSAPP_LINK.test(href)) track({ event: "whatsapp_click", page_path, link_location });
    }
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, [isAdmin]);

  if (isAdmin || !gtmId) return null;

  return (
    <Script id="lookup-gtm" strategy="afterInteractive">
      {`(function(w,d,s,l,i){if(w.__lookupGtmLoaded)return;w.__lookupGtmLoaded=true;w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s);j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer',${JSON.stringify(gtmId)});`}
    </Script>
  );
}
