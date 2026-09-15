import Link from "next/link";
import { signOut } from "@/lookup/admin/actions/auth";

const NAV = [
  { href: "/admin", label: "דשבורד" },
  { href: "/admin/settings", label: "הגדרות אתר" },
  { href: "/admin/pages", label: "עמודים ו-SEO" },
  { href: "/admin/posts", label: "פוסטים" },
  { href: "/admin/leads", label: "לידים" },
  { href: "/admin/redirects", label: "הפניות" },
];

export default function AdminNav({ email }: { email: string }) {
  return (
    <aside className="border-b border-line bg-coal text-white lg:sticky lg:top-0 lg:h-screen lg:w-60 lg:shrink-0 lg:border-b-0">
      <div className="flex h-full flex-col gap-4 p-4 lg:p-5">
        <div className="flex items-center justify-between gap-3 lg:flex-col lg:items-start">
          <p className="font-heading text-lg font-semibold">ניהול האתר</p>
          <Link href="/" target="_blank" className="text-xs opacity-70 hover:opacity-100">
            צפייה באתר ↗
          </Link>
        </div>
        <nav aria-label="ניווט ניהול" className="flex gap-1 overflow-x-auto lg:flex-col">
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
          <button type="submit" className="self-start rounded-md border border-white/20 px-3 py-1.5 font-semibold hover:bg-white/10">
            התנתקות
          </button>
        </form>
      </div>
    </aside>
  );
}
