import Link from "next/link";
import type { NavLink } from "@/components/SiteChrome";

type Props = {
  businessName: string;
  phoneDisplay: string;
  phoneHref: string;
  email: string;
  address: string;
  links: NavLink[];
};

/** Contact items render only when configured in /admin/settings — nothing falls back to demo values. */
export default function Footer({ businessName, phoneDisplay, phoneHref, email, address, links }: Props) {
  const hasContact = Boolean(phoneHref || email || address);
  return (
    <footer className="bg-coal text-white">
      <div className="container-x flex flex-col gap-10 pt-16 pb-10 lg:gap-[60px] lg:pt-20">
        <div className="flex flex-col gap-10 sm:flex-row sm:flex-wrap sm:gap-x-24">
          <p className="max-w-[320px] text-sm opacity-70">
            בנייה ושיפוץ מסחרי מקצועי בסטנדרט הגבוה ביותר. מהרעיון ועד למפתח, עם ראש שקט ובטחון מלא.
          </p>

          {hasContact && (
            <div className="flex flex-col items-start gap-3 text-sm">
              <p className="font-heading text-base font-bold">יצירת קשר</p>
              {phoneHref && (
                <a href={phoneHref} dir="ltr" className="opacity-70 transition-opacity hover:opacity-100">
                  {phoneDisplay}
                </a>
              )}
              {email && (
                <a href={`mailto:${email}`} className="opacity-70 transition-opacity hover:opacity-100">
                  {email}
                </a>
              )}
              {address && <p className="opacity-70">{address}</p>}
            </div>
          )}

          <nav className="flex flex-col items-start gap-3 text-sm" aria-label="ניווט תחתון">
            {links.map((link) => (
              <Link key={link.href} href={link.href} className="opacity-70 transition-opacity hover:opacity-100">
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="h-px bg-white/10" />

        <div className="flex flex-col-reverse gap-4 text-[13px] sm:flex-row sm:items-center sm:justify-between">
          <p className="opacity-50">{`© כל הזכויות שמורות ל${businessName}.`}</p>
          <div className="flex gap-6">
            <a href="#" className="opacity-50 transition-opacity hover:opacity-100">
              תנאי שימוש
            </a>
            <a href="#" className="opacity-50 transition-opacity hover:opacity-100">
              מדיניות פרטיות
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
