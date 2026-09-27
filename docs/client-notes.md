# Client notes — Shlomi Boaron (שלומי בארון)

Keep it free of secrets.

- Origin: the pilot the Lookup Starter was extracted from (Production baseline `4ab284b`, see
  `docs/shlomi-production-baseline.md` on `lookup-infra/m0-audit`). Upgraded to Lookup Starter **1.2.0**
  (tag `v1.2.0` → `a24bd3b`) on branch `upgrade/lookup-starter-v1.2.0`.
- Supabase project: `shlomiboaron` (ap-northeast-1) — **shared by Preview and Production**.
- Vercel project: `shlomi-electric-site`, Production branch `main`.
- Production domain / admin host: Vercel default domain; no custom domain or admin host yet.
- Migrations applied: 1–6 (2026-09-15/16). **Pending: 7 `20260917090000_lookup_consent_default_denied.sql` and
  8 `20260918090000_lookup_post_social_seo.sql`** (apply in order, never `fresh-install.sql`). Until 8 is applied the
  site and Admin work, post saves that set OG title/description or nofollow are refused with a message, and System
  health shows the database version as a warning.
- Consent Mode decision: the saved value is `granted` (configured before the Starter default became `denied`);
  migration 7 does not change it because the site and business names are set.
- Integrations: Turnstile active (real keys in Production, test keys in Preview); lead webhook not configured; GTM off.
- Site config differences from the Starter defaults (`src/site.config.ts`): core page `/projects`, schema types
  `Electrician` + `GeneralContractor`, `quote_request` lead type with seven project types, service-area fallback,
  Shlomi brand colours and logo, FAQ structured data on (answers are confirmed and visible).
- `src/proxy.ts` matcher also excludes `projects$` (the documented step for an extra core page; a unit test checks it).
- `CLIENT-OVERRIDE` changes in core paths:
  - `src/lookup/lookup.test.ts` — the single-type LocalBusiness assertion uses an explicit config instead of the
    Starter default `businessTypes`. Upstream candidate: make that Starter test config-independent.
- Pages outside `siteConfig.routes` (not in Pages & SEO or the sitemap, unchanged by the upgrade): `/accessibility`,
  `/privacy`, `/terms`.
- Launch date and indexing enabled on: not launched (indexing off).
