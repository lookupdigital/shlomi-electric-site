// Client-specific page content. Business contact details live in /admin/settings; navigation comes from
// siteConfig.routes (src/site.config.ts).

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

// MANDATORY PRE-LAUNCH REPLACEMENT — reviews, projects and their images below are TEMPORARY DEMO CONTENT from the
// Figma template (not this business, not verified). They keep the Preview visually complete until the client's real
// reviews, projects and photos arrive, and must be replaced before Production (docs/launch-content-checklist.md).
// Never emit Review/AggregateRating or project structured data from this content.
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
