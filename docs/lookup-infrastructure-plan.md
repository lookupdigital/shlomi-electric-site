# Lookup Website Infrastructure — Audit & Implementation Plan

Pilot repository: `lookupdigital/shlomi-electric-site` · Live: https://shlomi-electric-site.vercel.app
Audit date: 2026-09-15 · Audited commit: `228acad` (main)
Status: **Milestone 0 — audit + plan, no application code changed** · Revision 2: target the existing Supabase project `shlomiboaron`

> Rule for everything below: the existing public site (visuals, copy, routes, responsive behaviour) is preserved.
> Next.js in this repo is **16.3.5**. Per `AGENTS.md`, the version-matched docs in `node_modules/next/dist/docs/` are the reference, not older Next.js knowledge.

### Revision log

| Rev | Date | Change |
| --- | --- | --- |
| 1 | 2026-09-15 | Initial audit and plan |
| 3 | 2026-09-15 | **MVP built in one pass (operator decision):** one Supabase project for dev + preview + production (no staging); indexing disabled everywhere until explicitly enabled; categories kept as a text column (no categories table — no category pages in scope); no media table (alt text stored with the image usage); redirects run in `proxy.ts` for all non-core paths (core pages `/`, `/projects`, `/contact` excluded to keep them proxy-free); lead notifications, consent banner and rate limiting deferred. Setup steps: `docs/supabase-setup.md`; content blockers: `docs/launch-content-checklist.md` |
| 2 | 2026-09-15 | **Correction: a dedicated Supabase project already exists** (`shlomiboaron`, region `ap-northeast-1`). The rev-1 statement "no Supabase project exists" only meant the repository is not connected to Supabase. Plan now targets the existing project (no new project, no region change); env var names fixed; mandatory read-only schema inspection before any migration; M2 credential handoff checklist; region-latency implications; repo re-inspection results |

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
| Backend | **Supabase project `shlomiboaron` exists (region `ap-northeast-1`) but the repository is not connected to it** — see §E4 |
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

### What is not present in the repository

No API routes or route handlers, no Server Actions, no `proxy.ts`/`middleware.ts`, **no Supabase client code, configuration or credentials** (the project itself exists — §E4), no auth, **no environment variables** (`process.env` is not referenced, no `.env*` files), no analytics or pixels (verified on the live HTML), no sitemap or robots (both 404 live), no JSON-LD, no redirects, no validation library, no tests, no custom security headers (only the HSTS header Vercel adds by default).

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
9. **A dedicated Supabase project** (`shlomiboaron`) is already provisioned for this site.

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
| 11 Leads DB | Missing in code. The Supabase project exists, but its current schema is **not yet inspected** (§E4.4) |
| 12 Attribution | Missing |
| 13 Conversions | Missing |
| 14 Ad-platform readiness | Missing |
| 15–17 Blog | Missing |
| 18 Media | Static `/public` only. No upload |
| 19 Redirects | Missing |
| 20 404 | Status is correct. The page is unbranded and in English |
| 21 Security | Nothing to secure yet. Everything must be designed in |
| 22 Migrations | No migration structure in the repo. Remote migration history of `shlomiboaron` unknown until inspection |
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
- **PII at rest.** Leads contain name, phone, email and message. This needs RLS with no public read, `SUPABASE_SERVICE_ROLE_KEY` only on the server, a retention policy, and a privacy policy (C8). Israeli privacy law applies; legal wording and retention periods should be confirmed by the client or counsel, not decided by code.
- **Service role key.** It bypasses RLS entirely. A leak into a client bundle, a `NEXT_PUBLIC_*` variable, logs or git would expose every lead. Guards are in §E4.3.
- **Unknown existing state in `shlomiboaron`.** It may already contain tables, policies, buckets, auth users or migration history. Blindly applying migrations could collide with or weaken it. Mitigated by the mandatory read-only inspection (§E4.4).
- **Stored XSS.** Blog rich text, JSON-LD built from admin-editable values, and SVG uploads.
- **Redirect manager.** Loops and open-redirect misuse.
- **Admin clickjacking.** No `X-Frame-Options`/`frame-ancestors`.
- **Secret leakage.** No env validation today.
- **`.gitignore`.** `.env*` blocks committing `.env.example`. Add `!.env.example`. The same pattern also keeps `.env.local` out of git, which is correct.

### D6. Technical debt relevant to this project

