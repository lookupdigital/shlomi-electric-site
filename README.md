# אתר שלומי בארון - שירותי חשמל ועבודות בנייה ושיפוצים

אתר Next.js שנבנה לפי קובץ הפיגמה, עם ממשק ניהול (`/admin`). לפני עלייה לאוויר: `docs/launch-content-checklist.md`.

## העלאה ל-Vercel

### אפשרות א' — דרך GitHub (מומלץ, מתעדכן אוטומטית בכל שינוי)

1. פותחים ריפו חדש ב-GitHub ומעלים אליו את כל הקבצים שבתיקייה הזו.
2. נכנסים ל-https://vercel.com/new ומתחברים עם החשבון.
3. בוחרים את הריפו ולוחצים **Deploy**. אין צורך לשנות אף הגדרה — Vercel מזהה Next.js לבד.
4. בסיום מתקבל קישור לתצוגה (למשל `https://shlomi-electric-site.vercel.app`).

### אפשרות ב' — דרך הטרמינל (בלי GitHub)

מתוך התיקייה של הפרויקט:

```bash
npm install -g vercel@latest
vercel login
vercel --prod
```

עונים Enter על כל השאלות (ברירות המחדל מתאימות). בסיום יודפס קישור לאתר.

## הרצה מקומית

דורש Node.js 20 ומעלה.

```bash
npm install
npm run dev
```

ואז לפתוח את http://localhost:3000

## איפה משנים מה

| מה | קובץ |
| --- | --- |
| שם העסק, טלפון, וואטסאפ, מייל, כתובת, אזורי שירות | ממשק הניהול → הגדרות אתר |
| פרויקטים והמלצות (כרגע תוכן דמו זמני) | `src/lib/site.ts` |
| דף הבית | `src/app/(site)/page.tsx` |
| עמוד פרויקטים | `src/app/(site)/projects/page.tsx` |
| עמוד צור קשר | `src/app/(site)/contact/page.tsx` |
| צבעים ופונטים | `src/app/globals.css` |
| תמונות | `public/images` |

## מה עוד פתוח

- ההמלצות, הפרויקטים והתמונות הם תוכן דמו זמני — חובה להחליף לפני עלייה לאוויר.
- הפונטים המקוריים מהפיגמה (Fb Monopoly Heb, Fb Einstein) בתשלום; כרגע בשימוש Heebo ו-Assistant.
- הרשימה המלאה: `docs/launch-content-checklist.md`.
