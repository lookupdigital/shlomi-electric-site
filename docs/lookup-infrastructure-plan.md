# Lookup Website Infrastructure — Audit & Implementation Plan

Pilot repository: `lookupdigital/shlomi-electric-site` · Live: https://shlomi-electric-site.vercel.app
Audit date: 2026-09-15 · Audited commit: `228acad` (main) · Status: **Milestone 0 — audit + plan, no code changed**

> Rule for everything below: the existing public site (visuals, copy, routes, responsive behaviour) is preserved.
> Next.js in this repo is **16.3.5**. Per `AGENTS.md`, the version-matched docs in `node_modules/next/dist/docs/` are the reference, not older Next.js knowledge.

---

## A. Current architecture summary

| Area | Finding |
| --- | --- |
| Framework | Next.js **16.3.5**, Turbopack (default in 16) for dev and build |
| Router | **App Router only** (`src/app`). No `pages/` directory |
| React | **19.2.8** |
| TypeScript | 5.9.3, `strict: true`, `moduleResolution: bundler`, alias `@/* → src/*`. Uses the generated global `LayoutProps` type, so standalone `tsc` passes only after `next build` or `next typegen` |
| Styling | Tailwind **4.3.3** via `@tailwindcss/postcss`. Design tokens are in `@theme inline` in `src/app/globals.css` (navy/ink/brand/…), plus component classes `.container-x .h1 .h2 .subheading .body-text .field .consent` |
| Fonts | `next/font/google`: Heebo (headings) and Assistant (body), Hebrew and Latin subsets, self-hosted at build. Replacements for the paid Figma fonts |
| Lint | ESLint 9 flat config: `eslint-config-next` core-web-vitals + typescript |
| Scripts | `dev`, `build`, `start`, `lint`. **No `typecheck`, no tests** |
| Dependencies | Runtime: `next`, `react`, `react-dom` only. Nothing else |
| Deployment | Vercel, auto-deploy from GitHub `main`. No `vercel.json`, repo not linked locally (no `.vercel/`), `next.config.ts` empty |
| Baseline health | `eslint` exit 0 · `next build` green · `tsc --noEmit` exit 0 (after build) |

### Routes (all static, `○` prerendered)

| Route | File | Notes |
| --- | --- | --- |
| `/` | `src/app/page.tsx` | Hero + LeadForm, stats, problem/solution, services, why-us, process, projects, reviews, FAQ, CTA form |
| `/projects` | `src/app/projects/page.tsx` | Collage, project grid (3 projects rendered twice), stats, reviews, CTA form |
| `/contact` | `src/app/contact/page.tsx` | Hero, stats, CTA form (email + consent), FAQ |
| 404 | Next default `/_not-found` | Returns a real **HTTP 404** (verified live) but shows the unstyled English default page |

### Layout and component boundaries

- `src/app/layout.tsx` (Server) renders `<html lang="he" dir="rtl">`, the fonts, `<Header/>`, `<main>`, `<Footer/>`, and a title template (`%s | שלומי שירותי חשמל וקבלנות`).
- **Client components (4):** `Header` (mobile menu, `usePathname`), `Faq` (accordion), `Reviews` (carousel), `LeadForm` (form state).
- **Server components:** `Button`, `CtaSection`, `Footer`, `ProjectCard`, `Stats`, all pages.
- `src/lib/site.ts` holds all business data: name, phone, WhatsApp, email, address, nav links, project types, reviews, projects.

### What does not exist at all

No API routes or route handlers, no Server Actions, no `proxy.ts`/`middleware.ts`, no database, no Supabase, no auth, **no environment variables** (`process.env` is not referenced, no `.env*` files), no analytics or pixels (verified on the live HTML), no sitemap or robots (both 404 live), no JSON-LD, no redirects, no validation library, no tests, no custom security headers (only the HSTS header Vercel adds by default).

---

## B. What already exists (and is worth keeping)

1. **Correct document language and direction:** `lang="he" dir="rtl"` on `<html>`.
2. **Title template** in the root layout, plus per-page titles for `/projects` and `/contact`.
3. **Fully static rendering.** Every page is prerendered, which gives excellent TTFB and CDN caching. New infrastructure must preserve this.
4. **`next/image` everywhere** with `sizes` and `priority` on hero images, so large PNG sources are optimised at the edge. **`next/font`** is self-hosted, so fonts cause no layout shift.
5. **Mostly server components.** Only 4 small client islands.
6. **Semantic HTML:** a single `<h1>` per page, a sensible h2/h3 hierarchy, `<article>`, `<figure>/<blockquote>`, `<nav aria-label>`, `aria-expanded`/`aria-controls` on interactive widgets.
7. **One reusable `LeadForm` component** used by all forms. Only one integration point needs to change.
8. **Real 404 status** for unmatched routes.

