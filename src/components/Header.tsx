"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import Button from "@/components/Button";
import { navLinks, site } from "@/lib/site";

export default function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-white">
      <div className="container-x flex h-16 items-center justify-between lg:h-20">
        <div className="flex items-center gap-12">
          <Link href="/" aria-label="דף הבית" onClick={close}>
            <Image src="/images/logo.png" alt={site.name} width={30} height={38} priority />
          </Link>
          <nav className="hidden items-center gap-8 font-heading text-[15px] font-semibold text-ink md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={pathname === link.href ? "page" : undefined}
                className="transition-colors hover:text-brand-dark"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="hidden items-center gap-6 md:flex">
          <a href={site.phoneHref} className="flex items-center gap-2 font-heading text-base font-bold text-ink">
            <Image src="/icons/phone.svg" alt="" width={18} height={18} />
            <span dir="ltr">{site.phoneDisplay}</span>
          </a>
          <Button href="/contact#contact-form" className="w-[166px]">
            קבלו הצעת מחיר
          </Button>
        </div>

        <button
          type="button"
          className="-me-2 grid size-11 place-items-center text-ink md:hidden"
          aria-label={open ? "סגירת תפריט" : "פתיחת תפריט"}
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen((v) => !v)}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </div>

      {open && (
        <div id="mobile-menu" className="border-t border-line bg-white md:hidden">
          <nav className="container-x flex flex-col gap-1 py-4 font-heading text-lg font-semibold text-ink">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={close}
                aria-current={pathname === link.href ? "page" : undefined}
                className="py-3"
              >
                {link.label}
              </Link>
            ))}
            <a href={site.phoneHref} className="flex items-center gap-2 py-3 font-bold">
              <Image src="/icons/phone.svg" alt="" width={18} height={18} />
              <span dir="ltr">{site.phoneDisplay}</span>
            </a>
            <div onClick={close} className="pt-2">
              <Button href="/contact#contact-form" className="w-full">
                קבלו הצעת מחיר
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