- `src/lib/site.ts` mixes brand config, content and nav. It will be split into client-specific defaults and a reusable settings reader.
- The root layout renders the public Header/Footer, so `/admin` would inherit the public chrome. This needs a route group (see E).
- No `typecheck` script. `tsc` depends on generated types (`next typegen`).
- No test runner. Attribution parsing, the PII guard, redirect validation and metadata fallbacks are pure logic that should be unit-tested.
- The uncommitted `package-lock.json` diff (name `app` → `shlomi-electric-site`) predates this audit. It is harmless and was left untouched.

---

## E. Recommended architecture for this repository

### E1. Principles

1. **Keep pages static.** Public data (settings, page SEO, published posts, redirects) is read with the anon key inside tagged caches. Admin saves trigger on-demand revalidation (`updateTag` for read-your-writes, or `revalidateTag(tag, 'max')`; the tag argument pair is required in Next 16). Public pages must not become per-request dynamic.
2. **Don't enable `cacheComponents` in v1.** It changes the rendering model and 404 status semantics for streamed routes. Revisit after launch.
3. **Server-first.** SEO, schema, settings and blog rendering all happen in Server Components. New client JS on public pages is limited to a tiny analytics/attribution island.
4. **Fail safe.** If Supabase is unreachable or env vars are missing (for example in a fresh clone), the site renders from code defaults and the build does not fail. Leads fail loudly with a user-visible error, never silently.
5. **Separate reusable infrastructure from client code** so it can be extracted into `lookup-web-starter` by copying one directory.
6. **The existing Supabase project is the only backend.** No new project, no region change, no destructive change to existing objects without explicit approval.

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
  proxy.ts                   NEW (Next 16 name for middleware; Node runtime)
                             M2: matcher /admin only (Supabase session refresh)
                             M9: DB redirects — scope decided by latency measurement (§E4.5)
  config/                    CLIENT-SPECIFIC
    site.defaults.ts         today's src/lib/site.ts values (fallbacks + seed source)
    routes.ts                registry of public static routes (sitemap + SEO admin)
  components/                CLIENT-SPECIFIC UI — existing components, unchanged visually
  lib/site.ts                kept as a re-export shim during migration (no import breakage)
  lookup/                    REUSABLE INFRASTRUCTURE  → future lookup-web-starter
    env.ts                   zod-validated env; public vs server-only split
    supabase/
      browser.ts             anon key — client components (admin editor/uploads only)
      server.ts              anon key + request cookies (admin session), server-only
      public.ts              anon key, no cookies — cacheable public reads
      service.ts             SUPABASE_SERVICE_ROLE_KEY — server-only, lead insert only
      types.ts               generated from the live schema (supabase gen types)
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
  config.toml                CLI project config (from `supabase init`; contains no secrets)
  migrations/                timestamped SQL — written only AFTER the schema inspection (§E4.4)
  seed.sql                   non-PII seed (settings row from site.defaults)
  tests/                     migration + RLS gate (PGlite) — no Docker needed
docs/
  lookup-infrastructure-plan.md   this file
  supabase-inspection-<date>.md   (M2) read-only report of the existing project (no data, no secrets)
  gtm-container-contract.md       (M4) dataLayer events + required GTM setup
  operations.md                   (M10) env matrix, migrations, admin onboarding, runbook
```

**Why a route group?** `/admin` must not render the public Header/Footer or load marketing tags. Moving pages into `app/(site)/` changes **no URLs**; the build route table before and after is diffed to prove it. This is the only structural refactor, and it is required by Module 2.

### E3. Key data flows

**Settings / SEO (read)**
`Server Component → getSiteSettings()/getPageSeo(path) → unstable_cache(tag) → Supabase public client (anon key, RLS select) → merge over config/site.defaults.ts`
**(write)** `Admin form → Server Action → requireAdmin() → zod → Supabase server client with the admin's session (RLS enforces is_admin()) → updateTag() → pages regenerate`

**Metadata fallback chain** (`buildMetadata`)
`page_seo.meta_title → page's own code title → settings.default_meta_title → settings.site_name`
The same pattern applies to description, OG title/description (falling back to meta values) and OG image (page → default_og_image). Canonical is `canonical_url` or `settings.canonical_domain + path`. Robots is `page.robots_*` AND the global `indexing_enabled` AND production-only.

