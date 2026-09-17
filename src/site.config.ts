import { defineSiteConfig } from "@/lookup/config";

// Client-specific configuration consumed by the reusable infrastructure in src/lookup.
// Business contact details are intentionally NOT here: they live in /admin/settings (database).
export const siteConfig = defineSiteConfig({
  identity: { siteName: "שלומי בארון - שירותי חשמל ועבודות בנייה ושיפוצים" },
  locale: { htmlLang: "he", dir: "rtl", bcp47: "he-IL", ogLocale: "he_IL", timeZone: "Asia/Jerusalem" },
  phone: { countryCallingCode: "972", nationalTrunkPrefix: "0" },
  // Fallback only — the service area is edited in Admin → Site settings. Keep in sync with the confirmed value.
  business: { serviceArea: "בעיקר גוש דן, וכן אזורים סמוכים בצפון ובדרום" },
  schema: { businessTypes: ["Electrician", "GeneralContractor"] },
  routes: {
    corePages: [
      { path: "/", label: "דף הבית", navLabel: "בית" },
      { path: "/projects", label: "פרויקטים", title: "פרויקטים" },
      { path: "/contact", label: "צור קשר", title: "צור קשר" },
    ],
    blog: { path: "/blog", label: "בלוג", title: "בלוג" },
  },
  leads: {
    leadType: "quote_request",
    rateLimit: { maxSubmissions: 5, windowSeconds: 600 },
    messages: {
      nameRequired: "נא למלא שם מלא",
      nameTooLong: "השם ארוך מדי",
      phoneInvalid: "מספר הטלפון אינו תקין",
      emailInvalid: "כתובת האימייל אינה תקינה",
      consentRequired: "יש לאשר יצירת קשר בהתאם למדיניות הפרטיות",
      serverError: "לא הצלחנו לשלוח את הפרטים. נסו שוב בעוד רגע או התקשרו אלינו.",
      rateLimited: "נשלחו יותר מדי פניות בזמן קצר. נסו שוב בעוד כמה דקות או התקשרו אלינו.",
      verificationFailed: "לא הצלחנו לאמת את הטופס. רעננו את הדף ונסו שוב.",
    },
  },
  branding: { logoUrl: "/images/logo.png", ogBackground: "#1c2e49", ogAccent: "#deac44" },
  faq: {
    // The FAQ answers use only confirmed business facts and the services shown on the site, and every answer is
    // rendered on the page. Turn this off again if unconfirmed answers are added.
    structuredData: true,
  },
  admin: { sessionMaxAgeSeconds: 12 * 60 * 60 },
});