---

## C. What is missing (mapped to modules)

| Module | Status |
| --- | --- |
| 1 Site settings | Hard-coded in `src/lib/site.ts`. No social, SEO or tracking fields |
| 2 Admin | Missing |
| 3 Page SEO | Titles only. No per-page description, canonical, OG or robots |
| 4 Global metadata | Missing: `metadataBase`, canonical, Open Graph, Twitter, `og:locale he_IL`, robots |
| 5 Sitemap | Missing (404) |
| 6 Robots | Missing (404). No preview-deployment protection in code |
| 7 JSON-LD | Missing |
| 8 AEO foundation | Semantic base is good, but **FAQ answers are missing from the HTML** (see D-SEO-1). No breadcrumbs, no entity data |
| 9 Analytics | Missing |
| 10 Lead forms | **Fake submit: data is discarded** (`preventDefault` then a success screen) |
| 11 Leads DB | Missing |
| 12 Attribution | Missing |
| 13 Conversions | Missing |
| 14 Ad-platform readiness | Missing |
| 15–17 Blog | Missing |
| 18 Media | Static `/public` only. No upload |
| 19 Redirects | Missing |
| 20 404 | Status is correct. The page is unbranded and in English |
| 21 Security | Nothing to secure yet. Everything must be designed in |
| 22 Migrations | No structure |
| 23 Env | No `.env.example`. **`.gitignore` ignores `.env*`, which would also ignore `.env.example`** |
| 24 Performance | Good baseline (static). Needs a budget for new scripts |
| 25 Consent | No consent banner or state |

---

## D. Problems and risks found

### D1. Business and conversion risks (highest priority)

- **D-LEAD-1 — Leads are lost.** `LeadForm.handleSubmit` calls `setSent(true)` and sends nothing (commented as a demo). The site is close to launch, so every submission today is a lost customer.
- **D-LEAD-2 — False-positive conversion trap.** The success screen appears without any server confirmation. If a GTM "form submit" or "element visibility" trigger were added now, it would report conversions for leads that do not exist. The M7 design fixes this: conversions fire only after the server confirms.
- **D-LEAD-3 — Nobody is notified.** Even once stored, leads need a delivery channel (email, WhatsApp, CRM, or Make webhook). This is undecided (see J).
- **D-LEAD-4 — No spam or duplicate protection.** Once a public submission endpoint exists it will be abused without a honeypot, timing check, idempotency and rate limiting.

### D2. Content flagged (Module 26: flagged, **not** rewritten)

| # | Location | Issue |
| --- | --- | --- |
| C1 | `src/lib/site.ts` | Phone `03-555-1234`, WhatsApp `972500000000`, address `רחוב הברזל 30, תל אביב` are **placeholders** (per the code comment). They are live and indexable |
| C2 | `src/lib/site.ts` | Email `info@nidbach.co.il` belongs to **another brand ("נדבך")**, a Figma template leftover |
| C3 | `src/lib/site.ts` reviews | 5 **identical fake reviews**. The quote names "נדבך" (another company). The name "דוד אלדן" vs the role "קבוצת אולדן" is inconsistent. **Must never be marked up as Review/AggregateRating schema** |
| C4 | Home FAQ | Q1 "האם אתם עובדים בכל הארץ?" has an answer about permits (mismatch). Q1 and Q2 have identical answers. The others are marked temporary |
| C5 | Contact FAQ | All answers are marked "temporary, awaiting client approval" |
| C6 | `/projects` | The 3 demo projects (transliterated English names) are rendered **twice** (duplicate cards). Collage alts (villa with pool, kitchen) look like stock imagery unrelated to commercial office work |
| C7 | Stats | "+2,000 לקוחות מרוצים", "+27 שנות ניסיון" and licence claims need client confirmation before launch |
| C8 | Footer | "תנאי שימוש" and "מדיניות פרטיות" link to `#`. The contact consent checkbox refers to a privacy policy **that does not exist**. A privacy policy is needed before storing PII |
| C9 | Naming | `site.name` "שלומי שירותי חשמל וקבלנות" vs footer "שלומי שירותי חשמל ועבודות בנייה וקבלנות". The legal and brand names need confirming |
| C10 | `src/app/favicon.ico` | 25,931 bytes, the same size as the create-next-app default icon. Likely not the client's favicon (verify visually) |
| C11 | README | Already notes the substitute fonts and placeholder data. Consistent with the above |

### D3. SEO risks

