import Image from "next/image";
import Button from "@/components/Button";
import CtaSection from "@/components/CtaSection";
import Faq from "@/components/Faq";
import LeadForm from "@/components/LeadForm";
import ProjectCard from "@/components/ProjectCard";
import Reviews from "@/components/Reviews";
import Stats from "@/components/Stats";
import { projects } from "@/lib/site";
import { faqSchema, JsonLd } from "@/lookup/schema";
import { buildPageMetadata } from "@/lookup/seo";
import { getSiteSettings } from "@/lookup/settings";
import { whatsappHref } from "@/lookup/settings-model";
import { siteConfig } from "@/site.config";

export function generateMetadata() {
  return buildPageMetadata({ path: "/" });
}

const services = [
  { icon: "lamp-desk", title: "שיפוץ משרדים", text: "התאמת משרדים קיימים לצרכים החדשים של העסק." },
  { icon: "drafting-compass", title: "הקמת משרדים", text: "ביצוע מלא משלב ההריסה ועד למסירה." },
  { icon: "hard-hat", title: "עבודות חשמל", text: "עבודות חשמל על ידי חשמלאי מוסמך." },
  { icon: "expand", title: "עבודות גבס", text: "מחיצות, תקרות ועיצוב חללים." },
  { icon: "briefcase", title: "אינסטלציה", text: "פתרונות מלאים כחלק מהפרויקט." },
  { icon: "list-todo", title: "עבודות גמר", text: "צבע, ריצוף, גימורים וכל מה שביניהם." },
];

const reasons = [
  "ניסיון של מעל 27 שנה",
  "קבלן רשום וחשמלאי מוסמך",
  "ניהול מלא של הפרויקט",
  "עמידה בלוחות זמנים",
  "שקיפות מלאה ושירות אישי לאורך כל הדרך",
  "עבודה נקייה ומסודרת",
];

const steps = ["שיחת היכרות", "פגישה בשטח", "הצעת מחיר מסודרת", "תחילת עבודה", "מסירת הפרויקט"];

// Answers use only facts confirmed by the client (experience, customers, registered contractor, certified
// electrician) and the services listed above — no prices, guarantees or response times. Emitted as FAQPage data.
const faq = [
  { q: "אילו עבודות אתם מבצעים?", a: "שיפוץ והקמת משרדים, עבודות חשמל, עבודות גבס, אינסטלציה ועבודות גמר." },
  { q: "כמה ניסיון יש לכם?", a: "מעל 27 שנות ניסיון, ויותר מ-2,000 לקוחות." },
  { q: "האם אתם קבלן רשום?", a: "כן. אנחנו קבלן רשום, ועבודות החשמל מבוצעות על ידי חשמלאי מוסמך." },
  { q: "כמה זמן לוקח פרויקט?", a: "משך העבודה תלוי בהיקף הפרויקט ובסוג העבודות הנדרשות." },
];

