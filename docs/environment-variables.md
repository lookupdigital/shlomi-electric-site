# Environment variables

Set locally in `.env.local`, on Vercel in **Settings → Environment Variables**. `NEXT_PUBLIC_*` values are baked in at
build time: redeploy after changing them. Never paste values into tickets, chat or commits.

| Variable | Class | Local | Preview | Production | Notes |
| --- | --- | --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | REQUIRED | ✓ | ✓ | ✓ | `https://<ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | REQUIRED | ✓ | ✓ | ✓ | Publishable / anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | REQUIRED, secret | ✓ | ✓ Sensitive | ✓ Sensitive | Server only; lead insert and notification state |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | RECOMMENDED | – | optional | ✓ | Pair with the secret |
| `TURNSTILE_SECRET_KEY` | RECOMMENDED, secret | – | optional | ✓ Sensitive | Without both keys Turnstile is off |
| `LEAD_RATE_LIMIT_SALT` | RECOMMENDED, secret | – | ✓ | ✓ Sensitive | 32+ random chars; different per environment is fine |
| `LOOKUP_SITE_URL` | RECOMMENDED | – | – | ✓ until Admin Site URL is set | Canonical origin fallback |
| `LEAD_WEBHOOK_URL` | OPTIONAL | – | test endpoint only | ✓ | Receives signed JSON per lead |
| `LEAD_WEBHOOK_SECRET` | OPTIONAL, secret | – | with URL | ✓ Sensitive | HMAC key (`X-Lookup-Signature`) |
| `NEXT_PUBLIC_ADMIN_HOST` | OPTIONAL | – | – | when the admin domain exists | e.g. `admin.example.com` |
| `LOOKUP_SITE_ENV` | PRODUCTION-ONLY (non-Vercel hosts) | – | – | only outside Vercel | On Vercel leave unset |
| `LOOKUP_GTM_DEBUG` | PREVIEW-ONLY | – | `1` to test GTM | **never** | |
| `E2E_TEST_TOKEN` | DO-NOT-SET-IN-PRODUCTION | ✓ for e2e | – | **never** | CI secret for the Playwright job |

Automatic (do not set): `VERCEL_ENV`, `VERCEL_PROJECT_PRODUCTION_URL`, `LOOKUP_BUILD_ID` (per build),
`NODE_ENV`.

Minimum for a working Preview: the 3 REQUIRED variables. Minimum for a launch: REQUIRED + Turnstile pair +
`LEAD_RATE_LIMIT_SALT`, plus the webhook pair if leads must be forwarded.

## Checks
- `npm run check:secrets` scans the repository and `.next` output for secret values present in the environment and
  for key patterns. CI runs it with a placeholder service role key.
- The service role key must never appear in a `NEXT_PUBLIC_*` variable or in client code (`server-only` imports
  guard the modules that read it).
