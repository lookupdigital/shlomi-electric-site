# Deployment (Vercel)

## Project
1. Vercel → **Add New → Project** → import the client repository. Framework: Next.js (defaults; no build overrides).
2. Environment variables: see `environment-variables.md`. Add the REQUIRED ones for **Preview** and **Production**
   before the first deploy (`NEXT_PUBLIC_*` are build-time).
3. **Settings → Deployment Protection**: keep Vercel Authentication on Preview.

## Preview validation (every release)
Push a branch → Vercel builds a Preview. On the Preview URL:
1. Home, `/contact`, `/blog` render; setup banner visible only while the identity is empty.
2. `/admin/login` → sign in → dashboard shows no schema/sign-up errors.
3. Admin → Site settings: save identity, phone, logo, favicon → public header/footer and `/favicon.ico` update.
4. Submit a lead → success; Admin → Leads (tick "include test leads") shows it with `is_test`; notification skipped
   unless a test webhook is configured.
5. Page SEO: change the home title → `<title>` updates. `robots.txt` disallows all and pages send
   `X-Robots-Tag: noindex` (Preview is never indexable).
6. Blog: create, preview, publish, schedule (a few minutes ahead) → without saving again, the post URL, `/blog` and
   `sitemap.xml` show it within about a minute of the scheduled time; unknown slug returns 404; delete the post →
   404 and gone from `/blog` and the sitemap.
7. Media: upload an image in a post and as the logo; it renders from Supabase Storage. Replace the logo → the old file
   disappears from Admin → Media; an image still in use cannot be deleted there.
8. Redirects: add `/old → /blog` (301) → works; loop detection rejects `/a → /a`.
9. Delete the test data afterwards (Admin or `delete from public.leads where is_test;`).

## Production
1. Merge to the production branch → Vercel Production deploy.
2. Smoke test: pages, admin sign-in, one real lead (`is_test = false`), webhook received if configured, then delete
   that lead.
3. Launch (Admin → Launch), only when the client content is final:
   - work through the automatic checklist until every **Required** item passes (status **Ready**); Recommended items
     are strongly advised, Optional integrations never block;
   - decide with the client what the checklist cannot check: LocalBusiness only with verified details, Consent Mode
     default (denied requires a consent banner/CMP to measure), GTM after testing the container on Preview
     (`LOOKUP_GTM_DEBUG=1`), privacy/terms pages linked in the footer, example copy replaced;
   - **Go live** last (switches indexing on; refused while a required check fails or outside Production), then submit
     `sitemap.xml` in Search Console. **Take offline** switches indexing off again.
4. Admin → System & integrations: every row healthy or intentionally unused; send a test webhook if one is configured.

## Rollback
Vercel → Deployments → previous Production deployment → **Promote**. Migrations are additive, so a code rollback
does not need a database rollback.