- **D-SEO-1 — FAQ answers are not in the server HTML.** `Faq.tsx` renders answers only when `isOpen`. Verified live: `/contact` renders **0 of 6** answers and `/` renders **2 of 6**. The text exists only inside the serialized RSC payload, not in the DOM. Crawlers and AI crawlers that don't run JS cannot see it, and FAQPage schema would describe content that isn't on the page. **Fix (no visual change):** always render the answer element and toggle visibility with the `hidden` attribute (`hidden="until-found"` keeps it findable in-page).
- **D-SEO-2 — No canonical and no `metadataBase`.** `*.vercel.app` and the future custom domain would be duplicates.
- **D-SEO-3 — One meta description on all pages.** It is inherited from the root layout.
- **D-SEO-4 — No Open Graph.** Poor WhatsApp and Facebook share previews, which matter for this market.
- **D-SEO-5 — No sitemap or robots.**
- **D-SEO-6 — Placeholder content is currently indexable** (C1–C6). Search engines may cache fake phone numbers and reviews before launch.
- **D-SEO-7 — Preview deployments.** No code-level guard. Vercel adds `X-Robots-Tag: noindex` to preview URLs by default; we will verify this on a real preview URL and add our own guard anyway.
- **D-SEO-8 — Unbranded English 404** on a Hebrew site. The status code itself is correct.
- **D-SEO-9 — Duplicate project cards** on `/projects` (C6).

### D4. Tracking risks

- No tracking exists, so **gclid/fbclid/UTMs from paid traffic are lost today**.
- `tel:`, `wa.me` and `mailto:` clicks (a primary conversion path for a contractor) are untracked.
- Future risks the design must prevent: **duplicate page_views** (GTM History Change plus GA4 auto page_view plus an app page_view), **duplicate GTM containers**, **PII in dataLayer** (form fields), and conversions before server confirmation (D-LEAD-2).
- No consent state: tags that need consent cannot respect it yet.

### D5. Security risks (for what we are about to add)

- **Public lead endpoint.** Server Actions are public POST endpoints. They need input validation, abuse controls and constrained return values. Next provides CSRF origin checks and a 1 MB body limit, but no application-level checks.
- **PII at rest.** Leads contain name, phone, email and message. This needs RLS with no public read, a service key only on the server, a retention policy, and a privacy policy (C8). Israeli privacy law applies; legal wording and retention periods should be confirmed by the client or counsel, not decided by code.
- **Stored XSS.** Blog rich text, JSON-LD built from admin-editable values, and SVG uploads.
- **Redirect manager.** Loops and open-redirect misuse.
- **Admin clickjacking.** No `X-Frame-Options`/`frame-ancestors`.
- **Secret leakage.** The service/secret key must never be `NEXT_PUBLIC_*`. There is no env validation today.
- **`.gitignore`.** `.env*` blocks committing `.env.example`. Add `!.env.example`. The same pattern also keeps real env files out of git, which is correct.

### D6. Technical debt relevant to this project

- `src/lib/site.ts` mixes brand config, content and nav. It will be split into client-specific defaults and a reusable settings reader.
- The root layout renders the public Header/Footer, so `/admin` would inherit the public chrome. This needs a route group (see E).
- No `typecheck` script. `tsc` depends on generated types (`next typegen`).
- No test runner. Attribution parsing, the PII guard, redirect validation and metadata fallbacks are pure logic that should be unit-tested.
- The uncommitted `package-lock.json` diff (name `app` → `shlomi-electric-site`) predates this audit. It is harmless and was left untouched.

---

## E. Recommended architecture for this repository

### E1. Principles

1. **Keep pages static.** Public data (settings, page SEO, published posts, redirects) is read with the Supabase publishable key inside tagged caches. Admin saves trigger on-demand revalidation (`updateTag` for read-your-writes, or `revalidateTag(tag, 'max')`; the tag argument pair is required in Next 16). Public pages must not become per-request dynamic.
2. **Don't enable `cacheComponents` in v1.** It changes the rendering model and 404 status semantics for streamed routes. Revisit after launch.
3. **Server-first.** SEO, schema, settings and blog rendering all happen in Server Components. New client JS on public pages is limited to a tiny analytics/attribution island.
4. **Fail safe.** If Supabase is unreachable or env vars are missing (for example in a fresh clone), the site renders from code defaults and the build does not fail. Leads fail loudly with a user-visible error, never silently.
5. **Separate reusable infrastructure from client code** so it can be extracted into `lookup-web-starter` by copying one directory.

### E2. Directory layout (adapted to the existing `src/` + `@/*` convention)

