# Launch Content Checklist — Shlomi Electric & Contracting

Everything below must be resolved **by the client / agency** before indexing is enabled and paid traffic is sent.
No replacement business data has been invented in code. "Admin" = `/admin`; "Code" = needs a developer.

Legend: ☐ open · ☑ done

## 1. Business details (currently demo values from the Figma file)

| ☐ | Item | Current value | Where to fix |
| --- | --- | --- | --- |
| ☐ | **Fake phone number** | `03-555-1234` (header, footer, tel: links) | Admin → הגדרות אתר → טלפון |
| ☐ | **Fake WhatsApp number** | `972500000000` (hero "שוחחו איתנו ב-WhatsApp") | Admin → הגדרות אתר → WhatsApp |
| ☐ | **Wrong email — belongs to another brand** | `info@nidbach.co.il` ("נדבך") | Admin → הגדרות אתר → אימייל |
| ☐ | Address not confirmed | `רחוב הברזל 30, תל אביב` | Admin → הגדרות אתר → כתובת |
| ☐ | Business / legal name inconsistency | Site name "שלומי שירותי חשמל וקבלנות" vs footer "שלומי שירותי חשמל ועבודות בנייה וקבלנות" | Admin → שם העסק / שם האתר |
| ☐ | Logo & favicon | `/images/logo.png`; `favicon.ico` looks like the Next.js default | Admin → לוגו / Favicon |
| ☐ | Social profile URLs | none | Admin → רשתות חברתיות |
| ☐ | Enable LocalBusiness structured data | Disabled | Admin → "פרטי העסק אומתו" — **only after the above is real** |

The code fallbacks for these values live in `src/lib/site.ts` (`siteDefaults`). Once real values are saved in the admin, update the fallbacks too (Code).

## 2. Page content (Code — copy changes need client approval)

| ☐ | Item | Location |
| --- | --- | --- |
| ☐ | **Fake reviews** — 5 identical testimonials; quote names another company ("נדבך"); "דוד אלדן" vs "קבוצת אולדן". Must not be marked up as Review schema. | `src/lib/site.ts` → `reviews` |
| ☐ | **Duplicated projects** — the 3 demo projects are rendered twice on /projects | `src/app/(site)/projects/page.tsx` (`grid = [...projects, ...projects]`) |
| ☐ | Demo project names/images (קרסטויו, הארבור פוינט, מרידיאן טק) and collage images (villa/kitchen) unrelated to office work | `src/lib/site.ts` → `projects`; `/projects` collage |
| ☐ | **Mismatched FAQ** — home Q1 "האם אתם עובדים בכל הארץ?" is answered with a permits answer; Q1 and Q2 have identical answers | `src/app/(site)/page.tsx` → `faq` |
| ☐ | Temporary FAQ answers awaiting approval (home Q3–Q6, all contact FAQs). FAQPage schema stays off until approved. | `src/app/(site)/page.tsx`, `src/app/(site)/contact/page.tsx` |
| ☐ | Unverified claims: "+2,000 לקוחות מרוצים", "+27 שנות ניסיון", licence claims | Stats on /, /projects, /contact |
| ☐ | Unique meta descriptions per page (all pages currently share the default) | Admin → עמודים ו-SEO |
| ☐ | Default OG share image (none yet) | Admin → הגדרות אתר → תמונת שיתוף |
| ☐ | Decide whether to link the blog from the navigation/footer (not linked today, design unchanged) | Code: `navLinks` in `src/lib/site.ts` |

## 3. Legal

| ☐ | Item | Location |
| --- | --- | --- |
| ☐ | **Missing privacy policy** — footer link points to `#`; the contact form consent checkbox refers to it; leads (PII) are now stored | Create page + link in `src/components/Footer.tsx` |
| ☐ | **Missing terms of use** — footer link points to `#` | Create page + link in `src/components/Footer.tsx` |
| ☐ | Lead data retention period and who may access leads (Israeli privacy law — confirm with client/counsel) | Policy + Supabase |
| ☐ | Cookie/consent approach before enabling ad pixels (Consent Mode default, banner if required) | Decision → GTM |

## 4. Tracking & operations

| ☐ | Item | Where |
| --- | --- | --- |
| ☐ | GTM container ID (GTM loads on Production only) | Admin → הגדרות אתר → מעקב |
| ☐ | GTM setup: GA4 tag with automatic page views OFF; triggers on `page_view`, `generate_lead`, `form_start`, `form_submit_error`, `phone_click`, `whatsapp_click`, `email_click`, `cta_click` | GTM |
| ☐ | Google Ads / Meta / TikTok / LinkedIn conversion tags on `generate_lead` (IDs available as dataLayer event `lookup_config`) | GTM |
| ☐ | Lead notifications — leads are only visible in Admin → לידים today (no email/WhatsApp/CRM push yet) | Decision |
| ☐ | Production domain: set "כתובת האתר" so canonicals/sitemap use it; redirect `*.vercel.app` to the domain in Vercel | Admin + Vercel |
| ☐ | Submit a real test lead on Production and delete it afterwards in Supabase | Manual |

## 5. Indexing (final step)

| ☐ | Item |
| --- | --- |
| ☐ | **Indexing is currently DISABLED.** All pages render `noindex, nofollow`. Preview and local builds are always `noindex` + `robots.txt Disallow: /`, regardless of the setting. |
| ☐ | After sections 1–4 are done: Admin → הגדרות אתר → "לאפשר אינדוקס" → save → verify the production page source shows `index, follow` → submit `/sitemap.xml` in Google Search Console. |