**Lead submission**
```
LeadForm (client, same markup)
  → submitLead(FormData + attribution + submission_id + form_name)   [Server Action]
  → zod validation · honeypot · min-fill-time · normalise phone
  → insert into leads via service.ts (SUPABASE_SERVICE_ROLE_KEY, server-only;
    unique submission_id = idempotent)
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

**Redirects (tradeoff — final choice confirmed in M9 by measurement, see §E4.5)**
| Option | Pros | Cons |
| --- | --- | --- |
| `next.config` `redirects()` built from DB + Vercel deploy hook | Zero runtime cost, served at the CDN edge | **Only 307/308** (spec requires 301/302), needs a redeploy for each change, 1,024 limit |
| **`proxy.ts` + in-memory map with short TTL (preferred)** | Exact 301/302, live within ~60 s, no redeploy | Proxy runs on every matched page request. With the DB in `ap-northeast-1`, the proxy's region and cold starts could add latency for Israeli visitors — must be measured before enabling on public routes. Mitigations: matcher excludes assets/`_next`/`api`/`admin`, one DB read per instance per TTL window, fail-open if the DB is unreachable |

Validation on save: paths start with `/`, source ≠ destination, no chains or loops (graph walk across active rules), destination is a relative path or an absolute `https` URL, status is 301 or 302. Admin-only writes.

**Robots / indexing**
`indexable = VERCEL_ENV === 'production' && settings.indexing_enabled && host === canonical host`
When not indexable: `robots.txt` → `Disallow: /`, plus `<meta name="robots" content="noindex">`. On non-production builds, `next.config.ts` `headers()` also sends `X-Robots-Tag: noindex`; `VERCEL_ENV` is available at build time, so this needs no proxy. Production always disallows `/admin` and `/api`. The production `*.vercel.app` alias should redirect to the custom domain (a Vercel domain setting), with canonical tags as the backstop.

**Blog content safety**
Content is stored as **Tiptap JSON** (`jsonb`), not HTML. It is rendered on the server with `@tiptap/static-renderer` into React elements, restricted to the allowed nodes: paragraph, h2, h3, bold, italic, bullet/ordered list, link, image, blockquote. Links use a protocol allowlist (`https`, `http`, `mailto`, `tel`). Images must come from our media bucket. With no stored HTML and no `dangerouslySetInnerHTML`, no DOMPurify/jsdom is needed on the server.

**Admin auth**
Supabase Auth on the existing project (email + password, **public sign-ups disabled**, admins invited). An `admin_users` allowlist and `is_admin()` SQL function back every RLS write policy; if the project already has an equivalent, the inspection decides whether to reuse it. `(protected)/layout.tsx` verifies the user server-side (`getClaims()`/`getUser()`, never trusting `getSession()` on the server), and **every Server Action re-checks** with `requireAdmin()`. `proxy.ts` only refreshes cookies and does optimistic redirects; it is not the security boundary.

### E4. Supabase backend — existing project `shlomiboaron`

#### E4.1 Facts and constraints

| Item | Value |
| --- | --- |
| Project name | `shlomiboaron` (dedicated to this website) |
| Region | `ap-northeast-1` (Tokyo) — **must not be changed** |
| Status in repo | Not connected: no client code, no config, no env vars |
| Rules | Do **not** create a new or replacement project · do **not** change the region · do **not** invent or hardcode credentials · **inspect the live schema before any table or migration is written or applied** |
| Pending confirmation | The project's plan tier: a project that pauses when idle would make the lead form fail in production |

For future Lookup client sites (the starter convention): one dedicated Supabase project per client site. This site already follows it.

#### E4.2 Repository re-inspection for existing Supabase traces (2026-09-15, rev 2)

| Checked | Result |
| --- | --- |
| Working tree incl. hidden and git-ignored files (excluding `node_modules`, `.next`) — patterns: `supabase`, `.supabase.co`, `sb_publishable_`, `sb_secret_`, JWT prefix `eyJhbGciOi`, `postgres://`, `DATABASE_URL`, `anon key`, `service role`, `shlomiboaron` | **None** |
| `supabase/` directory, `config.toml`, `.env*` (incl. old/backup env files), `vercel.json`, generated DB types | **None** |
| `node_modules/@supabase` | Not installed |
| Git history: all 4 commits on all refs, stash, reflog, every file ever committed | **None** (only this plan document mentions Supabase) |
| Live production HTML (`/`, `/projects`, `/contact`) + all 11 referenced JS chunks (613 KB) | **No** Supabase URL, key or `NEXT_PUBLIC_*` value |
| **Not inspectable from the repository** | Vercel project environment variables (if the Supabase ↔ Vercel integration was installed, variables such as `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` or `POSTGRES_*` may already exist there) · the project's schema, RLS policies, auth users/settings, storage buckets and migration history |