```
src/
  app/
    layout.tsx               root: <html lang dir>, fonts, globals — visuals unchanged
    not-found.tsx            NEW branded 404 (existing Header/Footer + tokens)
    robots.ts  sitemap.ts    NEW
    (site)/                  MOVED public site — URLs unchanged (route group)
      layout.tsx             Header/Footer, <Analytics/>, site-wide JSON-LD
      page.tsx  projects/  contact/
      blog/page.tsx  blog/[slug]/page.tsx     NEW (M8)
    admin/                   NEW — thin route files that import from src/lookup/admin
      login/page.tsx
      (protected)/layout.tsx  → requireAdmin() server-side
      (protected)/page.tsx settings/ seo/ posts/ leads/ redirects/
  proxy.ts                   NEW (Next 16 name for middleware; Node runtime):
                             admin session refresh · DB redirects · preview noindex header
  config/                    CLIENT-SPECIFIC
    site.defaults.ts         today's src/lib/site.ts values (fallbacks + seed source)
    routes.ts                registry of public static routes (sitemap + SEO admin)
  components/                CLIENT-SPECIFIC UI — existing components, unchanged visually
  lib/site.ts                kept as a re-export shim during migration (no import breakage)
  lookup/                    REUSABLE INFRASTRUCTURE  → future lookup-web-starter
    env.ts                   zod-validated env; server vs public split
    supabase/                server.ts (cookie session, server-only) · public.ts (publishable, cacheable)
                             service.ts (secret key, server-only, leads only) · browser.ts
    auth/                    requireAdmin() / getAdmin() — data access layer
    settings/                schema · getSiteSettings() (cached, tag "site-settings") · actions
    seo/                     buildMetadata() fallback chain · canonical resolver · getPageSeo()
    schema/                  organization · website · localBusiness · service · breadcrumbs ·
                             blogPosting · faqPage · <JsonLd/> (escapes "<")
    analytics/               events.ts (typed union) · track.ts (dataLayer + PII guard) ·
                             consent.ts · <GtmScript/> · <AnalyticsListener/>
    attribution/             capture · storage · types
    forms/                   lead.schema.ts · submitLead (Server Action) · useLeadSubmission
    cms/                     posts queries/actions · editor (client, admin-only) · renderer (server)
    media/                   signed upload · media queries
    redirects/               validation (loops, formats) · map loader
    admin/                   admin shell/UI primitives (Tailwind, RTL)
supabase/
  migrations/                timestamped SQL (tables, indexes, constraints, RLS, storage policies)
  seed.sql                   non-PII seed (settings row from site.defaults)
  tests/                     migration + RLS gate (PGlite) — no Docker needed
docs/
  lookup-infrastructure-plan.md   this file
  gtm-container-contract.md       (M4) dataLayer events + required GTM setup
  operations.md                   (M10) env matrix, migrations, admin onboarding, runbook
```

**Why a route group?** `/admin` must not render the public Header/Footer or load marketing tags. Moving pages into `app/(site)/` changes **no URLs**; the build route table before and after is diffed to prove it. This is the only structural refactor, and it is required by Module 2.

### E3. Key data flows

**Settings / SEO (read)**
`Server Component → getSiteSettings()/getPageSeo(path) → unstable_cache(tag) → Supabase (publishable key, RLS select) → merge over config/site.defaults.ts`
**(write)** `Admin form → Server Action → requireAdmin() → zod → Supabase with the admin's session (RLS enforces is_admin()) → updateTag() → pages regenerate`

**Metadata fallback chain** (`buildMetadata`)
`page_seo.meta_title → page's own code title → settings.default_meta_title → settings.site_name`
The same pattern applies to description, OG title/description (falling back to meta values) and OG image (page → default_og_image). Canonical is `canonical_url` or `settings.canonical_domain + path`. Robots is `page.robots_*` AND the global `indexing_enabled` AND production-only.

**Lead submission**
```
LeadForm (client, same markup)
  → submitLead(FormData + attribution + submission_id + form_name)   [Server Action]
  → zod validation · honeypot · min-fill-time · normalise phone
  → insert into leads (secret key, server-only; unique submission_id = idempotent)
  → after(): optional signed webhook (CRM/Make) — never blocks the response
  → return { ok: true, leadType } | { ok: false, fieldErrors | formError }
  → client: success UI  →  track('generate_lead', { form_name, page_path, lead_type })
```
Conversion events fire **only** on `ok: true`. The payload has no name, phone, email or message.

