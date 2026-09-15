// פרטי יצירת קשר — כרגע ערכי דמו מהפיגמה. להחלפה במספרים האמיתיים של הלקוח.
export const site = {
  name: "שלומי שירותי חשמל וקבלנות",
  phoneDisplay: "03-555-1234",
  phoneHref: "tel:+97235551234",
  whatsappHref: "https://wa.me/972500000000",
  email: "info@nidbach.co.il",
  address: "רחוב הברזל 30, תל אביב",
};

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
