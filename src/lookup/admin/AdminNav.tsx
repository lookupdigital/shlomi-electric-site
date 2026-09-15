import Link from "next/link";
import { signOut } from "@/lookup/admin/actions/auth";
import { t } from "@/lookup/admin/i18n";

const NAV = [
  { href: "/admin", label: t.nav.dashboard },
  { href: "/admin/settings", label: t.nav.settings },
  { href: "/admin/pages", label: t.nav.pages },
  { href: "/admin/posts", label: t.nav.posts },
  { href: "/admin/leads", label: t.nav.leads },
  { href: "/admin/redirects", label: t.nav.redirects },
];

const signOutButton = "rounded-md border border-white/20 px-3 py-1.5 text-xs font-semibold hover:bg-white/10";

export default function AdminNav({ email }: { email: string }) {
  return (
    <aside className="border-b border-line bg-coal text-white lg:sticky lg:top-0 lg:h-screen lg:w-60 lg:shrink-0 lg:border-b-0">
      <div className="flex h-full flex-col gap-4 p-4 lg:p-5">
        <div className="flex items-center justify-between gap-3 lg:flex-col lg:items-start">
          <p className="font-heading text-lg font-semibold">{t.nav.title}</p>
          <div className="flex items-center gap-3">
            <Link href="/" target="_blank" className="text-xs opacity-70 hover:opacity-100">
              {t.common.viewSite}
            </Link>
            {/* Mobile: sign-out is always reachable in the top bar. */}
            <form action={signOut} className="lg:hidden">
              <button type="submit" className={signOutButton}>
                {t.nav.signOut}
              </button>
            </form>
          </div>
        </div>
        <nav aria-label={t.nav.ariaLabel} className="-mx-1 flex gap-1 overflow-x-auto px-1 lg:flex-col">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="whitespace-nowrap rounded-md px-3 py-2 font-heading text-sm font-semibold opacity-80 hover:bg-white/10 hover:opacity-100"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <form action={signOut} className="mt-auto hidden flex-col gap-2 border-t border-white/10 pt-4 text-xs lg:flex">
          <span className="truncate opacity-60" dir="ltr">
            {email}
          </span>
          <button type="submit" className={`self-start ${signOutButton}`}>
            {t.nav.signOut}
          </button>
        </form>
      </div>
    </aside>
  );
}