**Analytics**
`app → track(event, params) → PII guard → window.dataLayer → GTM → GA4 / Google Ads / Meta / TikTok / LinkedIn`
- GTM loads once from `(site)/layout` via `next/script`. A guard prevents a second container. It does not load on `/admin` or preview (unless `debug`).
- Consent Mode v2 defaults are pushed **before** GTM loads. `setConsent()` is the hook for a future CMP.
- Page views: one `page_view` push per pathname change, via a client listener. The GTM contract requires the GA4 tag to disable automatic page views, so views are never double-counted.
- Click events come from **one delegated listener**: `tel:` → `phone_click`, `wa.me`/`api.whatsapp.com` → `whatsapp_click`, `mailto:` → `email_click`, `[data-track-cta]` → `cta_click`. Existing server components stay server components; at most a `data-` attribute is added.
- Pixel IDs from settings are pushed as a non-PII `lookup_config` dataLayer event, so GTM tags can read them as variables. Changing an ID in admin needs no code or GTM republish.

**Attribution**
On landing, read `utm_*`, `gclid`, `gbraid`, `wbraid`, `fbclid` and `ttclid`, plus `landing_page` and `referrer`. Keep **first touch** (first-party storage, 90 days) and **last non-direct touch** (session). Both are sent with the form. Columns hold the last touch and `first_touch jsonb` holds the first. No IDs or PII are generated beyond what arrives in the URL.

**Redirects (tradeoff decided)**
| Option | Pros | Cons |
| --- | --- | --- |
| `next.config` `redirects()` built from DB + Vercel deploy hook | Zero runtime cost | **Only 307/308** (spec requires 301/302), needs a redeploy for each change, 1,024 limit |
| **`proxy.ts` + in-memory map with short TTL (chosen)** | Exact 301/302, live within ~60 s, no redeploy | Small overhead on page requests. Mitigated by a matcher that excludes assets, `_next`, `api` and `admin`, one DB read per instance per TTL window, fail-open if the DB is unreachable |

Validation on save: paths start with `/`, source ≠ destination, no chains or loops (graph walk across active rules), destination is a relative path or an absolute `https` URL, status is 301 or 302. Admin-only writes.

**Robots / indexing**
`indexable = VERCEL_ENV === 'production' && settings.indexing_enabled && host === canonical host`
When not indexable: `robots.txt` → `Disallow: /`, plus `<meta name="robots" content="noindex">` and an `X-Robots-Tag: noindex` header. Production always disallows `/admin` and `/api`. The production `*.vercel.app` alias should redirect to the custom domain (a Vercel domain setting), with canonical tags as the backstop.

**Blog content safety**
Content is stored as **Tiptap JSON** (`jsonb`), not HTML. It is rendered on the server with `@tiptap/static-renderer` into React elements, restricted to the allowed nodes: paragraph, h2, h3, bold, italic, bullet/ordered list, link, image, blockquote. Links use a protocol allowlist (`https`, `http`, `mailto`, `tel`). Images must come from our media bucket. With no stored HTML and no `dangerouslySetInnerHTML`, no DOMPurify/jsdom is needed on the server.

**Admin auth**
Supabase Auth (email + password, **public sign-ups disabled**, admins invited). An `admin_users` allowlist and `is_admin()` SQL function back every RLS write policy. `(protected)/layout.tsx` verifies the user server-side (`getClaims()`/`getUser()`, never trusting `getSession()` on the server), and **every Server Action re-checks** with `requireAdmin()`. `proxy.ts` only refreshes cookies and does optimistic redirects; it is not the security boundary.

**Supabase keys**
- Publishable key: public reads, all governed by RLS.
- User session: admin writes, RLS-enforced.
- Secret key: used **only** in `lookup/supabase/service.ts` for the anonymous lead insert. `import 'server-only'` enforces this at build time.

### E4. Supabase topology (recommended defaults)

- **One Supabase project per client site.** PII stays isolated per client, RLS stays simple, and extraction is clean. The agency owns the org.
- **Region** close to the Vercel function region. Suggested: Supabase `eu-central-1` with Vercel functions in `fra1` (confirm latency for Israeli traffic).
- **Production must not be on a plan that pauses inactive projects.** Supabase's free tier pauses idle projects; a paused DB means failed lead submissions. Check current plan terms before launch.
- Preview deployments use the same project in v1. Leads carry an `environment` column (`production`/`preview`/`development`) and the Leads admin filters to production by default. A separate staging project is optional later.

---

## F. Milestone implementation plan

**Every milestone ends with a gate:** `npm run lint` · `npm run typecheck` (`next typegen && tsc --noEmit`) · `npm test` (from M1) · `npm run build`. Also: diff the route table against the previous build, then review the security, SEO and performance impact, list the files, migrations and env vars, and give manual verification steps.

**Workflow guardrails:** each milestone is committed on a feature branch. No push or PR, no migration applied to a real Supabase database, no Vercel env changes and no real webhook/email sends without explicit approval. Migrations are shown before they are applied.