#### E4.3 Environment variable contract (fixed names)

| Variable | Visibility | Used by | Local | Vercel |
| --- | --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Public (inlined into the browser bundle at build) | All Supabase clients | `.env.local` | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public; safe only because RLS governs every table | `public.ts`, `server.ts`, `browser.ts` | `.env.local` | Production, Preview, Development |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server-only secret — bypasses RLS** | **Only** `src/lookup/supabase/service.ts` | `.env.local` | Production, Preview — marked **Sensitive** |

Key format note: if the dashboard shows only the newer key format (`sb_publishable_…` / `sb_secret_…`) instead of the legacy `anon` / `service_role` JWTs, put the publishable key in `NEXT_PUBLIC_SUPABASE_ANON_KEY` and the secret key in `SUPABASE_SERVICE_ROLE_KEY`. The variable names stay as specified.

Service role key guards:
1. `service.ts` starts with `import 'server-only'`, so importing it from a client component fails the build.
2. `src/lookup/env.ts` reads `SUPABASE_SERVICE_ROLE_KEY` only in server-only code and throws if any variable name starting with `NEXT_PUBLIC_` contains `SERVICE`, `SECRET` or `ROLE`.
3. `service.ts` is used only by the lead insert. Admin reads and writes use the logged-in user's session so RLS still applies.
4. After every build from M2 onward, a `check:secrets` script greps `.next/static` for the service-role value (when set) and for the `service_role` JWT claim, and fails on a match.
5. The key is never logged, never returned from a Server Action, and never committed. `.env.example` contains **names only, no values**.

#### E4.4 Mandatory read-only schema inspection (M2 step 0 — before any table or migration)

Nothing is created, altered or dropped during inspection. Output goes to `docs/supabase-inspection-<date>.md` (structure only: no row data, no PII, no secrets) and must be approved before migrations are finalised.

| What | How (no Docker needed) |
| --- | --- |
| Tables, views, columns and RPCs exposed through the API | `GET $NEXT_PUBLIC_SUPABASE_URL/rest/v1/` (OpenAPI description) with the service role key, from a local script that prints structure only |
| Storage buckets and their settings | `GET /storage/v1/bucket` (service role key) |
| Auth: whether users exist | Count only via the admin users endpoint. No emails are read or written into the report |
| Full catalog: every schema's tables, columns, constraints, indexes, **RLS enabled flags and policies** (`pg_policies`), triggers, functions, extensions, `storage.objects` policies, **migration history** (`supabase_migrations.schema_migrations`) | A read-only SQL catalog query (provided at M2) run in the Supabase Dashboard SQL Editor, results pasted back. Alternatively `npx supabase link` + `npx supabase migration list` / `inspect` when CLI credentials are provided. Note: `supabase db dump`/`db pull` need Docker, which is not available locally |
| Auth settings | Dashboard check: providers, "allow new sign-ups", Site URL, redirect URLs |

Decision rules after inspection:
- Planned names (`admin_users`, `is_admin`, `site_settings`, `page_seo`, `leads`, `media`, `posts`, `redirects`, bucket `media`) that **already exist** → adapt to or extend the existing object, or rename ours. Never drop or replace without explicit approval.
- **Existing migration history present** → reconcile first (baseline migration matching the remote state) so `db push` does not replay or conflict.
- **Tables in `public` with RLS disabled** → reported as a security finding; any fix needs approval.
- Migrations deliberately **do not use `create … if not exists`** to skip over unknown objects, so an unexpected collision fails loudly instead of silently diverging.
- Apply path, only with approval: `supabase db push --dry-run` output reviewed → `supabase db push` → `supabase gen types typescript` → `src/lookup/supabase/types.ts`.

#### E4.5 Region implications (`ap-northeast-1`, not changed)

