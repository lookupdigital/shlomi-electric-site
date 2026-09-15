# Security architecture

## 1. Admin session isolation

### The risk
The public site will run Google Tag Manager, which injects third-party scripts (GA4, Google Ads, Meta, TikTok,
LinkedIn…) into the same origin as `/admin`. `@supabase/ssr` defaults to auth cookies that are readable by
JavaScript (`httpOnly: false`), sent to every path (`path: "/"`) and kept for 400 days. Any compromised or
malicious tag could have read an admin's session tokens and used them from anywhere to read every lead.

### What is implemented (works on any host, including `*.vercel.app`)
| Control | Where | Effect |
| --- | --- | --- |
| **HttpOnly cookies** | `src/lookup/supabase/cookies.ts` (`adminCookieOptions`) | Session tokens cannot be read by any page script, first- or third-party. |
| **Cookies scoped to `/admin`** | same | Tokens are never sent with public page, asset or API requests. |
| **Dedicated cookie name** (`lookup-admin-auth`) | same | Old JS-readable `sb-*-auth-token` cookies are never reused; the proxy deletes them on every admin request. |
| **12-hour sliding session** | `siteConfig.admin.sessionMaxAgeSeconds`, `withAdminLifetime` | Replaces the 400-day default; the cookie is renewed only while the admin is active. |
| **No browser Supabase session** | `src/lookup/media.ts`, `actions/media.ts` | Image uploads use one-time signed upload tokens issued by a Server Action after the admin check. |
| **Server-side validation unchanged** | `src/lookup/auth.ts` | Every admin page and action verifies the user with `supabase.auth.getUser()` + the `admin_users` allowlist (deduplicated per request with React `cache`). The proxy's `getClaims()` check is only an optimistic redirect. |
| **No tracking on the admin** | `Analytics.tsx` | GTM, dataLayer events and attribution are disabled on `/admin`. |
| **Strict admin CSP** | `src/lookup/security/csp.ts` → `next.config.ts` | `/admin` allows scripts, connections and images only from this origin and Supabase; no frames; `frame-ancestors 'none'`. |

### Residual risk and the recommended final step
HttpOnly cookies stop *theft* of the session, but a malicious script on the public site could still send
same-origin requests to `/admin` while an admin is signed in **in the same browser** (the browser attaches the
cookie). It cannot export the tokens, and the attack only works during that browsing session. Only a separate
origin fully removes this.

**Recommendation:** before adding third-party tags to GTM, serve the admin from its own host:
1. Add `admin.<domain>` to the Vercel project.
2. Set `NEXT_PUBLIC_ADMIN_HOST=admin.<domain>` (Production) and redeploy.
3. `/admin` on the public host now redirects to the admin host; cookies there are host-only, GTM never loads there,
   and the public site's scripts are cross-origin to the admin (no readable responses, Server Actions reject
   cross-origin requests).

Separate host = **required** for full isolation from third-party tags; cookie scoping alone is **sufficient against
credential theft** and is what protects the site until the admin host is configured.

### Supabase dashboard (recommended)
- Authentication → Sign In / Providers: **Allow new users to sign up = off** (verified by `npm run check:supabase`
  and shown as an error on the admin dashboard if it is ever turned on).
- Authentication → Sessions (Pro plan): enable time-boxed sessions / inactivity timeout to also expire refresh tokens server-side.
- Enable MFA for admin accounts when available on the plan.

## 2. Content Security Policy

Two policies are sent from `next.config.ts` (static headers):

- **Public pages** — scripts from this origin, Cloudflare Turnstile and the standard GTM tag hosts; images from any
  HTTPS host (tracking pixels); `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`,
  `frame-ancestors 'self'`.
- **Admin** — first-party only (plus the Supabase origin for uploads); no third-party origins at all.

`'unsafe-inline'` is allowed for scripts because prerendered Next.js pages include inline bootstrap scripts and
cannot use per-request nonces without making every page dynamic. When a GTM tag needs another host, add it to
`TRACKING_ORIGINS` in `src/lookup/security/csp.ts` (a unit test guards that no tracking host reaches the admin CSP).

## 3. Public lead endpoint

`submitLead` (a public Server Action) runs, in order:
1. honeypot field → rejected;
2. Zod validation;
3. **Cloudflare Turnstile** (when `TURNSTILE_SECRET_KEY` is set) — rejected tokens fail; a Cloudflare outage fails
   open so real leads are not lost;
4. **rate limiting** — `lead_rate_limit_consume()` (service role only) allows `siteConfig.leads.rateLimit` submissions
   per hashed client IP; the table never stores IPs;
5. insert with the service role key (the only use of that key besides notification state);
6. webhook notification after the response (`after()`), signed with HMAC; failures are recorded on the lead and can be
   resent from the admin — the stored lead is never lost.

These checks run on the server, so calling the Server Action directly (without the form) is subject to all of them.

## 4. Data access (RLS)
See `supabase/migrations`. Highlights: anonymous visitors can read only settings, page SEO, published posts and
active redirects; leads are admin-read-only, admins may update only `status` (column-level grant) and delete
(privacy requests); storage writes require `is_admin()`. Verified by `supabase/tests/migrations.test.ts`
(PGlite) and against the live project by `npm run check:supabase`.

## 5. Secrets
`SUPABASE_SERVICE_ROLE_KEY`, `TURNSTILE_SECRET_KEY`, `LEAD_WEBHOOK_SECRET`, `LEAD_RATE_LIMIT_SALT` and
`E2E_TEST_TOKEN` are server-only. `npm run check:secrets` (run in CI after every build) fails if the service role key
name or value appears in any browser-facing build output.
