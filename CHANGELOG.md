# Changelog

## 1.2.0 — Content Safety & SEO
**Migration 8** (additive); no new dependency, no environment variable.

Content safety
- Unsaved-changes protection: leaving an Admin edit form with unsaved changes (Posts, Site settings, Page SEO,
  Redirects) asks for confirmation (refresh / tab close and in-Admin links).
- Local recovery: the post editor keeps a local copy of unsaved edits in this browser (per admin and post) and offers
  to restore it after a refresh, crash or rejected save; stale copies are flagged, never auto-applied.
- Draft-only autosave: the database update requires `status = 'draft'` and the loaded version; status and publish
  date are never written, public caches are not invalidated and media cleanup does not run. Published and scheduled
  posts are never autosaved.
- Stale-save protection: a save is rejected when the post changed after the editor loaded it (two tabs / two admins);
  the local copy keeps the rejected edits.

Full per-page SEO
- One shared SEO resolution (`resolveSeo`) feeds live metadata, the Admin previews and the SEO states. Fallbacks are
  unchanged: OG title → SEO title, OG description → meta description, OG image → page image (post featured image) →
  default share image → generated image; canonical defaults to the page itself.
- Pages & SEO and the post editor are organized as Search / Social / Advanced (canonical, index, follow), with a live
  Google preview, a Social preview and factual SEO states (complete, missing title/description, too long, noindex,
  nofollow, canonical elsewhere) — no scores. The posts list shows the same states.
- Post SEO additions: OG title, OG description and follow/nofollow (**migration 8**; existing posts keep their
  behavior). Without migration 8 the site and Admin keep working, post saves that set a new field are refused with a
  clear message, and System health shows the database version as a warning.
- `sitemap.xml` leaves out pages and posts whose explicit canonical points to a different URL.
- `RouteEntry.nav?: boolean` — `nav: false` keeps a route registered (Pages & SEO, metadata, sitemap) but out of the
  site navigation. Public pages pass their registered route entry to `buildPageMetadata`.
- Pages & SEO "Reset to defaults" now refreshes the open form, previews and states immediately, so old values cannot
  be saved back.

Content image accessibility
- Alt text is editable after insertion (select the image) and an explicit **Decorative** toggle renders `alt=""`.
  Existing images are unchanged; an existing empty alt is never assumed decorative.
- Featured images show a notice while alt text is missing; posts with missing alt text are shown in the posts list
  (`/admin/posts?alt=missing`) and as one Recommended launch checklist item (never blocking).

Upgrading from 1.1.x: apply `supabase/migrations/20260918090000_lookup_post_social_seo.sql` (see
`docs/supabase-setup.md`).

## 1.1.1 — Actionable Admin UX
Admin UX only; no migration, no new dependency, no environment variable.
- Launch checklist, System health and Dashboard "Requires attention" items get one contextual action that links to
  where the item is fixed (e.g. "העלאת לוגו", "הגדרת SEO", "הגדרת כתובת", "מעבר ל-SEO", "תיקון", "הגדרה").
- New anchors: Site settings sections (`#settings-business`, `#settings-seo`, `#settings-tracking`) and each integration
  card (`/admin/system#integration-<id>`). Integration cards explain what to fix, or how to enable an optional one.
- Setup actions for optional integrations are shown quietly and never imply they are required for launch.

## 1.1.0 — Agency Workflow
Admin only; no migration, no new dependency, no environment variable.
- Dashboard redesigned as the operational overview: site status, requires attention (actionable items only), launch
  readiness, system health, integrations, leads (today / 7 days / month in the site time zone), content (published /
  scheduled / drafts) and quick actions.
- Admin → Launch: automatic launch checklist (Required / Recommended / Optional), derived site status
  (Development / Ready / Live) and a guarded **Go live** / **Take offline**.
- Admin → System & integrations: health of Supabase, database, storage, admin auth, lead storage, site URL, webhook,
  Turnstile, GTM, indexing, sitemap and robots; integration guidance; **Send test webhook** (`lead.test`, nothing stored).
- **Behavior change:** indexing is no longer a checkbox in Site settings; it is switched in Admin → Launch.
- Lead webhook delivery moved into a shared signed-POST helper (`postSignedWebhook`); payload and retries unchanged.
- Docs: release tags are `vX.Y.Z` (was documented as `starter-vX.Y.Z`).

## 1.0.0 — initial Starter release
Extracted from the audited Lookup reference implementation (production-validated infrastructure), with all client
data removed.

Behavior relative to the reference implementation:
- Consent Mode default for new installs is `denied` (migration 7; configured sites keep their saved value). The
  application fallback when the setting cannot be read is also `denied`.
- No site-name fallback in code: empty identity produces no site-name metadata or Organization/WebSite JSON-LD, an
  Admin dashboard warning and a non-production setup banner.
- LocalBusiness JSON-LD requires the Admin switch **and** a business name **and** a phone or address.
- Phone country rules and accepted phone length moved to `siteConfig.phone`.
- Lead topic field driven by `siteConfig.leads.projectTypes` (empty = hidden).
- Frontend adapter `src/site/adapter.ts`: core no longer imports client components directly.
- `supabase/install/fresh-install.sql` (one paste for a new project) and `first-admin.sql`.
- Neutral example frontend and placeholder logo.

- Scheduled posts go live on the home page, blog index, post URL and sitemap within 60 seconds of `published_at`
  without an Admin save (public post reads refresh at least every `POST_FRESHNESS_SECONDS`).
- Admin: permanent post deletion (typed confirmation), Admin → Media (list uploads with usage, delete unused files),
  and page SEO "reset to defaults". A replaced or removed image is deleted when nothing else references it.

Migrations: 1–6 unchanged; added `20260917090000_lookup_consent_default_denied.sql`.
