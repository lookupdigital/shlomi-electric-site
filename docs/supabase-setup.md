# Supabase setup — project `shlomiboaron` (ap-northeast-1)

One Supabase project serves local development, Vercel Preview and Vercel Production. Do not create another project
and do not change the region.

## 1. Environment variables

Supabase Dashboard → project **shlomiboaron** → **Project Settings → API Keys**:

| Copy | Paste as |
| --- | --- |
| Project URL (`https://<ref>.supabase.co` — include `https://`) | `NEXT_PUBLIC_SUPABASE_URL` |
| `anon` / publishable key | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `service_role` / secret key (click **Reveal**) | `SUPABASE_SERVICE_ROLE_KEY` |

Optional variables (lead webhook, Turnstile, admin host, environment) are documented in `.env.example`.

- **Local:** `.env.local` in the repository root (git-ignored); restart the server after changes.
- **Vercel:** Project → **Settings → Environment Variables**. The per-environment checklist (Preview vs Production,
  Sensitive flags) is in `docs/vercel-preview.md`. Redeploy after changes (`NEXT_PUBLIC_*` values are baked in at
  build time).

## 2. Migrations

**SQL Editor → New query** → paste each file's full contents → **Run**, strictly in order:

1. `supabase/migrations/20260915130000_lookup_foundation.sql`
2. `supabase/migrations/20260915130100_lookup_content.sql`
3. `supabase/migrations/20260915130200_lookup_leads.sql`
4. `supabase/migrations/20260915130300_lookup_media_storage.sql`
5. `supabase/migrations/20260916090000_lookup_hardening.sql` — lead status / test flag / notification state,
   admin update & delete, rate limiting, Consent Mode default, generalized blog slugs.

Each migration aborts without changes if it has already been applied (or, for 5, if 1–4 are missing). All are
additive. For certainty in the SQL Editor, wrap a paste in `begin;` … `commit;`.

After schema changes in code, regenerate types: `npm run db:types` (CI fails if they are out of date).

> If the Supabase CLI is linked later, mark these as applied so they are not replayed:
> `npx supabase migration repair --status applied 20260915130000 20260915130100 20260915130200 20260915130300 20260916090000`

### One-time client seed (this site only)
`supabase/seeds/initial-site-settings.sql` copies the contact details the site showed before (still the Figma demo
values) into the settings row, filling only empty fields. Run it once after migration 5 so the header and footer
keep their current content until real details are entered in the admin.

## 3. Auth settings
**Authentication → Sign In / Providers**
- Email provider: enabled.
- **Allow new users to sign up: OFF.**

**Authentication → URL Configuration**
- Site URL: the production URL. Redirect URLs: `http://localhost:3000/**` and the production URL with `/**`.

Verify with `npm run check:supabase` (read-only; fails if sign-up is enabled or private tables are publicly readable).

## 4. Admins
1. **Authentication → Users → Add user → Create new user** (email + strong password, tick **Auto Confirm User**).
2. SQL Editor:
   ```sql
   insert into public.admin_users (user_id) select id from auth.users where email = 'admin@example.com';
   ```
3. Sign in at `/admin/login`. Sessions last 12 hours of inactivity (HttpOnly cookie scoped to `/admin`).

After upgrading from a version before the hardening pass, every admin must sign in again once (the old
JavaScript-readable cookies are ignored and deleted automatically).

To remove an admin: `delete from public.admin_users where user_id = (select id from auth.users where email = '…');`

## 5. Test data
Leads are stored with `is_test = true` when they come from an automated test (`E2E_TEST_TOKEN`) or from any
non-production deployment (Vercel Preview, local). Test leads are hidden from the admin lead list by default (tick
"include test leads"), excluded from exports and dashboard counts, and never sent to the production webhook. A
Preview deployment sends its test leads to its own `LEAD_WEBHOOK_URL`, with `"test": true` and
`"environment": "preview"` in the payload. Remove them with:
```sql
delete from public.leads where is_test;
```
