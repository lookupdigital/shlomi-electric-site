# New client setup

The normal path touches only **environment variables**, **`src/site.config.ts`**, **Admin settings** and the
**frontend** (`src/app/(site)`, `src/components`, `globals.css`, `public/`). If a step seems to need a change in
`src/lookup`, `src/app/admin` or `supabase/migrations`, stop: that is a Starter change (`upgrade-strategy.md`).

Record client-specific decisions in `docs/client-notes.md` as you go.

## 1. Repository
GitHub → `lookup-starter` → **Use this template → Create a new repository** (private), named after the client site.
Clone it, then:
```bash
npm ci
```

## 2. Supabase project
Create the project (region near the visitors) — `supabase-setup.md` §1–2.

## 3. Database
SQL Editor → paste `supabase/install/fresh-install.sql` → Run — `supabase-setup.md` §3.

## 4. Auth + first admin
Sign-up off, URL configuration, create the admin user, run `supabase/install/first-admin.sql` — §4–5.

## 5. Local environment
```bash
cp .env.example .env.local
```
Fill the 3 REQUIRED Supabase values. Verify:
```bash
npm run check:supabase
```
```bash
npm run dev
```
Open `http://localhost:3000` (setup banner expected) and sign in at `/admin/login`.

## 6. Site config
Edit `src/site.config.ts` (`architecture.md` → Site config reference). Typical changes: `schema.businessTypes`,
`leads.projectTypes`, `branding` OG colors, `phone` rules if the client is not in Israel, core pages.
Leave `identity.siteName` empty.

## 7. Admin settings
`/admin/settings`: site name, business name, contact details, service area, logo, favicon, default SEO title and
description. Keep **LocalBusiness off**, Consent Mode as is and GTM empty until launch; indexing stays off until
**Admin → Launch → Go live**. The Admin dashboard and Launch page show what is still missing.

## 8. Frontend
Replace the example pages and components with the client design. Keep:
- `src/site/adapter.ts` exports (`SiteChrome`, `BlogPostView`, `NotFoundView`);
- `LeadForm` field names, honeypot and submission flow (restyle freely);
- `generateMetadata` via `buildPageMetadata` on every page.
Only real, client-confirmed content: no invented reviews, numbers or claims. Replace `public/images/logo-placeholder.png`
or rely on the Admin logo.

## 9. Checks
```bash
npm run lint && npm run typecheck && npm test && npm run db:types:check && npm run db:install-sql:check && npm run build && npm run check:secrets
```

## 10. Vercel project + Preview
Import the repository, add env vars for Preview and Production, push a branch — `deployment.md`. Run the Preview
validation list there and delete the test data.

## 11. Integrations
Turnstile, webhook, domain, GTM, admin host as the client needs — `optional-integrations.md`.

## 12. Production launch
Merge → Production smoke test → Admin → Launch checklist until **Ready** → decisions the checklist cannot make
(legal pages, LocalBusiness, Consent Mode, GTM) → **Go live** — `deployment.md`.
