# Architecture

## Layers
| Layer | Paths | Who edits |
| --- | --- | --- |
| **Core** (Lookup infrastructure) | `src/lookup/**`, `src/app/admin/**`, `src/app/sitemap.ts`, `robots.ts`, `favicon.ico/`, `og-default.png/`, `src/app/layout.tsx`, `src/proxy.ts` (logic), `supabase/migrations/**`, `scripts/**`, `.github/**` | Only through a Starter release (see `upgrade-strategy.md`) |
| **Site config** | `src/site.config.ts` | Per client |
| **Frontend adapter** | `src/site/adapter.ts` | Per client (keep the three exports) |
| **Client frontend** | `src/app/(site)/**`, `src/components/**`, `src/app/globals.css`, `public/**`, `src/app/not-found.tsx` (wrapper only) | Per client, freely |

Rule: core code never imports from `src/components`. It reaches the client frontend only through
`src/site/adapter.ts` (`SiteChrome`, `BlogPostView`, `NotFoundView`), which the Admin post preview and the 404 pages use.

## Configuration model
| Kind | Where | Examples | Changed by |
| --- | --- | --- | --- |
| ENVIRONMENT | Vercel env / `.env.local` | Supabase keys, Turnstile, webhook, admin host | Developer, per environment |
| DATABASE / ADMIN | `site_settings`, `page_seo`, `posts`, `redirects` via `/admin` | Site/business name, phone, logo, favicon, SEO defaults, indexing, LocalBusiness, Consent Mode, GTM ID | Client or Lookup, at runtime, no deploy |
| SITE CONFIG | `src/site.config.ts` | Locale/direction, phone country rules, schema.org type, core routes, lead messages and topics, rate limit, OG colors, FAQ schema flag | Developer, per client, deploy |
| FRONTEND | `src/app/(site)`, `src/components`, CSS, `public/` | Design, copy, sections | Developer, per client, deploy |

Precedence for public values: **Admin value → site config fallback → empty**. An empty value hides the element
(no demo data is ever shown).

## Site config reference (`src/site.config.ts`)
- `identity.siteName` — keep `""`. The real name lives in Admin. An empty identity shows a warning on the Admin
  dashboard and a setup banner on non-production deployments; no placeholder name reaches metadata.
- `locale` — `htmlLang`, `dir`, `bcp47`, `ogLocale`, `timeZone`. Defaults: Hebrew / RTL / Israel.
- `phone` — `countryCallingCode`, `nationalTrunkPrefix` (used for `tel:`/WhatsApp links and schema telephone),
  `minDigits`/`maxDigits` (lead form validation). Defaults: Israel (`972`, `0`, 9–15 digits).
- `business.serviceArea` — fallback only when the database has no `service_area` column.
- `schema.businessTypes` — schema.org type(s) for LocalBusiness. Default `["LocalBusiness"]`.
- `routes.corePages` / `routes.blog` — pages listed in the sitemap, Admin SEO and navigation. When you add a core page,
  add it to the matcher exclusion in `src/proxy.ts` (a unit test fails until you do), and pass its entry to
  `buildPageMetadata(registeredRoute("/path"))` so live metadata and the Admin previews use the same title.
  `nav: false` keeps a route registered (Pages & SEO, metadata, sitemap) but hides it from the site navigation.
- `leads` — `leadType`, `projectTypes` (empty = no topic field), rate limit, validation messages.
- `branding` — fallback logo and generated OG image colors.
- `faq.structuredData` — FAQPage JSON-LD, only for final, visible answers.
- `admin.sessionMaxAgeSeconds` — admin session lifetime.

## Request flow
- `src/proxy.ts` — admin session refresh and optional admin host; managed redirects; fast 404 for unknown blog slugs.
- Public pages read settings/posts through `unstable_cache` with tags; Admin saves call `updateTag`/`revalidatePath`.
  Each build gets a fresh cache key (`LOOKUP_BUILD_ID`).
- Scheduled posts become public by time (RLS `published_at <= now()`), not by an Admin action, so public post reads are
  refreshed at least every `POST_FRESHNESS_SECONDS` (60 s, `src/lookup/posts.ts`); pages that list posts inherit it as
  their ISR interval. On a quiet site the first request after a long idle period can still receive the previous page
  copy while it regenerates (standard ISR); `sitemap.xml` and the post URL are never older than the window.