- **Public pages are unaffected.** They are static or ISR files served from Vercel's CDN. Supabase is contacted only on ISR regeneration after an admin save.
- **DB-touching requests:** lead submission (Server Action), admin pages and actions, blog ISR regeneration, and (if enabled) the proxy's redirect-map refresh.
- **Function region.** Vercel functions default to US East (`iad1`), so each DB query from a function crosses the Pacific. Option A: set the Vercel function region to Tokyo (`hnd1`) so function↔DB queries are local; the one user→function round trip from Israel is longer, but admin pages with several queries get faster overall. Option B: keep the default. **Recommendation: A, decided on measured timings in M2** (a Vercel project setting — changed only with approval; it does not touch the Supabase region).
- **Proxy.** Before `proxy.ts` handles public routes (M9 redirects), measure TTFB for Israeli visitors with and without it. If it adds material latency, keep the proxy on `/admin` only and use build-time redirects (307/308) with a deploy hook, documenting that the 301/302 requirement then maps to 308/307 (search engines treat these equivalently).

#### E4.6 M2 credential handoff checklist (to be presented again when M2 starts)

**Copy from the Supabase Dashboard (project `shlomiboaron`):**

| # | Value | Where in the dashboard | Goes into |
| --- | --- | --- | --- |
| 1 | Project URL (`https://<ref>.supabase.co`) | Project Settings → Data API / API → Project URL | `NEXT_PUBLIC_SUPABASE_URL` |
| 2 | `anon` `public` key (or publishable key) | Project Settings → API Keys | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| 3 | `service_role` key (or secret key) — click Reveal | Project Settings → API Keys | `SUPABASE_SERVICE_ROLE_KEY` |
| 4 | Project Reference ID | Project Settings → General | CLI `supabase link` only — not an app env var |
| 5 | *(Only for CLI inspection/migrations)* database password **or** a personal access token | Project Settings → Database / Account → Access Tokens | Typed into the CLI prompt locally — never stored in the repo, `.env.local` or Vercel. **Do not reset the DB password** without checking what else uses it |

**Add locally:** create `.env.local` in the repository root (already git-ignored by `.env*`) with exactly these three lines, then restart `npm run dev`:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

**Add in Vercel:** Project `shlomi-electric-site` → Settings → Environment Variables.
1. **First check for existing Supabase variables** (e.g. from the Supabase integration) to avoid duplicates or conflicting names.
2. `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Production, Preview, Development.
3. `SUPABASE_SERVICE_ROLE_KEY`: Production and Preview, marked **Sensitive**. **Never** create a `NEXT_PUBLIC_` copy.
4. Redeploy: `NEXT_PUBLIC_*` values are inlined at build time, so existing deployments don't pick them up.

**Check in the Supabase Dashboard (nothing to copy):** Authentication → Sign In / Providers: email enabled, **new sign-ups disabled**. URL Configuration: Site URL = production URL; Redirect URLs include `http://localhost:3000/**` and the production URL (the preview pattern is decided in M2).

Keys never need to be pasted into chat, commits or issues.

#### E4.7 Preview and production data

Preview deployments use the same `shlomiboaron` project in v1. Leads carry an `environment` column (`production`/`preview`/`development`) and the Leads admin filters to production by default. Admin setting edits made from a preview deployment affect production content; this is documented in `operations.md`.

---

## F. Milestone implementation plan

**Every milestone ends with a gate:** `npm run lint` · `npm run typecheck` (`next typegen && tsc --noEmit`) · `npm test` (from M1) · `npm run build` · `npm run check:secrets` (from M2). Also: diff the route table against the previous build, then review the security, SEO and performance impact, list the files, migrations and env vars, and give manual verification steps.

**Workflow guardrails:** each milestone is committed on a feature branch. No push or PR, no migration applied to `shlomiboaron`, no Vercel env or region changes, and no real webhook/email sends without explicit approval. Migrations are shown before they are applied. **No Supabase project creation and no region change, ever.**

