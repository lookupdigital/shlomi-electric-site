import Script from "next/script";

/**
 * OpenNagish accessibility toolbar (MIT, self-hosted in /public/vendor).
 * Self-hosted on purpose: the site's Content-Security-Policy only allows first-party scripts and fonts,
 * and the vendor file was patched to load the OpenDyslexic font from /vendor/fonts instead of a CDN.
 * See public/vendor/README.md before upgrading.
 */
export default function AccessibilityWidget() {
  return (
    <>
      <Script id="open-nagish-config" strategy="afterInteractive">
        {`window.OpenNagishConfig = {
  position: 'bottom-left',
  lang: 'he',
  statementUrl: '/accessibility'
};`}
      </Script>
      <Script src="/vendor/open-nagish.min.js" strategy="lazyOnload" />
    </>
  );
}