export default async function Home() {
  const settings = await getSiteSettings();
  const whatsapp = whatsappHref(settings.whatsapp, siteConfig.phone);
  return (
    <>
      {/* Hero */}
      <section className="bg-offwhite">
        <div className="container-x flex flex-col items-center gap-10 py-12 xl:min-h-[800px] xl:flex-row xl:gap-4 xl:py-10">
          <div className="flex w-full flex-col items-center gap-8 text-center text-navy xl:flex-1">
            <div className="flex flex-col items-center gap-4">
              <h1 className="h1">
                פרויקט אחד.
                <br />
                כתובת אחת. אחריות אחת.
              </h1>
              <p className="subheading max-w-[576px] opacity-90">
                מעל 27 שנות ניסיון בשיפוץ, הקמה ועבודות גמר למשרדים ועסקים. קבלן רשום, חשמלאי מוסמך וליווי מלא – משלב
                התכנון ועד למסירת הפרויקט.
              </p>
            </div>
            {whatsapp && (
              <Button href={whatsapp} variant="outline" trackCta="hero_whatsapp">
                שוחחו איתנו ב-WhatsApp
              </Button>
            )}
          </div>

          <div className="relative flex w-full items-center justify-center overflow-hidden rounded-2xl px-4 py-10 sm:px-[89px] sm:py-[96px] xl:max-w-[634px] xl:flex-1">
            <Image
              src="/images/hero-office.png"
              alt=""
              fill
              priority
              sizes="(min-width: 1280px) 634px, 100vw"
              className="object-cover"
            />
            <LeadForm formName="home_hero" className="relative w-full max-w-[436px] shadow-[0_0_2.5px_rgba(0,0,0,0.25)]" />
          </div>
        </div>
      </section>

      <Stats
        items={[
          { value: "+27", label: "שנות ניסיון" },
          { value: "+2,000", label: "לקוחות מרוצים" },
          { value: "קבלן רשום", label: "בעל רישיון בתוקף" },
          { value: "חשמלאי מוסמך", label: "רישיון משרד העבודה" },
        ]}
      />

      {/* The problem */}
      <section className="bg-white">
        <div className="container-x flex flex-col gap-10 py-16 lg:flex-row lg:items-center lg:gap-16 lg:py-20">
          <div className="flex flex-1 flex-col gap-6">
            <h2 className="h2 text-navy">שיפוץ לא צריך להפוך לכאב ראש.</h2>
            <div className="body-text text-graphite/80">
              <p>רוב האנשים חוששים מאותם הדברים:</p>
              <ul className="list-disc ps-6">
                <li>קבלנים שלא עומדים בזמנים.</li>
                <li>בעלי מקצוע שלא מתואמים ביניהם.</li>
                <li>חריגות בתקציב.</li>
                <li>עבודה שפוגעת בשגרה.</li>
              </ul>
            </div>
            <p className="font-heading text-base font-semibold text-navy">לכן אנחנו עובדים אחרת.</p>
          </div>
          <div className="relative h-[260px] w-full shrink-0 overflow-hidden rounded-xl sm:h-[380px] lg:w-1/2 xl:w-[620px]">
            <Image src="/images/problem.png" alt="לפני ואחרי שיפוץ משרד" fill sizes="(min-width: 1024px) 620px, 100vw" className="object-cover" />
          </div>
        </div>
      </section>

      {/* Our solution */}
      <section>
        <div className="container-x flex flex-col gap-10 py-16 lg:flex-row lg:items-center lg:gap-16 lg:py-20">
          <div className="flex flex-1 flex-col gap-6">
            <h2 className="h2">כל בעלי המקצוע. חברה אחת. אחריות אחת.</h2>
            <p className="body-text text-[#535659]">
              במקום להתנהל מול מספר בעלי מקצוע שונים, אתם עובדים מול גורם אחד שמנהל את כל הפרויקט מתחילתו ועד סופו.
            </p>
          </div>
          <div className="relative h-[260px] w-full overflow-hidden rounded-xl sm:h-[380px] lg:order-first lg:flex-1">
            <Image src="/images/solution.png" alt="מנהל פרויקט ומהנדסת בשטח" fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="bg-white">
        <div className="container-x flex flex-col gap-12 py-16 lg:py-20">
          <h2 className="h2 text-center">כל השירותים - תחת ניהול אחד</h2>
          <div className="grid gap-x-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <div
                key={service.title}
                className="flex flex-col gap-4 rounded-xl bg-white p-8 shadow-[0_4px_12px_rgba(22,38,61,0.08)]"
              >
                <span className="self-end rounded-lg bg-cream p-3">
                  <Image src={`/icons/${service.icon}.svg`} alt="" width={24} height={24} />
                </span>
                <div className="flex flex-col gap-2">
                  <h3 className="font-heading text-xl font-semibold leading-[1.3] text-ink">{service.title}</h3>
                  <p className="text-[15px] leading-[1.7] text-muted">{service.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why us */}
      <section>
        <div className="container-x flex flex-col gap-10 py-16 lg:flex-row lg:gap-16 lg:py-20">
          <h2 className="h2 flex-1">למה בוחרים לעבוד איתנו?</h2>
          <ul className="flex flex-col gap-5 lg:w-[632px]">
            {reasons.map((reason) => (
              <li key={reason} className="flex items-center gap-3 font-heading text-base font-semibold text-ink">
                <span className="rounded p-1.5">
                  <Image src="/icons/check.svg" alt="" width={14} height={14} />
                </span>
                {reason}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Work process */}
      <section className="bg-graphite text-offwhite">
        <div className="container-x flex flex-col gap-12 py-16 lg:py-20">
          <h2 className="h2 text-center">כך נראה תהליך העבודה איתנו</h2>
          <ol className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:flex lg:items-center lg:gap-4">
            {steps.map((step, i) => (
              <li key={step} className="contents">
                {i > 0 && (
                  <span aria-hidden="true" className="hidden h-0.5 w-[35px] shrink-0 bg-mint lg:block" />
                )}
                <div className="flex justify-center lg:flex-1 lg:justify-start">
                  <div className="flex w-[180px] flex-col items-center gap-3">
                    <span className="grid size-12 place-items-center rounded-full bg-mint font-heading text-lg font-semibold text-brand">
                      {i + 1}
                    </span>
                    <span className="text-center font-heading text-base font-semibold">{step}</span>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Selected projects */}
      <section>
        <div className="container-x flex flex-col items-center gap-12 py-16 lg:py-20">
          <h2 className="h2 text-center">כמה מהפרויקטים שביצענו</h2>
          <div className="grid w-full gap-x-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <ProjectCard key={project.title} project={project} />
            ))}
          </div>
          <Button href="/projects" variant="outline" trackCta="home_more_projects">
            לצפייה בעוד פרויקטים
          </Button>
        </div>
      </section>

      <Reviews />

      {siteConfig.faq.structuredData && <JsonLd data={faqSchema(faq)} />}
      <Faq items={faq} defaultOpen={[0, 1]} />

      <CtaSection
        id="quote-form"
        formName="home_cta"
        title="יש לכם פרויקט שמתוכנן בקרוב?"
        subtitle="נשמח להכיר את הצרכים שלכם ולהציע פתרון מקצועי שמותאם בדיוק לעסק שלכם."
      />
    </>
  );
}
