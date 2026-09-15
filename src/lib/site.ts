import type { SiteDefaults } from "@/lookup/settings-model";

// Client-specific configuration for this site. Business details below are fallbacks: values saved in
// /admin/settings take precedence. The contact details are still the Figma demo values — see
// docs/launch-content-checklist.md.
export const siteDefaults: SiteDefaults = {
  businessName: "שלומי שירותי חשמל ועבודות בנייה וקבלנות",
  siteName: "שלומי שירותי חשמל וקבלנות",
  phone: "03-555-1234",
  whatsapp: "972500000000",
  email: "info@nidbach.co.il",
  address: "רחוב הברזל 30, תל אביב",
  logoUrl: "/images/logo.png",
  defaultMetaDescription:
    "מעל 27 שנות ניסיון בשיפוץ, הקמה ועבודות גמר למשרדים ועסקים. קבלן רשום, חשמלאי מוסמך וליווי מלא – משלב התכנון ועד למסירת הפרויקט.",
};

/** Public static pages — used by the sitemap and the admin "Pages" SEO screen. */
export const publicPages: { path: string; label: string; title?: string }[] = [
  { path: "/", label: "דף הבית" },
  { path: "/projects", label: "פרויקטים", title: "פרויקטים" },
  { path: "/contact", label: "צור קשר", title: "צור קשר" },
];

export const navLinks = [
  { href: "/", label: "בית" },
  { href: "/projects", label: "פרויקטים" },
  { href: "/contact", label: "צור קשר" },
];

export const projectTypes = [
  "עבודות חשמל",
  "הקמת משרדים",
  "שיפוץ משרדים",
  "עבודות גמר",
  "אינסטלציה",
  "עבודות גבס",
  "אחר",
];

export type Review = { quote: string; name: string; role: string };

// בפיגמה כל ההמלצות זהות (טקסט דמו) — 5 המלצות לפי 5 הנקודות בקרוסלה.
export const reviews: Review[] = Array.from({ length: 5 }, () => ({
  quote: "עבדנו עם שלושה קבלנים לפני נדבך. אף אחד לא התקרב לרמת הארגון והליווי שלהם.",
  name: "דוד אלדן",
  role: "מנכ״ל, קבוצת אולדן",
}));

export type Project = { image: string; category: string; title: string };

export const projects: Project[] = [
  { image: "/images/project-crestview.png", category: "שחזור מבנה מסחרי", title: "המרכז הרפואי קרסטויו" },
  { image: "/images/project-harbor.png", category: "שיפוץ מקיף", title: "משרדי עורכי דין הארבור פוינט" },
  { image: "/images/project-meridian.png", category: "בנייה מלאה", title: "משרדי מרידיאן טק" },
];
