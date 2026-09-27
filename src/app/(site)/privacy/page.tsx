import LegalPage from "@/components/LegalPage";
import { buildPageMetadata, registeredRoute } from "@/lookup/seo";
import { getSiteSettings } from "@/lookup/settings";

export function generateMetadata() {
  return buildPageMetadata(registeredRoute("/privacy"));
}

// DRAFT — pending the client's confirmation and legal review (docs/launch-content-checklist.md).
// The stated practices describe what this site actually does: the lead form stores submissions in Supabase,
// Cloudflare Turnstile guards the form, and the analytics/advertising pixels run only when configured in the admin.
export default async function PrivacyPage() {
  const settings = await getSiteSettings();

  return (
    <LegalPage title="מדיניות פרטיות" updated="24 בספטמבר 2026">
      <p>
        {settings.businessName} (להלן: &quot;אנחנו&quot; או &quot;העסק&quot;) מכבד את פרטיות המשתמשים באתר
        ומחויב להגן על המידע הנמסר דרכו. מסמך זה מסביר איזה מידע נאסף, כיצד נעשה בו שימוש, וכיצד ניתן לממש את
        הזכויות שלכם. השימוש באתר מהווה הסכמה למדיניות זו.
      </p>

      <h2>1. המידע שאנחנו אוספים</h2>
      <p>
        <strong>מידע שאתם מוסרים ביוזמתכם:</strong> בעת מילוי טופס יצירת קשר באתר אנו אוספים שם מלא, מספר טלפון,
        כתובת דוא&quot;ל (אם מולאה), סוג הפרויקט ותוכן ההודעה.
      </p>
      <p>
        <strong>מידע שנאסף אוטומטית:</strong> כתובת ה-IP שלכם, המשמשת לאימות שהפנייה אינה אוטומטית ולמניעת
        הצפות; מקור ההגעה לאתר ועמוד הנחיתה; ובמידה ומופעלים כלי מדידה — נתוני שימוש כלליים כגון סוג הדפדפן,
        סוג המכשיר והעמודים שנצפו.
      </p>

      <h2>2. שימוש בקבצי Cookies</h2>
      <p>האתר עושה שימוש בקבצי Cookies לצורך תפעולו התקין ולניתוח השימוש בו:</p>
      <ul>
        <li>
          <strong>חיוניים:</strong> נדרשים לפעולת האתר ולאבטחת הטפסים.
        </li>
        <li>
          <strong>מדידה וניתוח:</strong> מסייעים להבין כיצד משתמשים באתר.
        </li>
        <li>
          <strong>שיווק:</strong> משמשים להצגת פרסום רלוונטי, ככל שכלים אלה מופעלים.
        </li>
      </ul>
      <p>ניתן לחסום או למחוק קבצי Cookies דרך הגדרות הדפדפן, אך הדבר עשוי לפגוע בחלק מתפקודי האתר.</p>

      <h2>3. מטרות השימוש במידע</h2>
      <ul>
        <li>מענה לפניות שהתקבלו דרך האתר ומתן הצעות מחיר</li>
        <li>יצירת קשר עם מתעניינים בשירותי העסק</li>
        <li>הגנה על האתר מפני שימוש לרעה ופניות אוטומטיות</li>
        <li>שיפור האתר והשירות</li>
        <li>עמידה בדרישות הדין</li>
      </ul>

      <h2>4. העברת מידע לצדדים שלישיים</h2>
      <p>
        איננו מוכרים מידע אישי ואיננו מעבירים אותו לצדדים שלישיים, למעט לספקי השירות המפעילים עבורנו את האתר,
        וכן כאשר הדבר נדרש על פי דין או לצורך הגנה על זכויותינו. ספקי השירות שלנו:
      </p>
      <ul>
        <li>
          <strong>Vercel</strong> — אחסון והפעלת האתר
        </li>
        <li>
          <strong>Supabase</strong> — שמירת הפניות שהתקבלו בטופס
        </li>
        <li>
          <strong>Cloudflare Turnstile</strong> — הגנה על הטפסים מפני בוטים
        </li>
        <li>
          <strong>Make</strong> — העברת התראה על פנייה חדשה לעסק
        </li>
        <li>
          <strong>Google Analytics ו-Google Tag Manager</strong> — מדידה וניתוח שימוש, ככל שמופעלים
        </li>
        <li>
          <strong>פיקסלים פרסומיים</strong> (Meta, TikTok, LinkedIn) — מדידת פרסום, ככל שמופעלים
        </li>
      </ul>

      <h2>5. שמירת המידע ואבטחתו</h2>
      <p>
        המידע נשמר אצל ספקי השירות שלנו, למשך הזמן הנדרש למטרה שלשמה נאסף ובכפוף לחובות שמירה על פי דין.
        התעבורה באתר מוצפנת (HTTPS), והגישה לפניות מוגבלת לגורמים מורשים בלבד. חרף אמצעי האבטחה, לא ניתן
        להבטיח הגנה מוחלטת מפני גישה בלתי מורשית.
      </p>

      <h2>6. הזכויות שלכם</h2>
      <p>בהתאם לחוק הגנת הפרטיות, התשמ&quot;א-1981, עומדות לכם הזכויות הבאות:</p>
      <ul>
        <li>לעיין במידע האישי השמור אצלנו</li>
        <li>לבקש לתקן מידע שגוי או לא מדויק</li>
        <li>לבקש למחוק מידע, בכפוף לחובות החלות עלינו על פי דין</li>
        <li>לבקש להפסיק לקבל פניות שיווקיות</li>
      </ul>
      <p>למימוש הזכויות ניתן לפנות אלינו בפרטים שבסוף העמוד.</p>

      <h2>7. קטינים</h2>
      <p>
        האתר אינו מיועד לשימוש על ידי קטינים מתחת לגיל 18, ואיננו אוספים ביודעין מידע אישי מקטינים. אם נודע לנו
        על מידע כזה, הוא יימחק.
      </p>

      <h2>8. שינויים במדיניות</h2>
      <p>
        אנו רשאים לעדכן מדיניות זו מעת לעת. המדיניות המעודכנת תפורסם בעמוד זה, ותאריך העדכון האחרון יופיע
        בראשו.
      </p>

      <h2>9. יצירת קשר</h2>
      <p>לכל שאלה או בקשה בנוגע למדיניות הפרטיות ניתן לפנות אלינו:</p>
      <ul>
        {settings.phone && <li>טלפון: {settings.phone}</li>}
        {settings.email && <li>דוא&quot;ל: {settings.email}</li>}
        {settings.address && <li>כתובת: {settings.address}</li>}
      </ul>
    </LegalPage>
  );
}
