import type { Metadata } from "next";
import type { ReactNode } from "react";
import { t } from "@/lookup/admin/i18n";

export const metadata: Metadata = {
  title: { default: t.nav.title, template: `%s | ${t.nav.title}` },
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return (
    <div dir={t.dir} className="min-h-full flex-1 bg-page">
      {children}
    </div>
  );
}