| M | Scope | Key deliverables | Verification |
| --- | --- | --- | --- |
| **0** | Audit + plan | This document (rev 2) | Review |
| **1** | SEO foundation (no DB yet) | `lookup/env.ts` (`NEXT_PUBLIC_SITE_URL` with Vercel system-URL fallback; declares the three Supabase names as optional until M2) · `.env.example` with **names only** (incl. the three Supabase variables) + `!.env.example` in `.gitignore` · `getSiteSettings()` returning code defaults (same interface the DB version will use) · `buildMetadata()` with `metadataBase`, canonical, OG, Twitter, `og:locale he_IL`, robots · per-page metadata for `/`, `/projects`, `/contact` (existing titles kept; unique descriptions **proposed for approval, not invented**) · `app/robots.ts` + non-production `X-Robots-Tag` via `next.config` `headers()` · `app/sitemap.ts` from `config/routes.ts` · `lookup/schema/*` + `<JsonLd/>`: Organization + WebSite now; LocalBusiness (`GeneralContractor`/`Electrician`) **only once real NAP data is confirmed**; FAQPage only after answers are approved (C4/C5) · **FAQ answers rendered in the DOM** (D-SEO-1, no visual change) · branded Hebrew `not-found.tsx` · `typecheck`/`test` scripts + Vitest · capture a performance baseline (build JS sizes + Lighthouse on production) | `curl` head tags per page · `/robots.txt` `/sitemap.xml` on prod and on a preview URL · Rich Results Test / Schema validator · 404 status for a random URL · screenshots show no visual diff |
| **2** | Supabase foundation on `shlomiboaron` | **Step 0 (gate):** present the §E4.6 handoff checklist → you add env vars → connectivity check (read-only) → §E4.4 inspection report → **approval**. **Then:** dependencies · clients `browser/server/public/service` with the fixed env names · `server-only` + `check:secrets` · migration `foundation` (admin_users, `is_admin()`, `set_updated_at`) reconciled against the inspection · `proxy.ts` (matcher `/admin` only, session refresh) · move public pages to `app/(site)/` · `/admin/login` + protected layout + empty dashboard shell with nav · PGlite migration/RLS test gate · measure function↔DB latency for the region decision (§E4.5) | Route table unchanged · logged-out `/admin/*` redirects to login · Server Action without a session is rejected · RLS tests pass · service role key absent from `.next/static` · migration dry-run reviewed before apply |
| **3** | Site settings admin | Migration `site_settings` (singleton, format CHECKs on tracking IDs) · settings form (business, social, global SEO, tracking, `indexing_enabled`, consent default) · `getSiteSettings()` switches to DB with code fallback · Header/Footer read settings (Header gets props from the server layout, no client fetching) · seed from `site.defaults` | Edit the phone in admin → header/footer/JSON-LD update without a deploy · pages remain `○`/ISR in build output |
| **3b** | Page SEO admin | Migration `page_seo` · `/admin/seo` lists `config/routes.ts` + blog · per-path form · wired into `buildMetadata()` | Change the meta title in admin → `<title>` updates · noindex → excluded from sitemap and meta robots set |
| **4** | Analytics layer | `track()` + typed events + PII guard (unit-tested) · `<GtmScript/>` (single container, consent defaults first, not on admin/preview) · `<AnalyticsListener/>` (page_view on navigation, delegated tel/WhatsApp/email/cta clicks) · `docs/gtm-container-contract.md` | GTM Preview/Tag Assistant: exactly 1 container, 1 page_view per navigation, click events fire, no PII in dataLayer |
| **5** | Attribution | Capture/persist first and last touch · unit tests (params, precedence, expiry) | Land with `?utm_source=test&gclid=x`, browse, inspect storage |
| **6** | Lead pipeline + DB | Migration `leads` (RLS on, **no public policies**) · `submitLead` Server Action (insert via `service.ts` only) · `LeadForm` wired: same markup and classes, plus pending state (disabled + "שולח…"), inline error styled with existing tokens, idempotent `submission_id`, honeypot, min-fill-time · `form_name` per instance (`home_hero`, `home_cta`, `projects_cta`, `contact`) · attribution columns · optional signed webhook via `after()` · `/admin/leads` list + detail (filter by env/form/source) | Submit on a preview deployment → row with attribution appears in admin · double-click creates one row · anon-key REST read of `leads` is denied · network failure shows an error, not success |
| **7** | Conversion events | `generate_lead` pushed only after `ok: true`, with `{form_name, page_path, lead_type}` · `form_start` (first interaction) · `form_submit_error` (error category only) | GTM Preview: event only on real success · forced server failure → no conversion |
| **8** | Blog CMS | Migrations `media` (bucket + storage policies: images only, no SVG, size cap) and `posts` · `/admin/posts` list/editor (Tiptap, admin-only bundle) · signed direct uploads with alt text · `/blog`, `/blog/[slug]` built with the existing design language (tokens, `.container-x`, `.h1/.h2`), visible breadcrumbs + author/published/updated · `generateStaticParams` + `notFound()` for drafts/missing · BlogPosting + BreadcrumbList JSON-LD · sitemap includes published posts with real `updated_at` · `revalidateTag`/`updateTag` on publish · `next.config` `images.remotePatterns` for the `shlomiboaron` storage host | Draft URL returns 404 · publish → listed, in sitemap, valid schema · bundle check confirms Tiptap is absent from public chunks |
| **9** | Redirect manager | Migration `redirects` · `/admin/redirects` with validation (loop/chain detection, formats) · runtime strategy chosen from the §E4.5 latency measurement (proxy TTL map, or build-time + deploy hook) | `curl -I` shows the expected status + Location · a loop is rejected on save · DB outage → site still serves · TTFB not regressed vs M1 baseline |
| **10** | Security / performance / readiness | Security headers (`X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options`/`frame-ancestors` — strict on `/admin`; CSP report-only, because GTM injects arbitrary scripts) · RLS review of the whole `shlomiboaron` schema · service role key usage audit · abuse controls review (Vercel Firewall/BotID rate rule for the lead action) · Lighthouse vs M1 baseline · consent readiness note · `docs/operations.md` (env matrix, applying migrations, inviting admins, rollback) · launch checklist incl. C1–C10 content items | Checklist signed off |

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
- `next.config.ts` — non-production `X-Robots-Tag` (M1), `images.remotePatterns` (M8), security headers (M10)
- `package.json` — scripts (`typecheck`, `test`, `check:secrets`, `db:*`) + dependencies
- `.gitignore` — `!.env.example`; `supabase/.temp` (CLI link state)
- `README.md` — pointer to docs and the env setup

