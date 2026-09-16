# Launch checklist — שלומי בארון - שירותי חשמל ועבודות בנייה ושיפוצים

Legend: ☐ open · ☑ done. "Admin" = `/admin`; "Code" = needs a developer.
Preview and Production share one Supabase project: settings saved in the admin apply to both.

## 0. Production blockers

**Do not merge to `main` / deploy Production until every item below is ☑.**

| ☐ | Blocker | Details |
| --- | --- | --- |
| ☐ | **Real reviews** | Replace the demo reviews (section 2) |
| ☐ | **Real projects** | Replace the demo projects (section 2) |
| ☐ | **Real photos** | Replace every demo/stock image (section 2) |
| ☐ | **Privacy Policy** | Text from the client/legal counsel; page + links (section 4) |
| ☐ | **Terms of use** | Text from the client/legal counsel; page + link (section 4) |
| ☐ | **Final domain** | Domain in Vercel + `LOOKUP_SITE_URL` (section 5) |
| ☐ | **Production Make webhook** | Scenario live and tested; recipient below (section 6) |
| ☐ | **Real Production Turnstile keys** | Widget with every production hostname (section 7) |
| ☐ | **Production environment variables** | All set in Vercel, Production scope (section 7) |
| ☐ | **Final Production smoke test** | Section 9 |

## 1. Business details

| ☑/☐ | Item | Value | Where |
| --- | --- | --- | --- |
| ☑ | Business name (confirmed) | שלומי בארון - שירותי חשמל ועבודות בנייה ושיפוצים | Admin → Settings (also the site name) |
| ☑ | Phone (confirmed) | 050-536-7464 | Admin → Settings |
| ☑ | WhatsApp (confirmed) | 050-536-7464 | Admin → Settings |
| ☑ | Email (confirmed) | Shlomi_boaron@walla.co.il | Admin → Settings |
| ☑ | Address (confirmed) | רננים 14, רמת גן | Admin → Settings |
| ☑ | Service area (confirmed) | בעיקר גוש דן, וכן אזורים סמוכים בצפון ובדרום | Admin → Settings → "אזורי שירות" (footer, contact FAQ, schema `areaServed`); needs migration 6 |
| ☑ | Claims (confirmed) | 27 שנות ניסיון · 2,000+ לקוחות · קבלן רשום · חשמלאי מוסמך | Stats, home FAQ |
| ☐ | **Favicon** — `src/app/favicon.ico` is the create-next-app default | — | Admin → Favicon (client to supply) |
| ☐ | Confirm `/images/logo.png` is the client's current logo (also used for the generated OG image and Organization schema) | — | Client |
| ☐ | Social profile URLs (optional) | none | Admin → Social |
| ☐ | Enable LocalBusiness structured data — only after the final domain is live and the logo is confirmed | disabled | Admin → "Business details verified" |

FAQ structured data is enabled: every FAQ answer uses only the confirmed facts above and the services shown on the site.

## 2. Temporary demo content — MANDATORY PRE-LAUNCH REPLACEMENT

Kept on purpose so the Preview stays visually complete. It is **not** this business's content and must not be treated
as verified. No structured data is generated from it.

| ☐ | Item | Location |
| --- | --- | --- |
| ☐ | **Reviews** — 5 identical Figma demo testimonials naming another company | `src/lib/site.ts` → `reviews` (home + /projects) |
| ☐ | **Projects** — 3 demo projects (names, categories) | `src/lib/site.ts` → `projects` (home + /projects) |
| ☐ | **Project photos** | `public/images/project-crestview.png`, `project-harbor.png`, `project-meridian.png` |
| ☐ | **Other demo/stock photos** (and their alt texts) | `hero-office.png`, `problem.png`, `solution.png` (home); `contact-hero-1.png`, `contact-hero-2.png` (/contact); `projects-hero-1.png`, `projects-hero-2.png`, `projects-hero-3.png` (/projects) |

## 3. Copy to confirm with the client

Figma marketing copy that is not in the confirmed facts. Not invented later, but not confirmed either — confirm,
reword or remove before Production.

