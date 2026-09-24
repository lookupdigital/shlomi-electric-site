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

export type ProjectImage = { src: string; alt: string };

export type Project = {
  slug: string;
  title: string;
  /** Gold line above the title. Rendered only when set — left empty until the client confirms the scope of work. */
  category?: string;
  /** First image is the card cover. Source files: "תמונות פרויקטים" in the repo root. */
  images: ProjectImage[];
};

// REAL CLIENT PROJECTS — photographs supplied by the client (September 2026).
export const projects: Project[] = [
  {
    slug: "sason-hogi",
    title: "קבוצת ששון חוגי",
    images: [
      { src: "/images/projects/sason-hogi/1.jpg", alt: "לובי הקבלה במשרדי קבוצת ששון חוגי, עם דלפק קבלה ופרקט כהה" },
      { src: "/images/projects/sason-hogi/2.jpg", alt: "פינת עבודה וישיבה מול חלונות במשרדי קבוצת ששון חוגי" },
      { src: "/images/projects/sason-hogi/3.jpg", alt: "חדר ישיבות עם שולחן ארוך ומסך במשרדי קבוצת ששון חוגי" },
    ],
  },
  {
    slug: "dani-levy",
    title: "דני לוי תקשורת",
    images: [
      { src: "/images/projects/dani-levy/1.jpg", alt: "פינת אוכל מול חלונות פנורמיים במשרדי דני לוי תקשורת" },
      { src: "/images/projects/dani-levy/2.jpg", alt: "מסדרון עם פינות ישיבה ותמונות ממוסגרות במשרדי דני לוי תקשורת" },
      { src: "/images/projects/dani-levy/3.jpg", alt: "חדר עם ספרייה ושולחן ישיבות במשרדי דני לוי תקשורת" },
      { src: "/images/projects/dani-levy/4.jpg", alt: "אזור הקבלה ועמדת העבודה במשרדי דני לוי תקשורת" },
    ],
  },
  {
    slug: "sightec",
    title: "SIGHTEC",
    images: [
      { src: "/images/projects/sightec/1.jpg", alt: "פינת ישיבה מול חלונות פנורמיים במשרדי SIGHTEC" },
      { src: "/images/projects/sightec/2.jpg", alt: "אופן ספייס עם עמדות עבודה במשרדי SIGHTEC" },
      { src: "/images/projects/sightec/3.jpg", alt: "מטבחון עם לוגו החברה במשרדי SIGHTEC" },
    ],
  },
  {
    slug: "biolight",
    title: "BioLight",
    images: [
      { src: "/images/projects/biolight/1.jpg", alt: "משרד עם מחיצות זכוכית ופינת המתנה במשרדי BioLight" },
      { src: "/images/projects/biolight/2.jpg", alt: "חדר עבודה מאחורי מחיצת זכוכית במשרדי BioLight" },
      { src: "/images/projects/biolight/3.jpg", alt: "חדר עבודה מול חלונות עם נוף עירוני במשרדי BioLight" },
      { src: "/images/projects/biolight/4.jpg", alt: "מסדרון עם תמונות על הקירות במשרדי BioLight" },
    ],
  },
  {
    slug: "reveal-security",
    title: "RevealSecurity",
    images: [
      { src: "/images/projects/reveal-security/1.jpg", alt: "פינת המתנה מוארת עם ספות במשרדי RevealSecurity" },
      { src: "/images/projects/reveal-security/2.jpg", alt: "חדר ישיבות עם שולחן ארוך במשרדי RevealSecurity" },
      { src: "/images/projects/reveal-security/3.jpg", alt: "פינת ישיבה עם ספות ושולחנות עגולים במשרדי RevealSecurity" },
      { src: "/images/projects/reveal-security/4.jpg", alt: "חדר עבודה עם שולחן וכיסאות במשרדי RevealSecurity" },
    ],
  },
  {
    slug: "dan-hai-law",
    title: "משרד עורכי דין דן חי ושות׳",
    images: [
      { src: "/images/projects/dan-hai-law/1.jpg", alt: "אזור הקבלה וחדר ישיבות מאחורי קיר זכוכית במשרד עורכי דין דן חי ושות׳" },
      { src: "/images/projects/dan-hai-law/2.jpg", alt: "חדר עבודה במשרד עורכי דין דן חי ושות׳" },
      { src: "/images/projects/dan-hai-law/3.jpg", alt: "מסדרון המשרד במשרד עורכי דין דן חי ושות׳" },
      { src: "/images/projects/dan-hai-law/4.jpg", alt: "אופן ספייס עם עמדות עבודה במשרד עורכי דין דן חי ושות׳" },
    ],
  },
];

/** The three projects shown on the home page, in this order. The /projects page shows all of them. */
export const featuredProjects: Project[] = ["sason-hogi", "dani-levy", "sightec"].map(
  (slug) => projects.find((project) => project.slug === slug)!,
);