**New:** `src/app/not-found.tsx`, `src/app/robots.ts`, `src/app/sitemap.ts`, `src/app/(site)/layout.tsx`, `src/app/(site)/blog/**`, `src/app/admin/**`, `src/proxy.ts`, `src/config/{site.defaults,routes}.ts`, `src/lookup/**`, `supabase/config.toml`, `supabase/{migrations,tests}/**`, `supabase/seed.sql`, `scripts/check-secrets.mjs`, `.env.example`, `vitest.config.ts`, `docs/{supabase-inspection-<date>,gtm-container-contract,operations}.md`.

---

## H. Database migrations expected

**Target: the existing project `shlomiboaron`.** Every migration below is a **draft** until the §E4.4 inspection report is approved; names, columns and policies are adjusted to what already exists. All migrations live under `supabase/migrations/<timestamp>_<name>.sql`. They are additive and non-destructive, contain no data deletion, and are gated by the PGlite test suite and a `db push --dry-run` review before any real apply.

| # | Migration | Contents | RLS |
| --- | --- | --- | --- |
| 0 | *(conditional)* `baseline` | Only if the project already has objects or migration history: represents the existing remote state so later migrations apply cleanly. No changes to existing objects | Unchanged |
| 1 | `foundation` | `set_updated_at()` trigger fn · `admin_users(user_id → auth.users, role owner/editor, created_at)` · `is_admin()` (`security definer`, `stable`, pinned `search_path`) | admin_users: user can read own row; writes via SQL/owner only |
| 2 | `site_settings` | Singleton (`id smallint pk default 1 check (id = 1)`) · business, social, global SEO, tracking (CHECKs: `^GTM-[A-Z0-9]+$`, `^G-[A-Z0-9]+$`, numeric pixel/partner IDs) · `indexing_enabled` · `consent_default` · `updated_at`/`updated_by`. **No secrets in this table** | anon select · admin update |
| 3 | `page_seo` | `path unique check (path ~ '^/')` · meta/OG fields · `robots_index`/`robots_follow` · timestamps | anon select · admin all |
| 4 | `leads` | Required fields (id, created_at, name, phone, email, message, form_name, landing_page, referrer, utm_*×5, gclid, gbraid, wbraid, fbclid, ttclid) + **justified extras:** `project_type` (existing form field), `consent_given`/`consent_at` (contact form checkbox), `first_touch jsonb` (M5), `submission_id uuid unique` (idempotency), `environment` (preview isolation), `status` new/handled (admin triage) · length CHECKs · indexes `(created_at desc)`, `(environment, created_at desc)`, `(form_name)` | **RLS on, no anon/public policies**; admin select/update; inserts only via the server-side service role client. Retention to be defined (C8) |
| 5 | `media` | `media(id, path, alt, width, height, mime, size, created_at)` · storage bucket `media` (public read, mime allowlist jpeg/png/webp/avif, size cap) | anon select · admin write · `storage.objects` policies admin-only insert/update/delete |
| 6 | `posts` | Fields per Module 15 + SEO fields · `slug unique check (slug ~ '^[a-z0-9֐-׿-]+$')` (Hebrew slugs allowed — decide in M8) · `status check in ('draft','published')` · `check (status = 'draft' or published_at is not null)` · `content jsonb` · indexes `(status, published_at desc)` | anon select **only** `status='published' and published_at <= now()` · admin all |
| 7 | `redirects` | `source_path` unique among active · `destination_path` · `status_code check in (301,302)` · `active` · `check (source_path <> destination_path)` | anon select active · admin all |