| M | Scope | Key deliverables | Verification |
| --- | --- | --- | --- |
| **0** | Audit + plan | This document | Review |
| **1** | SEO foundation (no DB yet) | `lookup/env.ts` (`NEXT_PUBLIC_SITE_URL` with Vercel system-URL fallback) · `getSiteSettings()` returning code defaults (same interface the DB version will use) · `buildMetadata()` with `metadataBase`, canonical, OG, Twitter, `og:locale he_IL`, robots · per-page metadata for `/`, `/projects`, `/contact` (existing titles kept; unique descriptions **proposed for approval, not invented**) · `app/robots.ts` with production/preview logic · `app/sitemap.ts` from `config/routes.ts` · `lookup/schema/*` + `<JsonLd/>`: Organization + WebSite now; LocalBusiness (`GeneralContractor`/`Electrician`) **only once real NAP data is confirmed**; FAQPage only after answers are approved (C4/C5) · **FAQ answers rendered in the DOM** (D-SEO-1, no visual change) · branded Hebrew `not-found.tsx` · `.env.example` + `!.env.example` in `.gitignore` · `typecheck`/`test` scripts + Vitest · capture a performance baseline (build JS sizes + Lighthouse on production) | `curl` head tags per page · `/robots.txt` `/sitemap.xml` on prod and on a preview URL · Rich Results Test / Schema validator · 404 status for a random URL · screenshots show no visual diff |
| **2** | Supabase foundation | Dependencies · Supabase clients (server/public/service/browser) · migration `foundation` (admin_users, `is_admin()`, `set_updated_at`) · `proxy.ts` (session refresh, preview `X-Robots-Tag`) · move public pages to `app/(site)/` · `/admin/login` + protected layout + empty dashboard shell with nav · PGlite migration/RLS test gate | Route table unchanged · logged-out `/admin/*` redirects to login · Server Action without a session is rejected · RLS tests pass |
| **3** | Site settings admin | Migration `site_settings` (singleton, format CHECKs on tracking IDs) · settings form (business, social, global SEO, tracking, `indexing_enabled`, consent default) · `getSiteSettings()` switches to DB with code fallback · Header/Footer read settings (Header gets props from the server layout, no client fetching) · seed from `site.defaults` | Edit the phone in admin → header/footer/JSON-LD update without a deploy · pages remain `○`/ISR in build output |
| **3b** | Page SEO admin | Migration `page_seo` · `/admin/seo` lists `config/routes.ts` + blog · per-path form · wired into `buildMetadata()` | Change the meta title in admin → `<title>` updates · noindex → excluded from sitemap and meta robots set |
| **4** | Analytics layer | `track()` + typed events + PII guard (unit-tested) · `<GtmScript/>` (single container, consent defaults first, not on admin/preview) · `<AnalyticsListener/>` (page_view on navigation, delegated tel/WhatsApp/email/cta clicks) · `docs/gtm-container-contract.md` | GTM Preview/Tag Assistant: exactly 1 container, 1 page_view per navigation, click events fire, no PII in dataLayer |
| **5** | Attribution | Capture/persist first and last touch · unit tests (params, precedence, expiry) | Land with `?utm_source=test&gclid=x`, browse, inspect storage |
| **6** | Lead pipeline + DB | Migration `leads` (RLS on, **no public policies**) · `submitLead` Server Action · `LeadForm` wired: same markup and classes, plus pending state (disabled + "שולח…"), inline error styled with existing tokens, idempotent `submission_id`, honeypot, min-fill-time · `form_name` per instance (`home_hero`, `home_cta`, `projects_cta`, `contact`) · attribution columns · optional signed webhook via `after()` · `/admin/leads` list + detail (filter by env/form/source) | Submit on a preview deployment → row with attribution appears in admin · double-click creates one row · publishable-key REST read of `leads` is denied · network failure shows an error, not success |
| **7** | Conversion events | `generate_lead` pushed only after `ok: true`, with `{form_name, page_path, lead_type}` · `form_start` (first interaction) · `form_submit_error` (error category only) | GTM Preview: event only on real success · forced server failure → no conversion |
| **8** | Blog CMS | Migrations `media` (bucket + storage policies: images only, no SVG, size cap) and `posts` · `/admin/posts` list/editor (Tiptap, admin-only bundle) · signed direct uploads with alt text · `/blog`, `/blog/[slug]` built with the existing design language (tokens, `.container-x`, `.h1/.h2`), visible breadcrumbs + author/published/updated · `generateStaticParams` + `notFound()` for drafts/missing · BlogPosting + BreadcrumbList JSON-LD · sitemap includes published posts with real `updated_at` · `revalidateTag`/`updateTag` on publish · `next.config` `images.remotePatterns` for the storage host | Draft URL returns 404 · publish → listed, in sitemap, valid schema · bundle check confirms Tiptap is absent from public chunks |
| **9** | Redirect manager | Migration `redirects` · `/admin/redirects` with validation (loop/chain detection, formats) · `proxy.ts` lookup with TTL map, fail-open | `curl -I` shows exact 301/302 + Location · a loop is rejected on save · DB outage → site still serves |
| **10** | Security / performance / readiness | Security headers (`X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options`/`frame-ancestors` — strict on `/admin`; CSP report-only, because GTM injects arbitrary scripts) · RLS review · secret-key usage audit (grep + build check) · abuse controls review (Vercel Firewall/BotID rate rule for the lead action) · Lighthouse vs M1 baseline · consent readiness note · `docs/operations.md` (env matrix, applying migrations, inviting admins, rollback) · launch checklist incl. C1–C10 content items | Checklist signed off |

