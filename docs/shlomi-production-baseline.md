# Shlomi Production baseline — reference implementation for Lookup Starter v1

Frozen on 2026-09-16 after the end-to-end audit, the Production deployment and the legacy test-data cleanup.
This is the validated reference the Lookup Starter extraction starts from. Do not refactor it in place.

## Deployment

| | |
| --- | --- |
| Production commit | `4ab284b` (`main`, fast-forwarded from `lookup-infra/m0-audit`) |
| Production URL | https://shlomi-electric-site.vercel.app (Vercel default domain; no custom domain yet) |
| Previous Production | `228acad` (static Figma site) |
| Hosting | Vercel (Next.js 16, App Router), Production branch `main` |
| Database | Supabase project `shlomiboaron` (ap-northeast-1) — **shared by Preview and Production** |
| Public state | Indexing OFF (`noindex, nofollow`), GTM OFF, lead notifications not configured |

## Migrations (all applied, in order)

1. `20260915130000_lookup_foundation.sql` — `admin_users`, `is_admin()`, `set_updated_at()`
2. `20260915130100_lookup_content.sql` — `site_settings` (singleton), `page_seo`, `posts`, `redirects` + RLS
3. `20260915130200_lookup_leads.sql` — `leads` (attribution columns, unique `submission_id`) + RLS
4. `20260915130300_lookup_media_storage.sql` — public `media` bucket, admin-only writes
5. `20260916090000_lookup_hardening.sql` — lead workflow/test/notification columns, admin status update & delete,
   `lead_rate_limits` + `lead_rate_limit_consume()`, generalized post slugs, `consent_default`
6. `20260916120000_lookup_service_area.sql` — `site_settings.service_area`

Client-specific seed (not a migration): `supabase/seeds/initial-site-settings.sql`.

## Database schema

| Table | Purpose | Access (RLS) |
| --- | --- | --- |
| `site_settings` | Business details, branding, social, default SEO, site URL, indexing, LocalBusiness toggle, consent default, tracking IDs, service area | Public read; admin update |
| `page_seo` | Per-route SEO (meta, canonical, OG, robots) for `/`, `/projects`, `/contact`, `/blog` | Public read; admin write |
| `posts` | Blog posts (Tiptap JSON content, SEO fields, draft/published) | Public read of published + live; admin all |
| `redirects` | 301/302 redirects (active flag) | Public read of active; admin all |
| `leads` | Lead submissions with UTMs/click IDs, status, `is_test`, notification state | Admin read, status update, delete; inserts via service role only |
| `lead_rate_limits` | Hashed per-client submission events | Service role only |
| `admin_users` | Allow-list of Supabase Auth users who are admins | Read own row |

Functions: `is_admin()`, `lead_rate_limit_consume(bucket, limit, window)` (service role only).
Storage: bucket `media` (public read, admin write). Auth: email + password, public sign-up disabled.

## Environment variables

| Variable | Production | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Required | Read at build time (also feeds the CSP) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Required | Build time |
| `SUPABASE_SERVICE_ROLE_KEY` | Required (Sensitive) | Lead insert, rate limit, notification state |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Required (real key) | Build time; set together with the secret |
| `TURNSTILE_SECRET_KEY` | Required (Sensitive, real key) | Widget hostname: `shlomi-electric-site.vercel.app` |
| `LOOKUP_SITE_URL` | Set (`https://shlomi-electric-site.vercel.app`) | Canonicals, sitemap, robots, OG, schema |
| `LEAD_RATE_LIMIT_SALT` | Set (Sensitive) | Falls back to the service role key if absent |
| `LEAD_WEBHOOK_URL`, `LEAD_WEBHOOK_SECRET` | Not set yet | Without them leads are stored with notification `skipped` |
| `NEXT_PUBLIC_ADMIN_HOST`, `LOOKUP_GTM_DEBUG`, `LOOKUP_SITE_ENV`, `E2E_TEST_TOKEN`, `LOOKUP_BUILD_ID` | Must not be set | See `docs/vercel-preview.md` |

Preview keeps Cloudflare's Turnstile test keys and its own test webhook (Preview scope only).

## Optional integrations

| Integration | Status | How it plugs in |
| --- | --- | --- |
| Lead notifications (Make) | Pending | Signed webhook `LEAD_WEBHOOK_URL` → Make → email to שלומי (Shlomi_boaron@walla.co.il) |
| Cloudflare Turnstile | Active (real keys) | Lead forms; server verification |
| Google Tag Manager | Off | `gtm_id` in Admin; loads only on Production. Admin host isolation required first |
| Admin host isolation | Not configured | `NEXT_PUBLIC_ADMIN_HOST` once an admin subdomain exists |
| Custom domain | Not configured | Vercel domain + `LOOKUP_SITE_URL` + Turnstile hostname |