| ☐ | Copy | Location |
| --- | --- | --- |
| ☐ | "למה בוחרים לעבוד איתנו": ניהול מלא של הפרויקט · עמידה בלוחות זמנים · שקיפות מלאה ושירות אישי · עבודה נקייה ומסודרת | `src/app/(site)/page.tsx` → `reasons` |
| ☐ | Work process steps (שיחת היכרות → פגישה בשטח → הצעת מחיר מסודרת → תחילת עבודה → מסירת הפרויקט) | `src/app/(site)/page.tsx` → `steps` |
| ☐ | Stat labels beyond the confirmed claims: "בעל רישיון בתוקף", "רישיון משרד העבודה" (home), "שירות אישי / ושקיפות מלאה" (/contact), "100% מחויבות לכל פרויקט" (/projects) | Stats sections |
| ☐ | Headlines and section copy ("פרויקט אחד. כתובת אחת. אחריות אחת.", "כל בעלי המקצוע. חברה אחת. אחריות אחת.", service descriptions, CTA subtitles such as "נשמח להגיע") | Home, /projects, /contact |
| ☐ | Footer tagline "בנייה ושיפוץ מסחרי מקצועי..." (says *commercial* only) and /projects intro "עבור עסקים ולקוחות פרטיים" | `src/components/Footer.tsx`, `src/app/(site)/projects/page.tsx` |
| ☐ | Default meta description (mentions "למשרדים ועסקים", "ליווי מלא") and per-page meta titles/descriptions | Admin → Settings / Pages & SEO |
| ☐ | Lead-form project types list | `src/lib/site.ts` → `projectTypes` |

## 4. Legal (text supplied by the client / legal counsel — nothing invented in code)

| ☐ | Item | Current state |
| --- | --- | --- |
| ☐ | **Privacy Policy** page | Missing. Footer link "מדיניות פרטיות" is `href="#"` (`src/components/Footer.tsx`); the lead-form consent checkbox mentions the policy without a link (`src/components/LeadForm.tsx`) |
| ☐ | **Terms of use** page | Missing. Footer link "תנאי שימוש" is `href="#"` (`src/components/Footer.tsx`) |
| ☐ | Decisions for the client / counsel | Lead retention period; whether a consent banner is needed; Consent Mode default (Admin → Settings); disclosure of processors (Supabase, Vercel, Cloudflare, Make) |

## 5. Domain

| ☐ | Item |
| --- | --- |
| ☐ | **Final domain** chosen and added in Vercel → Settings → Domains (apex + www, one redirecting to the other) |
| ☐ | `LOOKUP_SITE_URL=https://<final domain>` in Vercel, **Production scope only**. Keep the admin "Site URL" empty (shared with Preview) |
| ☐ | Canonicals, sitemap, robots.txt and OG URLs then follow automatically — verify after deploy |

## 6. Lead notifications

Architecture: website form → lead stored in Supabase (the primary record, kept even if delivery fails) → signed
webhook → Make → email to the recipient → optional CRM/WhatsApp later. Failed deliveries are shown in the admin
dashboard and can be resent from the lead page.

| ☐ | Item |
| --- | --- |
| ☐ | **Production Make scenario** (custom webhook → email), switched ON, with Make error notifications |
| ☐ | Intended recipient: **שלומי — Shlomi_boaron@walla.co.il** (configured in Make, not in code) |
| ☐ | `LEAD_WEBHOOK_URL` + `LEAD_WEBHOOK_SECRET` in Vercel (Production scope) |

## 7. Production configuration

| ☐ | Item |
| --- | --- |
| ☐ | **Real Turnstile keys**: Cloudflare → Turnstile widget listing every production hostname (domain, www, and the `vercel.app` domain if it stays reachable) |
| ☐ | **All Production environment variables** set before merging — checklist in `docs/vercel-preview.md` |
| ☐ | Admin host isolation (`NEXT_PUBLIC_ADMIN_HOST`) — required only before GTM/marketing tags; keep the GTM ID empty until then |
| ☐ | `npm run check:supabase` passes |

## 8. Test data cleanup (just before launch)

| ☐ | Item |
| --- | --- |
| ☐ | Remove validation leads, the E2E post and redirect, rate-limit rows and the test upload (SQL and list in the production-readiness inventory); afterwards `delete from public.leads where is_test;` for any later Preview leads |

## 9. Final Production smoke test (after merge/deploy)

| ☐ | Item |
| --- | --- |
| ☐ | Home, /projects, /contact load with the real details; phone, WhatsApp and email links work |
| ☐ | Admin sign-in and sign-out |
| ☐ | One real lead: stored in Supabase, email arrives via Make, `generate_lead` fires once; delete the lead afterwards |
| ☐ | Canonical/OG/sitemap URLs use the final domain; pages still `noindex` until section 10 |

## 10. Indexing (final step)

| ☐ | Item |
| --- | --- |
| ☐ | **Indexing is DISABLED.** After sections 0–9: Admin → Settings → "Allow indexing" → verify `index, follow` in the production page source → submit `/sitemap.xml` in Google Search Console |
