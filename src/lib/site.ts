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

export type Review = {
  paragraphs: string[];
  name: string;
  role?: string;
  company: string;
};

// REAL CLIENT CONTENT — quoted verbatim from three signed recommendation letters (September 2026). Do not reword,
// shorten or paraphrase. Personal ID numbers that appeared in the original letters are deliberately omitted and
// must not be restored. The letters give no star rating, so never emit AggregateRating from this content.
export const reviews: Review[] = [
  {
    paragraphs: [
      "ברצוני להמליץ בחום על שלומי בוארון, אשר שימש כקבלן החשמל בפרויקטים שונים שביצע עבורי.",
      "במהלך עבודתנו המשותפת, שלומי הוכיח עצמו כאיש מקצוע מהמעלה הראשונה. הוא בעל ידע מקצועי רחב, מקפיד על ביצוע עבודה איכותית ומדויקת, תוך עמידה בכל הדרישות והסטנדרטים הנדרשים.",
      "מעבר למקצועיותו, שלומי מתאפיין באמינות גבוהה, יחס שירותי ואדיב, וזמינות מלאה לאורך כל שלבי הפרויקט. אחד הדברים הבולטים ביותר בעבודתו הוא עמידה בלוחות הזמנים שנקבעו מראש. הוא וצוותו מגיעים בזמן, מתנהל בצורה מסודרת ואחראית, ומקפיד לסיים את העבודות במועד שסוכם.",
      "שלומי ביצע עבורי מספר פרויקטים בהצלחה רבה, וכל אחד מהם הושלם לשביעות רצוני המלאה. בזכות המקצועיות, האחריות ורמת השירות הגבוהה שהוא מעניק, אני ממליץ עליו ללא כל היסוס לכל עבודות חשמל, בין אם מדובר בפרויקטים קטנים ובין אם בעבודות מורכבות והיקפיות.",
    ],
    name: "ענבי נתן",
    role: "מנהל מגדל ששון חוגי ONE",
    company: "קבוצת נכסי אריאל",
  },
  {
    paragraphs: [
      "הריני מאשר בזאת כי הקבלן שלומי בוארון מבצע עבורנו באופן בלעדי את כל עבודות החשמל כולל לוחות חשמל ותחזוקה שוטפת בכל הבניינים והנכסים שלנו החל משנת 2010 וכן את עבודות השיפוץ החל משנת 2022.",
      "ברצוני לציין לשבח את מקצועיותו הרבה של שלומי בוארון אשר אינה פוגעת במתן שרות באדיבות ובחיוך.",
    ],
    name: "ניר חוגי, עו״ד",
    company: "קבוצת ששון חוגי",
  },
  {
    paragraphs: [
      "שלומי היקר, בתום פרוייקט מורכב ומאתגר, ברצוני להודות מקרב לב.",
      "ההתנהלות מולך היתה באווירה טובה ובנעם. עמדת בזמנים והיית גמיש ומותאם לשינויים ולבקשות שהצגנו במהלך הפרוייקט.",
      "אין לי ספק שגם לפרוייקט הבא נרתום אותך.",
    ],
    name: "מרב בן יהודה",
    role: "מנהלת משרד",
    company: "נ.פינברג ושות׳ עורכי דין",
  },
];

export type Project = { image: string; category: string; title: string };

// MANDATORY PRE-LAUNCH REPLACEMENT — the projects and their images below are TEMPORARY DEMO CONTENT from the
// Figma template (not this business, not verified). They keep the Preview visually complete until the client's real
// projects and photos arrive, and must be replaced before Production (docs/launch-content-checklist.md).
// Never emit project structured data from this content.
export const projects: Project[] = [
  { image: "/images/project-crestview.png", category: "שחזור מבנה מסחרי", title: "המרכז הרפואי קרסטויו" },
  { image: "/images/project-harbor.png", category: "שיפוץ מקיף", title: "משרדי עורכי דין הארבור פוינט" },
  { image: "/images/project-meridian.png", category: "בנייה מלאה", title: "משרדי מרידיאן טק" },
];