## Feature inventory (all verified end to end on the real Vercel Preview; Production smoke-tested)

- **Admin** (`/admin`): email/password login, HttpOnly `/admin`-scoped 12 h session, mobile navigation, sign-out,
  admin-shell 404.
- **Site settings**: business details, service area, logo, favicon, social links (Organization `sameAs`), default SEO,
  default share image, site URL, indexing, LocalBusiness, consent default, tracking IDs with honest status labels.
- **Page SEO** for the core pages and the blog index, with default-SEO fallbacks and sitemap exclusion for noindex.
- **Blog**: Tiptap editor (headings, lists, quotes, links, images incl. inside quotes/lists), drafts, admin preview,
  publish/unpublish, SEO fields, BlogPosting + breadcrumb schema, sitemap.
- **Leads**: validated server action, honeypot, Turnstile, per-client rate limiting, attribution (UTMs, click IDs,
  landing page), `generate_lead` with `event_id` and no PII, Preview/E2E leads marked `is_test`, signed webhook with
  retries and recorded delivery state, admin list/search/filters/detail/status/CSV/resend/delete with confirmation.
- **Redirects**: 301/302, activate/deactivate (effective within 60 s), loop and core-page protection.
- **Media**: signed uploads to Supabase Storage, admin previews, admin-driven favicon (`/favicon.ico` redirect) and
  generated default OG image (`/og-default.png` from the admin logo).
- **SEO/crawler output**: dynamic `sitemap.xml` and `robots.txt`, canonical/OG/Twitter metadata, Organization,
  WebSite, FAQPage (visible answers only), optional LocalBusiness, branded 404s, no review/rating schema.
- **Security**: public and admin CSP, frame protections, `no-store` admin, no secrets in client bundles (CI scan),
  RLS checks (`npm run check:supabase`).
- **Tracking foundation**: Consent Mode v2 default, dataLayer contract (`docs/gtm-container-contract.md`), GTM only when
  configured and only in Production.
- **Quality gates**: lint, typecheck, 54 unit/migration tests (PGlite), generated DB types check, build, secret scan in
  CI; manual Playwright lead-flow E2E.

## Intentional Shlomi-specific content (to be separated during extraction)

| Where | What |
| --- | --- |
| `src/site.config.ts` | Site name/service-area fallbacks, Hebrew locale/RTL, Israeli phone rules, `Electrician` + `GeneralContractor`, core routes, lead messages, brand colours, FAQ schema flag |
| `src/lib/site.ts` | Lead-form project types; **demo** reviews and projects (mandatory pre-launch replacement) |
| `src/app/(site)/page.tsx`, `projects/page.tsx`, `contact/page.tsx` | Page copy, services, stats/claims, process steps, FAQs |
| `src/components/*` (Header, Footer, Reviews, Stats, CtaSection, LeadForm, ProjectCard, …) | Figma-based design and copy (footer tagline, legal links pointing to `#`) |
| `public/images/*` | Logo and **demo/stock** photos (mandatory pre-launch replacement) |
| `src/lookup/admin/i18n.ts` | Hebrew admin UI dictionary |
| `supabase/seeds/initial-site-settings.sql`, `README.md`, `docs/launch-content-checklist.md` | Client data and launch checklist |

Reusable infrastructure lives under `src/lookup/`, `src/proxy.ts`, `src/app/admin/`, the metadata routes
(`sitemap.ts`, `robots.ts`, `favicon.ico/`, `og-default.png/`), `supabase/`, `scripts/` and `.github/workflows/`.

## Data state after cleanup (2026-09-16)

| Table / storage | Rows | Contents |
| --- | --- | --- |
| `site_settings` | 1 | Confirmed Shlomi details; indexing off, GTM/tracking empty, site URL empty |
| `admin_users` / Auth users | 1 / 1 | `info@lookup.ltd` |
| `leads`, `posts`, `redirects`, `page_seo`, `lead_rate_limits` | 0 | All legacy test data removed |
| Storage `media` | 2 objects | Favicon and default share image (both referenced by settings) |

## Remaining Shlomi launch blockers

Real reviews, projects and photos; Privacy Policy and Terms; final domain; Production Make webhook; final public-launch
smoke test and indexing enablement (`docs/launch-content-checklist.md`).