**Launch fast-track (if go-live comes before M10):** the minimum safe set is M1 + M2 + M5 + M6 (leads persisted with attribution) + M7, plus real content (C1–C9) and a privacy policy. M3/M4 can temporarily read the GTM ID from an env var.

---

## G. Files and directories expected to change

**Modified (existing):**
- `src/app/layout.tsx` — metadata via `buildMetadata`; Header/Footer move to `(site)/layout`; visuals unchanged
- `src/app/page.tsx`, `projects/page.tsx`, `contact/page.tsx` — **moved** to `src/app/(site)/…`; add `generateMetadata`/JSON-LD; content untouched
- `src/components/Faq.tsx` — always render answers (`hidden` toggle)
- `src/components/LeadForm.tsx` — server submission, pending/error states, `form_name`, attribution; same markup and classes
- `src/components/CtaSection.tsx` — pass `formName` through
- `src/components/Header.tsx`, `Footer.tsx` — take settings via props or server reads instead of the static import
- `src/lib/site.ts` — becomes a shim re-exporting `config/site.defaults.ts`
- `next.config.ts` — `images.remotePatterns` (M8), `headers()` (M10)
- `package.json` — scripts (`typecheck`, `test`, `db:*`) + dependencies
- `.gitignore` — `!.env.example`
- `README.md` — pointer to docs and the env setup

**New:** `src/app/not-found.tsx`, `src/app/robots.ts`, `src/app/sitemap.ts`, `src/app/(site)/layout.tsx`, `src/app/(site)/blog/**`, `src/app/admin/**`, `src/proxy.ts`, `src/config/{site.defaults,routes}.ts`, `src/lookup/**`, `supabase/{migrations,tests}/**`, `supabase/seed.sql`, `.env.example`, `vitest.config.ts`, `docs/{gtm-container-contract,operations}.md`.

---

## H. Database migrations expected

All migrations live under `supabase/migrations/<timestamp>_<name>.sql`. They are additive and non-destructive, contain no data deletion, and are gated by the PGlite test suite before any real apply.

| # | Migration | Contents | RLS |
| --- | --- | --- | --- |
| 1 | `foundation` | `set_updated_at()` trigger fn · `admin_users(user_id → auth.users, role owner/editor, created_at)` · `is_admin()` (`security definer`, `stable`, pinned `search_path`) | admin_users: user can read own row; writes via SQL/owner only |
| 2 | `site_settings` | Singleton (`id smallint pk default 1 check (id = 1)`) · business, social, global SEO, tracking (CHECKs: `^GTM-[A-Z0-9]+$`, `^G-[A-Z0-9]+$`, numeric pixel/partner IDs) · `indexing_enabled` · `consent_default` · `updated_at`/`updated_by`. **No secrets in this table** | anon select · admin update |
| 3 | `page_seo` | `path unique check (path ~ '^/')` · meta/OG fields · `robots_index`/`robots_follow` · timestamps | anon select · admin all |
| 4 | `leads` | Required fields (id, created_at, name, phone, email, message, form_name, landing_page, referrer, utm_*×5, gclid, gbraid, wbraid, fbclid, ttclid) + **justified extras:** `project_type` (existing form field), `consent_given`/`consent_at` (contact form checkbox), `first_touch jsonb` (M5), `submission_id uuid unique` (idempotency), `environment` (preview isolation), `status` new/handled (admin triage) · length CHECKs · indexes `(created_at desc)`, `(environment, created_at desc)`, `(form_name)` | **RLS on, no anon/public policies**; admin select/update; inserts only via server secret key. Retention to be defined (C8) |
| 5 | `media` | `media(id, path, alt, width, height, mime, size, created_at)` · storage bucket `media` (public read, mime allowlist jpeg/png/webp/avif, size cap) | anon select · admin write · `storage.objects` policies admin-only insert/update/delete |
| 6 | `posts` | Fields per Module 15 + SEO fields · `slug unique check (slug ~ '^[a-z0-9֐-׿-]+$')` (Hebrew slugs allowed — decide in M8) · `status check in ('draft','published')` · `check (status = 'draft' or published_at is not null)` · `content jsonb` · indexes `(status, published_at desc)` | anon select **only** `status='published' and published_at <= now()` · admin all |
| 7 | `redirects` | `source_path` unique among active · `destination_path` · `status_code check in (301,302)` · `active` · `check (source_path <> destination_path)` | anon select active · admin all |

