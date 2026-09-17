# Vercel Preview — environment and rollout

Preview deployments use the **same Supabase project** as production (`shlomiboaron`). Anything an admin changes on a
Preview (settings, page SEO, posts, redirects) is real content. Leads submitted on a Preview are stored as test
leads (`is_test = true`) automatically.

What keeps a Preview safe without extra configuration:
- `VERCEL_ENV=preview` (set by Vercel) makes the environment `preview`: every page is `noindex` (meta tag and
  `X-Robots-Tag` header), `robots.txt` disallows everything, and GTM never loads — regardless of the admin settings.
- Every lead stored on a Preview is a test lead: hidden from the admin lead list by default, excluded from exports and
  dashboard counts, never sent to the production webhook.

## Environment variables

Vercel → Project → **Settings → Environment Variables**. Scope each variable to the environments listed.
`NEXT_PUBLIC_*` values are public (inlined into the browser bundle) and are read at build time — redeploy after changing
them. "Sensitive" variables cannot be read back in the dashboard.

### A. Required for Preview

| Variable | Where the value comes from | Public / secret | Environments | Sensitive |
| --- | --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → shlomiboaron → Project Settings → API → Project URL (`https://<ref>.supabase.co`) | Public | Preview + Production (same value) | No |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API Keys → publishable key (`sb_publishable_…`) or legacy `anon` key | Public | Preview + Production (same value) | No |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API Keys → secret key (`sb_secret_…`) or legacy `service_role`. Recommended: create a dedicated secret key named for Vercel so it can be revoked independently of the local one | Secret (bypasses RLS) | Preview + Production | **Yes** |
| `LEAD_RATE_LIMIT_SALT` | Generate locally: `openssl rand -base64 32` | Secret | Preview (own value); Production later (different value) | **Yes** |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Preview: Cloudflare's documented always-pass test site key `1x00000000000000000000AA` | Public | **Preview only** | No |
| `TURNSTILE_SECRET_KEY` | Preview: Cloudflare's documented always-pass test secret `1x0000000000000000000000000000000AA` | Secret in production; the test value is public | **Preview only** | Yes |
| `LEAD_WEBHOOK_URL` | A **test** endpoint you control (e.g. a Make/n8n test scenario or a request-bin). Never the client's real destination on Preview | Secret (URLs often embed tokens) | **Preview only** | **Yes** |
| `LEAD_WEBHOOK_SECRET` | Generate locally: `openssl rand -hex 32`; enter the same value in the test receiver to verify `X-Lookup-Signature` | Secret | **Preview only** (own value) | **Yes** |

Without `LEAD_WEBHOOK_URL` leads are still stored; the admin shows a "webhook not configured" warning.
Without the Turnstile keys the form works with rate limiting only.

### B. Optional for Preview

| Variable | Guidance | Public / secret | Environments | Sensitive |
| --- | --- | --- | --- | --- |
| `LOOKUP_SITE_ENV` | **Leave unset on Vercel** (`VERCEL_ENV` decides). If set on Preview, it must be `preview` — **never `production`** (that would enable indexing, GTM and real lead notifications on the Preview) | Public | — | No |
| `LOOKUP_SITE_URL` | Leave unset on Preview: canonicals then use `VERCEL_PROJECT_PRODUCTION_URL`, and every Preview page is `noindex` anyway. Do **not** fill the "site URL" admin setting with a Preview URL (it is shared with production) | Public | — | No |
| Protection Bypass for Automation | Vercel → Settings → Deployment Protection → enable "Protection Bypass for Automation". Vercel exposes it as `VERCEL_AUTOMATION_BYPASS_SECRET`; not added by hand. Only needed for scripted checks (curl/Playwright) against a protected Preview | Secret | Preview | (system) |
| `E2E_TEST_TOKEN` | **Not needed on Vercel** (every Preview lead is already a test lead). Only a GitHub Actions secret, for the manual E2E job | Secret | GitHub Actions only | — |

GitHub → repository → Settings → Secrets and variables → Actions (only for the manual `run_e2e` workflow):
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `E2E_TEST_TOKEN`.

### C. Production only — configure later

| Variable | Guidance | Environments | Sensitive |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` | Real keys: Cloudflare → Turnstile → add site with the production hostname(s) | Production | Secret key: Yes |
| `LEAD_WEBHOOK_URL` / `LEAD_WEBHOOK_SECRET` | The real notification destination (email relay / CRM) and its own secret | Production | Yes |
| `LEAD_RATE_LIMIT_SALT` | A different value from Preview | Production | Yes |
| `LOOKUP_SITE_URL` | `https://<real domain>` (or fill the "site URL" admin setting at launch) | Production | No |
| `NEXT_PUBLIC_ADMIN_HOST` | Only once an admin subdomain exists (e.g. `admin.<domain>`); required before GTM/marketing tags go live. **Never on Preview** — `/admin` would redirect to that host | Production | No |
| `LOOKUP_GTM_DEBUG` | Never set in production. Set `1` on Preview only to test a GTM container deliberately | — | No |
| `E2E_TEST_TOKEN` | Never set on Vercel | — | — |
| `LOOKUP_BUILD_ID` | Not needed; derived automatically per build | — | — |

Do **not** install the Vercel ↔ Supabase marketplace integration: it injects differently named variables and can
point at another project.

## Rollout steps

1. Vercel → Settings → Git: confirm the connected repository is `lookupdigital/shlomi-electric-site` and the
   **Production Branch is `main`**. Only `main` deploys to production.
2. Add the variables in section A with the **Preview** scope (optionally limited to the feature branch).
3. Keep Deployment Protection (Vercel Authentication) on for Previews.
4. Push the feature branch (never `main`). Vercel builds a Preview automatically; CI runs on GitHub.
5. Do not merge the branch into `main` until production launch is approved.

## Supabase for a Preview URL

- Admin sign-in is email + password: no redirect URL is needed for Preview hosts. Keep **Allow new users to sign up:
  OFF**; leave **Site URL** unchanged.
- Image uploads use signed upload URLs to `*.supabase.co` — no CORS or bucket changes.
- No migrations or data changes are needed.

## Preview validation checklist

- Every page returns `X-Robots-Tag: noindex, nofollow`, `robots.txt` is `Disallow: /`, no GTM script.
- Admin: sign in, session cookie `lookup-admin-auth` is HttpOnly and scoped to `/admin`, sign out.
- Lead form: Turnstile widget renders, a submission succeeds, the lead is stored with `is_test = true` and shows the
  test badge (tick "include test leads"), the test webhook receives a signed payload with `"test": true,
  "environment": "preview"`, and `generate_lead` fires once with an `event_id`.
- Blog: draft preview, publish → public post and sitemap, unpublish → 404. Delete test content afterwards.
- `npm run check:supabase` still passes.
