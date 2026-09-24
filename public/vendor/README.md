# Vendored third-party assets

## open-nagish.min.js — OpenNagish v1.1.5 (MIT)

Accessibility toolbar: https://github.com/leon2589/open-nagish

**Self-hosted on purpose.** The site's CSP (`src/lookup/security/csp.ts`) allows scripts and fonts from
`'self'` only, so the jsDelivr copy would be blocked.

**Local patch applied:** the two OpenDyslexic `@font-face` URLs were changed from
`https://cdn.jsdelivr.net/npm/open-dyslexic@1.0.3/woff/` to `/vendor/fonts/`, and the font files were
downloaded into `fonts/`. Without this the dyslexia-font button fails silently (CSP blocks `font-src`).

**To upgrade:** download the new `dist/open-nagish.min.js`, re-apply that single find-and-replace, and
check the release notes for new external URLs (`grep -oE "https?://[^\"')]+" open-nagish.min.js`).

Configuration lives in `src/components/AccessibilityWidget.tsx`.
