# Supabase setup

One Supabase project per client site. Local development, Vercel Preview and Production may share it: non-production
leads are stored as test leads and never reach the production webhook.

## 1. Create the project
Supabase → **New project**. Pick the region closest to the client's visitors (it cannot be changed later). Save the
database password in the password manager (the site does not use it).

## 2. Keys → environment
**Project Settings → API Keys**:

| Copy | Paste as |
| --- | --- |
| Project URL (with `https://`) | `NEXT_PUBLIC_SUPABASE_URL` |
| Publishable / `anon` key | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| Secret / `service_role` key | `SUPABASE_SERVICE_ROLE_KEY` (server only, Sensitive on Vercel) |

## 3. Database — fresh install (new project)
**SQL Editor → New query** → paste the whole of `supabase/install/fresh-install.sql` → **Run**. One transaction:
tables, RLS policies, functions, the `media` storage bucket and the single settings row. Expect "Success. No rows
returned".

The file is generated from `supabase/migrations` (`npm run db:install-sql`; CI checks it is current). Running it a
second time is refused without changes.

A new install starts unconfigured: empty site identity, indexing off, LocalBusiness off, Consent Mode default
**denied**, no GTM.

## 4. Auth settings
**Authentication → Sign In / Providers**: Email enabled; **Allow new users to sign up: OFF**.

**Authentication → URL Configuration**: Site URL = the production URL (the `*.vercel.app` URL until the domain
exists). Redirect URLs: `http://localhost:3000/**` and `<production URL>/**`.

## 5. First admin
1. **Authentication → Users → Add user → Create new user**: email + strong password, tick **Auto Confirm User**.
2. SQL Editor: paste `supabase/install/first-admin.sql`, replace the email, run (expect `INSERT 0 1`).
3. Sign in at `/admin/login`.

Remove an admin: `delete from public.admin_users where user_id = (select id from auth.users where email = '…');`

## 6. Verify
`npm run check:supabase` (with the project's keys in `.env.local`): sign-up disabled, anonymous users cannot read or
write leads/admin data. The Admin dashboard also shows an error if sign-up is ever re-enabled or the schema is
missing.

## Upgrading an existing project
Apply only the new files from `supabase/migrations`, in filename order, in the SQL Editor. Every migration checks its
prerequisites and aborts without changes if it was already applied. Record which files ran in the client's
`docs/client-notes.md`.

> If the Supabase CLI is linked later, mark the applied migrations with
> `npx supabase migration repair --status applied <versions…>` so they are not replayed.

### Migration list
1. `20260915130000_lookup_foundation.sql` — admin allowlist, `is_admin()`, `site_settings`
2. `20260915130100_lookup_content.sql` — page SEO, posts, redirects
3. `20260915130200_lookup_leads.sql` — leads
4. `20260915130300_lookup_media_storage.sql` — `media` bucket and policies
5. `20260916090000_lookup_hardening.sql` — lead status/test flag/notifications, rate limiting, Consent Mode setting
6. `20260916120000_lookup_service_area.sql` — `site_settings.service_area`
7. `20260917090000_lookup_consent_default_denied.sql` — Consent Mode default `denied` for new installs; an already
   configured site keeps its saved value
8. `20260918090000_lookup_post_social_seo.sql` — posts `og_title`, `og_description`, `robots_follow` (v1.2; additive,
   existing posts keep their behavior). Until it is applied the site keeps working, Admin → System shows the database
   version warning, and post saves that set one of these fields are refused with an explanation.

## Test data
Test leads (`is_test = true`) come from non-production deployments and from the Playwright test. They are hidden
from the default lead list, exports and counts. Remove them with `delete from public.leads where is_test;`
