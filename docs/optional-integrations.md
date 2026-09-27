# Optional integrations

Everything here is off by default and the site works without it.

## Lead webhook (Make, Zapier, n8n, CRM)
- Env: `LEAD_WEBHOOK_URL`; `LEAD_WEBHOOK_SECRET` strongly recommended (without it requests are unsigned).
- One POST per stored lead, sent after the visitor's response. Body: lead fields, attribution, `environment`,
  `test`. Headers: `X-Lookup-Event`, `X-Lookup-Delivery`, `X-Lookup-Timestamp`, `X-Lookup-Signature` = `sha256=` HMAC-SHA256 of `"<timestamp>.<body>"` with
  the secret. Verify the signature and reject old timestamps in the receiver.
- Failures are stored on the lead (`notification_status = failed`) and can be resent from Admin → Leads.
- Production sends real leads only; Preview sends test leads only to its own URL (use a test scenario or leave empty).
- Admin → System & integrations → **Send test webhook**: one signed POST through the same delivery path, with
  `X-Lookup-Event: lead.test`, `"event": "lead.test"`, `"test": true` and lead-shaped sample values marked TEST.
  Nothing is stored (no lead row, no metrics). Receivers should ignore `test: true` / `lead.test` when creating records.
- Admin shows the webhook as Optional when unset, Warning when the URL has no secret (or the secret has no URL), Error
  when the URL is invalid. Only the host is displayed.

## Cloudflare Turnstile
- Cloudflare → Turnstile → Add widget (Managed). Hostnames: production domain, `*.vercel.app` project host, `localhost`.
- Env: `NEXT_PUBLIC_TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET_KEY`. The widget loads on first form interaction.
- A Cloudflare outage fails open (lead kept); an invalid token is rejected.

## Google Tag Manager
- Admin → Site settings → GTM ID (`GTM-XXXXXXX`). Loads in Production only (or `LOOKUP_GTM_DEBUG=1` on a Preview).
- Consent Mode v2 default is set in Admin (new installs: `denied`). With `denied` and no consent banner, Google tags
  measure in cookieless mode only — decide with the client.
- Events and rules: `gtm-container-contract.md`. Add any extra tag hosts to `TRACKING_ORIGINS` in
  `src/lookup/security/csp.ts`.

## Custom domain
1. Vercel → Settings → Domains → add `www.example.com` (and apex redirect).
2. Admin → Site settings → Site URL = `https://www.example.com`.
3. Supabase → Auth → URL Configuration: Site URL and redirect URL for the domain.
4. Add the domain to the Turnstile widget hostnames.

## Admin host
1. Add `admin.example.com` to the Vercel project.
2. Env (Production): `NEXT_PUBLIC_ADMIN_HOST=admin.example.com` → redeploy.
3. Supabase Auth redirect URLs: add `https://admin.example.com/**`.
`/admin` on the public host then redirects to the admin host (recommended before adding third-party GTM tags; see
`security-architecture.md`).
