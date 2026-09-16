import Image from "next/image";
import Button from "@/components/Button";
import CtaSection from "@/components/CtaSection";
import Faq from "@/components/Faq";
import Stats from "@/components/Stats";
import { faqSchema, JsonLd } from "@/lookup/schema";
import { buildPageMetadata } from "@/lookup/seo";
import { siteConfig } from "@/site.config";

export function generateMetadata() {
  return buildPageMetadata({ path: "/contact", title: "צור קשר" });
}

// Answers use only confirmed facts (service area from siteConfig) and what the site itself offers — no prices,
// guarantees or response times. Distinct from the home page FAQ; emitted as FAQPage data.
const faq = [
  { q: "באילו אזורים אתם נותנים שירות?", a: `אזורי השירות שלנו: ${siteConfig.business.serviceArea}.` },
  { q: "איך אפשר ליצור איתכם קשר?", a: "אפשר להשאיר פרטים בטופס שבעמוד הזה, להתקשר או לשלוח הודעה ב-WhatsApp." },
  { q: "איך נקבעת הצעת המחיר?", a: "הצעת המחיר נקבעת לפי היקף העבודה וסוג העבודות הנדרשות." },
  { q: "אפשר לפרט על הפרויקט כבר בפנייה?", a: "כן. בטופס יש שדה הודעה שבו אפשר לתאר את הפרויקט." },
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
            <Button href="#contact-form" variant="outline" trackCta="contact_hero">
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
        formName="contact"
        title="ספרו לנו על הפרויקט שלכם."
        subtitle="ניצור איתכם קשר בהקדם כדי להבין את הצרכים שלכם ולהציע פתרון שמתאים בדיוק לפרויקט."
        withEmail
        withConsent
        submitLabel="שלחו פרטים"
      />

      {siteConfig.faq.structuredData && <JsonLd data={faqSchema(faq)} />}
      <Faq items={faq} />
    </>
  );
}
