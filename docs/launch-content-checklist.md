# Launch checklist — Shlomi Electric & Contracting

Resolve before enabling indexing and sending paid traffic. No replacement business data has been invented in code.
"Admin" = `/admin`; "Code" = needs a developer.

Legend: ☐ open · ☑ done

## 1. Business details (currently Figma demo values)

| ☐ | Item | Current value | Where to fix |
| --- | --- | --- | --- |
| ☐ | **Fake phone number** | `03-555-1234` | Admin → Site settings → Phone |
| ☐ | **Fake WhatsApp number** | `972500000000` | Admin → Site settings → WhatsApp |
| ☐ | **Wrong email — belongs to another brand** | `info@nidbach.co.il` ("נדבך") | Admin → Site settings → Email |
| ☐ | Address not confirmed | `רחוב הברזל 30, תל אביב` | Admin → Site settings → Address |
| ☐ | Business / legal name inconsistency | "שלומי שירותי חשמל וקבלנות" vs "שלומי שירותי חשמל ועבודות בנייה וקבלנות" | Admin → Business name / Site name |
| ☐ | Logo & favicon (favicon.ico looks like the Next.js default) | — | Admin → Logo / Favicon |
| ☐ | Social profile URLs | none | Admin → Social |
| ☐ | Enable LocalBusiness structured data **after** the above is real | disabled | Admin → "Business details verified" |

These values now live only in the database (seeded once from the old code). Clearing a field hides it on the site;
nothing falls back to demo values.

## 2. Page content (Code — copy changes need client approval)

| ☐ | Item | Location |
| --- | --- | --- |
| ☐ | **Fake reviews** — 5 identical testimonials naming another company ("נדבך"); "דוד אלדן" vs "קבוצת אולדן" | `src/lib/site.ts` → `reviews` |
| ☐ | **Duplicated projects** — the 3 demo projects render twice on /projects | `src/app/(site)/projects/page.tsx` |
| ☐ | Demo project names/images and stock-like collage images | `src/lib/site.ts` → `projects`; /projects collage |
| ☐ | **Mismatched FAQ** — home Q1 "האם אתם עובדים בכל הארץ?" answered with a permits answer; Q1 and Q2 identical | `src/app/(site)/page.tsx` → `faq` |
| ☐ | Temporary FAQ answers awaiting approval (home Q3–Q6, all contact FAQs). **Then set `siteConfig.faq.structuredData = true`** | `src/app/(site)/page.tsx`, `contact/page.tsx`, `src/site.config.ts` |
| ☐ | Unverified claims: "+2,000 לקוחות מרוצים", "+27 שנות ניסיון", licence claims | Stats sections |
| ☐ | Unique meta titles/descriptions per page (counters show recommended length) | Admin → Pages & SEO |
| ☐ | Custom default OG image (a logo-based one is generated automatically) | Admin → Site settings → Default OG image |

## 3. Legal

| ☐ | Item | Location |
| --- | --- | --- |
| ☐ | **Missing privacy policy** — footer link `#`; consent checkbox refers to it; leads (PII) are stored | New page + `src/components/Footer.tsx` |
| ☐ | **Missing terms of use** — footer link `#` | New page + `src/components/Footer.tsx` |
| ☐ | Lead retention period and data-removal procedure (leads can now be deleted from the admin) | Policy |
| ☐ | Consent Mode default (`granted`/`denied`) and whether a consent banner is required | Legal decision → Admin → Site settings |

## 4. Operations & tracking

| ☐ | Item | Where |
| --- | --- | --- |
| ☐ | Apply migration 5 + run the one-time seed | `docs/supabase-setup.md` |
| ☐ | **Lead notifications:** set `LEAD_WEBHOOK_URL` (+ `LEAD_WEBHOOK_SECRET`), e.g. a Make scenario that emails/WhatsApps the owner | Vercel env |
| ☐ | **Turnstile:** create a Cloudflare Turnstile widget for the domain; set `NEXT_PUBLIC_TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET_KEY` | Vercel env |
| ☐ | `npm run check:supabase` passes (sign-up disabled, private tables not public) | Terminal |
| ☐ | Production domain: set "Site URL"; redirect `*.vercel.app` to the domain in Vercel | Admin + Vercel |
| ☐ | **Admin host isolation** (`NEXT_PUBLIC_ADMIN_HOST=admin.<domain>`) before third-party tags go live | `docs/security-architecture.md` |
| ☐ | GTM container configured per `docs/gtm-container-contract.md` and QA'd with `LOOKUP_GTM_DEBUG=1` on a preview | GTM |
| ☐ | Decide whether a blog link in the navigation is wanted (it appears automatically once a post is published) | — |
| ☐ | Submit one real test lead on production; confirm the webhook arrives; delete it from the admin | Manual |
| ☐ | Remove automated test leads: `delete from public.leads where is_test;` | SQL Editor |

## 5. Indexing (final step)

| ☐ | Item |
| --- | --- |
| ☐ | **Indexing is currently DISABLED.** All pages render `noindex, nofollow`; non-production environments are always noindex + `robots.txt Disallow: /`. |
| ☐ | After sections 1–4: Admin → Site settings → "Allow indexing" → save → verify `index, follow` in the production page source → submit `/sitemap.xml` in Google Search Console. |
