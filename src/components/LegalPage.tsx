import type { ReactNode } from "react";

/** Shared shell for the legal pages (accessibility statement, privacy policy, terms of use). */
export default function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <>
      <section className="border-b border-line bg-offwhite">
        <div className="container-x flex flex-col gap-3 py-12 lg:py-16">
          <h1 className="h1 text-navy">{title}</h1>
          <p className="text-sm text-muted">עודכן לאחרונה: {updated}</p>
        </div>
      </section>

      <section>
        <div className="container-x py-12 lg:py-16">
          <div className="rich-text mx-auto max-w-[860px]">{children}</div>
        </div>
      </section>
    </>
  );
}