**How migrations are applied** (documented fully in M10, each apply needs approval): `npx supabase link --project-ref <ref>` → `npx supabase db push` (dry-run output reviewed first) → `npx supabase gen types typescript` into `src/lookup/supabase/types.ts`. There is no Docker locally, so `supabase start` is unavailable; the PGlite gate (with a stubbed `auth` schema) covers migration order, constraints and RLS behaviour.

---

## I. New dependencies (checked 2026-09-15 on npm)

| Package | Version | Milestone | Why | Alternative considered |
| --- | --- | --- | --- | --- |
| `zod` | 4.x | M1 | Env validation, Server Action input validation, settings and redirect schemas. De-facto standard | Hand-rolled validators (error-prone) |
| `server-only` | 0.0.1 | M1 | Build-time guarantee that secret-key and session modules never reach a client bundle (recommended by Next docs) | — |
| `vitest` (dev) | 5.x | M1 | Unit tests for the PII guard, attribution, redirect validation and metadata fallbacks. No test runner exists | Jest (heavier config for ESM/TS) |
| `@supabase/supabase-js` | 2.x | M2 | DB/Auth/Storage client | — |
| `@supabase/ssr` | 0.12.x | M2 | Cookie-based auth for App Router (server components, actions, proxy) | Deprecated auth-helpers |
| `supabase` CLI (dev) | 2.x | M2 | Migrations, type generation, pinned per repo | Global install (unpinned) |
| `@electric-sql/pglite` (dev) | 0.5.x | M2 | In-process Postgres to test migrations and RLS without Docker | Docker `supabase start` (not available) |
| `@tiptap/react`, `@tiptap/pm`, `@tiptap/starter-kit` | 3.x | M8 | Maintained editor. StarterKit v3 already includes paragraphs, H2/H3, bold, italic, lists, blockquote **and Link** | Lexical, Editor.js, custom (rejected) |
| `@tiptap/extension-image` | 3.x | M8 | Images in content | — |
| `@tiptap/static-renderer` | 3.x | M8 | Server rendering of stored JSON into React elements. No HTML strings, so no sanitizer or jsdom needed | `isomorphic-dompurify` (jsdom in serverless functions), `sanitize-html` |

**Deliberately not added:**
- `@next/third-parties`: marked experimental, and consent defaults must run before GTM. A roughly 30-line `next/script` component is simpler to control.
- `next-sitemap`: the native `sitemap.ts` is enough.
- Form libraries (react-hook-form): one form with native constraints plus server zod is enough.
- UI kits: Tailwind tokens already exist.
- DOMPurify/jsdom.
- Analytics SDKs or vendor pixels in code: GTM is the single integration layer.

---

## J. Questions and blockers

**Blocking (cannot be inferred from the repo):**
1. **Supabase project (blocks M2).** Nothing exists. Can the agency create a dedicated project for this client (recommended), on a paid plan for production, in `eu-central-1`? I can't create accounts or enter keys; the URL and keys must be added to Vercel and `.env.local` by you.
2. **Indexing before launch (affects M1).** The live site is indexable today with placeholder phone and email and fake reviews (C1–C3). Should M1 ship with `indexing_enabled = false` until the real content lands? (Recommended.)

**Non-blocking (sensible defaults planned, confirm when convenient):**
3. **Production domain.** Canonical URLs use `NEXT_PUBLIC_SITE_URL` and fall back to the Vercel production URL until the domain is known.
4. **Lead notification channel.** Default plan: optional signed webhook (e.g. Make → WhatsApp/email/Monday). Alternatives: direct email or none in v1.
5. **Consent.** Default plan: Consent Mode v2 with a configurable default and no banner in v1. Does the client need a banner (EU traffic, legal advice)?
6. **Real business data and legal pages** (C1–C9): phone, WhatsApp, email, address, legal name, real reviews/projects, approved FAQ answers, and a privacy policy. Required before LocalBusiness/FAQPage schema and before collecting PII in production.
7. **Blog design.** There is no Figma for blog pages. Plan: build `/blog` and `/blog/[slug]` from the existing tokens and components.
