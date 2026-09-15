import type { Metadata } from "next";
import Image from "next/image";
import Button from "@/components/Button";
import CtaSection from "@/components/CtaSection";
import Faq from "@/components/Faq";
import Stats from "@/components/Stats";

export const metadata: Metadata = {
  title: "צור קשר",
};

// שאלות מהפיגמה; התשובות — טקסט זמני לאישור הלקוח.
const faq = [
  { q: "האם הפגישה הראשונה כרוכה בתשלום?", a: "לא. שיחת ההיכרות והפגישה הראשונה בשטח הן ללא עלות וללא התחייבות." },
  { q: "תוך כמה זמן חוזרים אליי?", a: "אנחנו חוזרים לכל פנייה בהקדם, בדרך כלל עוד באותו יום עסקים." },
  { q: "האם אתם עובדים גם בפרויקטים קטנים?", a: "כן. אנחנו מלווים פרויקטים בכל גודל — מתיקון נקודתי ועד הקמת משרד מלא." },
  { q: "האם אפשר לבצע רק עבודות חשמל?", a: "בהחלט. ניתן להזמין עבודות חשמל בלבד, המבוצעות על ידי חשמלאי מוסמך." },
  { q: "כמה זמן לוקח לקבל הצעת מחיר?", a: "לאחר הפגישה בשטח נשלח הצעת מחיר מסודרת ומפורטת תוך זמן קצר." },
  { q: "האם אתם עובדים גם מחוץ למרכז?", a: "כן. צרו איתנו קשר ונבדוק יחד את פרטי הפרויקט והמיקום." },
];

export default function ContactPage() {
  return (
    <>
      <section className="bg-offwhite">
        <div className="container-x flex flex-col gap-10 py-12 lg:flex-row lg:items-center lg:gap-12 lg:py-24">
          <div className="flex flex-col items-start gap-8 lg:w-[600px] lg:shrink-0">
            <div className="flex flex-col gap-4">
              <h1 className="h1 text-navy">בואו נדבר על הפרויקט שלכם.</h1>
              <p className="subheading text-muted">
                בין אם אתם מתכננים שיפוץ משרד, עבודות חשמל או פרויקט גמר מלא – נשמח להכיר את הצרכים שלכם ולהציע פתרון
                מקצועי, מסודר ומדויק.
              </p>
            </div>
            <Button href="#contact-form" variant="outline">
              צרו קשר
            </Button>
          </div>
          <div className="flex h-[260px] w-full gap-3 sm:h-[360px] sm:gap-4 lg:flex-1">
            <div className="relative flex-1 overflow-hidden rounded-xl">
              <Image src="/images/contact-hero-2.png" alt="מגדלי משרדים" fill priority sizes="(min-width: 1024px) 310px, 50vw" className="object-cover" />
            </div>
            <div className="relative flex-1 overflow-hidden rounded-xl">
              <Image src="/images/contact-hero-1.png" alt="חדר ישיבות מעוצב" fill priority sizes="(min-width: 1024px) 310px, 50vw" className="object-cover" />
            </div>
          </div>
        </div>
      </section>

      <Stats
        className="py-14 lg:py-20"
        items={[
          { value: "+27", label: "שנות ניסיון" },
          { value: "+2,000", label: "לקוחות מרוצים" },
          { value: "קבלן רשום", label: "וחשמלאי מוסמך" },
          { value: "שירות אישי", label: "ושקיפות מלאה" },
        ]}
      />

      <CtaSection
        id="contact-form"
        title="ספרו לנו על הפרויקט שלכם."
        subtitle="ניצור איתכם קשר בהקדם כדי להבין את הצרכים שלכם ולהציע פתרון שמתאים בדיוק לפרויקט."
        withEmail
        withConsent
        submitLabel="שלחו פרטים"
      />

      <Faq items={faq} />
    </>
  );
}