- Media: files live in the `media` bucket under `uploads/<YYYY-MM>/<uuid>.<ext>`. Admin → Media lists them with their
  usage (settings, page SEO, posts incl. rich text) and deletes only unused files, with the admin session (storage RLS).
  Saving a replaced/cleared image, resetting page SEO or deleting a post deletes the files it stopped using when no
  other row references them; on any doubt the file is kept.
- `sitemap.xml`, `robots.txt`, `favicon.ico`, `og-default.png` are rendered per request (stale CDN copies after
  Admin changes were a real incident).
- Environment (`src/lookup/runtime.ts`): `LOOKUP_SITE_ENV` → `VERCEL_ENV` → development. Only production can be
  indexed, loads GTM, and stores real (non-test) leads.

## SEO resolution, sitemap and image alt text (v1.2)
- `seo-model.ts` → `resolveSeo` is the only place SEO values are resolved: `composeMetadata` (live pages and posts),
  the Admin previews (`admin/SeoPreview.tsx`, re-resolving the unsaved form values) and `seoStates` (factual states:
  problem / improve / info, evaluated on the resolved values so a valid fallback is never "missing").
- Robots: effective `index`/`follow` = global indexability (Production AND Launch) AND the page flags; the page flags
  alone drive the Admin states.
- `sitemap-model.ts`: core pages unless noindex or canonical elsewhere; posts that are published, indexable and
  self-canonical; the blog index when at least one post is listed. Canonical comparison ignores host case, a trailing
  slash and the hash.
- Content images (Tiptap `image` node) carry `alt` and an explicit `decorative` flag; the renderer outputs `alt=""` for
  decorative images. `alt-facts.ts` counts missing alt (non-decorative with empty alt; featured image without alt) for
  the posts list and the Recommended checklist item. Code-owned images are not scanned.
- Migration 8 compatibility (`post-schema.ts`): only PostgREST `PGRST204` / Postgres `42703` errors naming
  `og_title`, `og_description` or `robots_follow` are treated as "migration 8 missing"; a post write is then retried
  without those columns only when they hold their defaults. Every other error is returned unchanged.

## Admin content safety (v1.2)
- `admin/unsaved-changes.ts`: one shared leave-page guard (beforeunload + in-Admin link clicks) for forms that pass
  `guardUnsaved` to `AdminForm`, and for the post editor.
- Post editor (`admin/PostForm.tsx`, rules in `admin/content-safety.ts`):
  - **Local copy** in `localStorage` under `lookup-admin:post-recovery:v1:<admin user id>:<post id|new>` — form fields
    only, cleared after a successful save; offered for restore on the next load, flagged stale when the post's
    `updated_at` moved on. Restoring only fills the form.
  - **Draft autosave** (`autosaveDraft`): `UPDATE … WHERE id AND status = 'draft' AND updated_at = <base>`; never writes
    status/published_at, never calls `updateTag`/`revalidatePath`, never runs media cleanup. Published and scheduled
    posts are only changed by the explicit Save.
  - **Stale-save protection**: `savePost` updates with `updated_at = <base>`; zero rows → a conflict message, nothing
    overwritten. The editor waits for a running autosave before an explicit save.
  - Because autosave can drop an image reference before the explicit save, the editor sends the upload paths referenced
    at its last explicit save as extra cleanup candidates; cleanup still deletes only unreferenced managed uploads.
  - Limits: a new post is protected locally until it is created; browser Back inside the app is not intercepted.

## Admin operations (v1.1)
- **Site status** is derived, never stored: **Live** = `site_settings.indexing_enabled`; otherwise **Ready** when every
  required configuration check passes (the Production-environment check only gates Go live), else **Development**. Indexing is switched only in Admin → Launch (`actions/launch.ts`):
  Go live re-runs the required checks on the server and is refused outside Production; Site settings no longer writes it.
- **Launch checklist / health / integrations**: facts gathered once per request on those admin pages
  (`admin/site-report.ts`), rules in `admin/readiness.ts` (pure, unit-tested). Required checks block Go live;
  Recommended ones are advised; Optional integrations never block and never appear under "Requires attention".

## Structured data rules
- Organization only when a business name exists; WebSite only when a site name exists.
- LocalBusiness only when enabled in Admin **and** a business name **and** a phone or address exist.
- Never reviews or ratings.