**How migrations are applied** (each apply needs approval; full runbook in `operations.md`): `npx supabase link --project-ref <ref>` (credentials entered at the CLI prompt, never stored) → `npx supabase migration list` (confirm the remote history matches) → `npx supabase db push --dry-run` (output reviewed) → `npx supabase db push` → `npx supabase gen types typescript` into `src/lookup/supabase/types.ts`. There is no Docker locally, so `supabase start`, `db dump` and `db pull` are unavailable; the PGlite gate (with a stubbed `auth` schema) covers migration order, constraints and RLS behaviour.

---

## I. New dependencies (checked 2026-09-15 on npm)

| Package | Version | Milestone | Why | Alternative considered |
| --- | --- | --- | --- | --- |
| `zod` | 4.x | M1 | Env validation, Server Action input validation, settings and redirect schemas. De-facto standard | Hand-rolled validators (error-prone) |
| `server-only` | 0.0.1 | M1 | Build-time guarantee that the service role and session modules never reach a client bundle (recommended by Next docs) | — |
| `vitest` (dev) | 5.x | M1 | Unit tests for the PII guard, attribution, redirect validation and metadata fallbacks. No test runner exists | Jest (heavier config for ESM/TS) |
| `@supabase/supabase-js` | 2.x | M2 | DB/Auth/Storage client for `shlomiboaron` | — |
| `@supabase/ssr` | 0.12.x | M2 | Cookie-based auth for App Router (server components, actions, proxy) | Deprecated auth-helpers |
| `supabase` CLI (dev) | 2.x | M2 | Link, migration history, migrations, type generation, pinned per repo | Global install (unpinned) |
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
- `pg` or other direct-DB drivers: the Supabase clients and CLI cover the needs.
- Analytics SDKs or vendor pixels in code: GTM is the single integration layer.

---

## J. Questions and blockers

**Resolved:**
- ~~Supabase project~~ → use the existing dedicated project `shlomiboaron` (`ap-northeast-1`). No new project, no region change (rev 2).

**Blocking:**
1. **Indexing before launch (affects M1).** The live site is indexable today with placeholder phone and email and fake reviews (C1–C3). Should M1 ship with `indexing_enabled = false` until the real content lands? (Recommended.)
2. **Supabase access (needed at M2 step 0, not before).** Env values per §E4.6 added locally and in Vercel by you. For the full schema inspection, either CLI credentials entered locally or running the provided read-only SQL in the Dashboard SQL Editor.

**Non-blocking (sensible defaults planned, confirm when convenient):**
3. **Production domain.** Canonical URLs use `NEXT_PUBLIC_SITE_URL` and fall back to the Vercel production URL until the domain is known.
4. **Lead notification channel.** Default plan: optional signed webhook (e.g. Make → WhatsApp/email/Monday). Alternatives: direct email or none in v1.
5. **Consent.** Default plan: Consent Mode v2 with a configurable default and no banner in v1. Does the client need a banner (EU traffic, legal advice)?
6. **Real business data and legal pages** (C1–C9): phone, WhatsApp, email, address, legal name, real reviews/projects, approved FAQ answers, and a privacy policy. Required before LocalBusiness/FAQPage schema and before collecting PII in production.
7. **Blog design.** There is no Figma for blog pages. Plan: build `/blog` and `/blog/[slug]` from the existing tokens and components.
8. **Vercel function region.** Recommend Tokyo (`hnd1`) to sit next to the database, decided on M2 measurements (§E4.5).
9. **`shlomiboaron` plan tier.** Confirm it doesn't pause when idle.
