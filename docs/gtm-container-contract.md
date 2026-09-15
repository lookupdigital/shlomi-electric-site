# GTM container contract

The site pushes a small, fixed set of events to `window.dataLayer` (`src/lookup/analytics/events.ts`). Google Tag
Manager is the only marketing script the site loads; every vendor tag is configured **in GTM** against this contract.

GTM loads only when the environment is production (`LOOKUP_SITE_ENV` / `VERCEL_ENV`) or `LOOKUP_GTM_DEBUG=1`, and
never on `/admin`. The container ID is set in **Admin → Site settings → Tracking**.

## 1. Events

| Event | When | Parameters |
| --- | --- | --- |
| `lookup_config` | Once per page load, before any other event | `ga4_measurement_id`, `meta_pixel_id`, `tiktok_pixel_id`, `linkedin_partner_id` (only those configured in the admin) |
| `page_view` | Initial load and every client-side navigation (once per URL) | `page_path`, `page_location` (URL with only campaign parameters kept) |
| `form_start` | First interaction with a lead form | `form_name`, `page_path` |
| `generate_lead` | **Only after the server confirmed the lead was stored** | `form_name`, `page_path`, `lead_type`, `event_id` |
| `form_submit_error` | Submission rejected or failed | `form_name`, `page_path`, `error_type` (`validation` · `server` · `network` · `rate_limited` · `verification`) |
| `phone_click` | Click on a `tel:` link | `page_path`, `link_location` (`header` · `content` · `footer`), `cta_name` (optional) |
| `whatsapp_click` | Click on a WhatsApp link | same as `phone_click` |
| `email_click` | Click on a `mailto:` link | same as `phone_click` |
| `cta_click` | Click on a tracked CTA that is **not** a phone/WhatsApp/email link | `page_path`, `cta_name`, `link_location` |

A click fires **one** event: a WhatsApp button that is also a tracked CTA sends `whatsapp_click` with `cta_name`,
not an extra `cta_click`.

`form_name` values on this site: `home_hero`, `home_cta`, `projects_cta`, `contact`, `blog_post`.

`event_id` is the lead's `submission_id` (UUID, not personal data). Use it as the deduplication key for any future
server-side conversion (Meta Conversions API, Google Ads enhanced/offline conversions, TikTok Events API).

## 2. Consent Mode v2

Before GTM loads, the site pushes `gtag('consent', 'default', …)` for `ad_storage`, `ad_user_data`,
`ad_personalization` and `analytics_storage` with the value chosen in **Admin → Site settings → Consent Mode**
(`granted` or `denied`), plus `wait_for_update: 500`.

A future consent banner / CMP must call:
```js
window.lookupConsent.update({ ad_storage: "granted", ad_user_data: "granted", ad_personalization: "granted", analytics_storage: "granted" });
```
In GTM, keep **Consent Overview** enabled and rely on Google tags' built-in consent checks; for non-Google tags
(Meta, TikTok, LinkedIn) add "Require additional consent: ad_storage".

## 3. Variables to create

| Variable | Type | Data Layer Variable Name |
| --- | --- | --- |
| DLV - form_name | Data Layer Variable (v2) | `form_name` |
| DLV - lead_type | Data Layer Variable | `lead_type` |
| DLV - event_id | Data Layer Variable | `event_id` |
| DLV - page_path | Data Layer Variable | `page_path` |
| DLV - page_location | Data Layer Variable | `page_location` |
| DLV - link_location | Data Layer Variable | `link_location` |
| DLV - cta_name | Data Layer Variable | `cta_name` |
| DLV - error_type | Data Layer Variable | `error_type` |
| DLV - ga4_measurement_id | Data Layer Variable | `ga4_measurement_id` |
| DLV - meta_pixel_id | Data Layer Variable | `meta_pixel_id` |
| DLV - tiktok_pixel_id | Data Layer Variable | `tiktok_pixel_id` |
| DLV - linkedin_partner_id | Data Layer Variable | `linkedin_partner_id` |

