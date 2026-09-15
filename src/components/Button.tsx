import Link from "next/link";
import type { ReactNode } from "react";

const base =
  "inline-flex h-[46px] items-center justify-center whitespace-nowrap rounded-lg px-6 font-heading text-base font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

const variants = {
  primary: "bg-brand text-white hover:bg-brand-dark",
  outline: "border-2 border-navy text-navy hover:bg-navy hover:text-white",
};

type Props = {
  href: string;
  variant?: keyof typeof variants;
  className?: string;
  children: ReactNode;
};

export default function Button({ href, variant = "primary", className = "", children }: Props) {
  const cls = `${base} ${variants[variant]} ${className}`;

  if (/^(https?:|tel:|mailto:)/.test(href)) {
    const newTab = href.startsWith("http");
    return (
      <a
        href={href}
        className={cls}
        {...(newTab ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      >
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={cls}>
      {children}
    </Link>
  );
}
