import Image from "next/image";
import CtaSection from "@/components/CtaSection";
import ProjectCard from "@/components/ProjectCard";
import Reviews from "@/components/Reviews";
import Stats from "@/components/Stats";
import { projects } from "@/lib/site";
import { buildPageMetadata } from "@/lookup/seo";

export function generateMetadata() {
  return buildPageMetadata({ path: "/projects", title: "פרויקטים" });
}

const collage = [
  { src: "/images/projects-hero-3.png", alt: "וילה עם בריכה בתאורת ערב" },
  { src: "/images/projects-hero-2.png", alt: "מטבח מעוצב עם אי" },
  { src: "/images/projects-hero-1.png", alt: "בניין משרדים מזכוכית" },
];

// בפיגמה כל 6 הכרטיסים זהים (דמו) — בינתיים מוצגים הפרויקטים הקיימים פעמיים.
const grid = [...projects, ...projects];

export default function ProjectsPage() {
  return (
    <>
      <section className="border-b border-line bg-offwhite">
        <div className="container-x flex flex-col gap-10 py-12 lg:flex-row lg:items-center lg:gap-12 lg:py-24">
          <div className="flex flex-col gap-4 lg:w-[600px] lg:shrink-0">
            <h1 className="h1 text-navy">הפרויקטים שלנו מדברים בעד עצמם.</h1>
            <p className="subheading text-muted">
              משרדים, עבודות גמר, חשמל, גבס, ושיפוצים שבוצעו עבור עסקים ולקוחות פרטיים – עם הקפדה על איכות, סדר ותוצאה
              ברמה הגבוהה ביותר.
            </p>
          </div>
          <div className="flex h-[260px] w-full gap-3 sm:h-[400px] sm:gap-4 lg:flex-1">
            {collage.map((img) => (
              <div key={img.src} className="relative flex-1 overflow-hidden rounded-xl">
                <Image src={img.src} alt={img.alt} fill priority sizes="(min-width: 1024px) 200px, 33vw" className="object-cover" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="container-x flex flex-col gap-12 py-16 lg:py-24">
          <h2 className="h2 text-center text-navy">עבודות נבחרות</h2>
          <div className="grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {grid.map((project, i) => (
              <ProjectCard key={i} project={project} />
            ))}
          </div>
        </div>
      </section>

      <Stats
        title="המספרים שמאחורי העבודה שלנו"
        className="py-16 lg:py-20"
        items={[
          { value: "+27", label: "שנות ניסיון" },
          { value: "+2,000", label: "לקוחות מרוצים" },
          { value: "100%", label: "מחויבות לכל פרויקט" },
          { value: "קבלן רשום", label: "וחשמלאי מוסמך" },
        ]}
      />

      <Reviews />

      <CtaSection
        id="quote-form"
        formName="projects_cta"
        title="רוצים לראות איך הפרויקט שלכם יכול להיראות?"
        subtitle="נשמח להגיע, להבין את הצרכים שלכם ולהציע פתרון מקצועי שמתאים בדיוק אליכם."
      />
    </>
  );
}