Triggers: one **Custom Event** trigger per event name above (e.g. `CE - generate_lead`), plus `CE - lookup_config`.

## 4. GA4

1. **Google tag** — Tag ID `{{DLV - ga4_measurement_id}}`, trigger `CE - lookup_config`.
   Configuration parameter **`send_page_view` = `false`**.
2. **GA4 Event `page_view`** — trigger `CE - page_view`; parameters `page_location = {{DLV - page_location}}`,
   `page_path = {{DLV - page_path}}`.
3. **GA4 Event `generate_lead`** — trigger `CE - generate_lead`; parameters `form_name`, `lead_type`, `event_id`.
   Mark `generate_lead` as a **key event** in GA4.
4. Optional GA4 events for `phone_click`, `whatsapp_click`, `email_click`, `cta_click`, `form_start`, `form_submit_error`
   with their parameters.

### Duplicate page_view prevention
- The site sends exactly one `page_view` event per URL (including client-side navigations).
- Therefore: `send_page_view = false` on the Google tag, **and** in GA4 → Data streams → Enhanced measurement →
  Page views → *Advanced settings* → **turn off "Page changes based on browser history events"**.
- Do **not** add a "History Change" trigger for page views.

## 5. Google Ads
1. **Conversion Linker** — trigger: All Pages (or `CE - lookup_config`).
2. **Google Ads Conversion Tracking** — Conversion ID/Label from the Ads account; trigger `CE - generate_lead`;
   **Transaction ID = `{{DLV - event_id}}`** (deduplicates repeated fires and future offline/enhanced conversions).
3. Optional secondary conversions for `phone_click` / `whatsapp_click` (not the primary lead goal).

## 6. Meta (Facebook) Pixel
1. **Pixel base code** (Custom HTML or a community template) with `fbq('init', {{DLV - meta_pixel_id}})` and
   `fbq('track', 'PageView')` — trigger `CE - page_view`.
2. **Lead** — trigger `CE - generate_lead`: `fbq('track', 'Lead', { content_name: {{DLV - form_name}} }, { eventID: {{DLV - event_id}} })`.
   The `eventID` is what a future Conversions API event must reuse for deduplication.
3. Optional `Contact` event on `CE - phone_click` / `CE - whatsapp_click`.

## 7. TikTok Pixel
1. **Base code** with `ttq.load({{DLV - tiktok_pixel_id}})` and `ttq.page()` — trigger `CE - page_view`.
2. **SubmitForm** (or `Lead`) — trigger `CE - generate_lead`: `ttq.track('SubmitForm', {}, { event_id: {{DLV - event_id}} })`.

## 8. LinkedIn Insight Tag
1. **Insight Tag** with partner ID `{{DLV - linkedin_partner_id}}` — trigger `CE - lookup_config`.
2. Conversion — trigger `CE - generate_lead` (`window.lintrk('track', { conversion_id: <id> })`).

## 9. PII rules (mandatory)
- The dataLayer never contains name, phone, email, message or free-text form input. `sanitizeEvent()` drops
  unknown keys and any value that looks like an email or phone number.
- `page_location` keeps only `utm_*`, `gclid`, `gbraid`, `wbraid`, `fbclid`, `ttclid`.
- Do **not** create GTM variables that read form fields, DOM text or URL parameters other than the above.
- Enhanced conversions / Conversions API with hashed identifiers must be implemented **server-side**, not in GTM.

## 10. QA checklist
1. Deploy a preview with `LOOKUP_GTM_DEBUG=1`, open GTM **Preview**.
2. Load the home page with `?utm_source=test&gclid=test`: expect `lookup_config` → `page_view` (exactly one).
3. Navigate to /projects: exactly one additional `page_view`.
4. Click the WhatsApp button: exactly one `whatsapp_click` (with `cta_name`), no `cta_click`.
5. Submit a lead with an invalid phone: `form_submit_error` (`validation`), no `generate_lead`.
6. Submit a valid lead: exactly one `generate_lead` with an `event_id`; GA4 DebugView shows one event.
7. Confirm no tag reads personal data (Tag Assistant → Variables).
