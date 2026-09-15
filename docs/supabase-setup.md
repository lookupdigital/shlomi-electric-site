# Supabase Setup — project `shlomiboaron` (ap-northeast-1)

One Supabase project is used for local development, Vercel Preview and Vercel Production during the MVP.
Do not create another project and do not change the region.

## 1. Environment variables

Supabase Dashboard → project **shlomiboaron** → **Project Settings → API Keys** (or **Data API**):

| Copy | Paste as |
| --- | --- |
| Project URL (`https://<ref>.supabase.co`) | `NEXT_PUBLIC_SUPABASE_URL` |
| `anon` / publishable key | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `service_role` / secret key (click **Reveal**) | `SUPABASE_SERVICE_ROLE_KEY` |

- **Local:** fill in `.env.local` in the repository root (git-ignored), then restart `npm run dev`.
- **Vercel:** Project → **Settings → Environment Variables**. Add all three for **Production** and **Preview**
  (and Development if you use `vercel dev`). Mark `SUPABASE_SERVICE_ROLE_KEY` as **Sensitive**. Never create a
  `NEXT_PUBLIC_` copy of it. Redeploy afterwards (`NEXT_PUBLIC_*` values are baked in at build time).

## 2. Inspect before migrating (read-only)

Run the inspection query from the chat / plan in **SQL Editor** first. The first migration also aborts, changing
nothing, if any of `admin_users, site_settings, page_seo, posts, leads, redirects` already exists.

## 3. Apply migrations

**SQL Editor → New query**, paste each file's full contents and **Run**, strictly in this order:

1. `supabase/migrations/20260915130000_lookup_foundation.sql`
2. `supabase/migrations/20260915130100_lookup_content.sql`
3. `supabase/migrations/20260915130200_lookup_leads.sql`
4. `supabase/migrations/20260915130300_lookup_media_storage.sql`

Each file runs as a single transaction — if it errors, nothing from that file is applied.
All four are additive: no drops, no data changes to existing objects.

> Later, if the Supabase CLI is linked, mark these as applied so they are not replayed:
> `npx supabase migration repair --status applied 20260915130000 20260915130100 20260915130200 20260915130300`

## 4. Auth settings

**Authentication → Sign In / Providers**
- Email provider: enabled.
- **Allow new users to sign up: OFF** (admins are created manually; admin access additionally requires the allowlist).

**Authentication → URL Configuration**
- Site URL: the production URL (e.g. `https://shlomi-electric-site.vercel.app` until the real domain exists).
- Redirect URLs: add `http://localhost:3000/**` and the production URL with `/**`.

## 5. Create the first admin

1. **Authentication → Users → Add user → Create new user**: email + strong password, tick **Auto Confirm User**.
2. **SQL Editor**, replacing the email:

```sql
insert into public.admin_users (user_id)
select id from auth.users where email = 'admin@example.com';
```

3. Sign in at `/admin/login`.

To remove an admin: `delete from public.admin_users where user_id = (select id from auth.users where email = '…');`

## 6. How the pieces use Supabase

| Area | Key | Access |
| --- | --- | --- |
| Public pages (settings, page SEO, published posts, active redirects) | anon | RLS: read-only, published/active rows only |
| Admin pages & actions | anon + admin session cookie | RLS: writes require `public.is_admin()` |
| Image uploads (admin) | anon + session, from the browser | Storage policies: `media` bucket, admins only, images ≤ 5 MB, no SVG |
| Lead form submissions | **service role**, server-only (`src/lookup/supabase/service.ts`) | Inserts only; no public read or write on `leads` |

`npm run check:secrets` (after `npm run build`) fails if the service role key or its variable name appears in any
browser-facing build output.
