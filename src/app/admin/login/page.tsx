import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { signOut } from "@/lookup/admin/actions/auth";
import { t } from "@/lookup/admin/i18n";
import LoginForm from "@/lookup/admin/LoginForm";
import { secondaryButton } from "@/lookup/admin/styles";
import { Notice } from "@/lookup/admin/ui";
import { getAdminContext } from "@/lookup/auth";

export const metadata: Metadata = { title: t.auth.pageTitle };

export default async function AdminLoginPage() {
  const context = await getAdminContext();
  if (context.status === "admin") redirect("/admin");

  return (
    <main className="grid min-h-screen place-items-center px-5 py-10">
      <div className="flex w-full max-w-sm flex-col gap-6 rounded-xl border border-line bg-white p-8">
        <h1 className="font-heading text-2xl font-semibold text-ink">{t.auth.heading}</h1>

        {context.status === "unconfigured" && <Notice tone="warning">{t.auth.unconfigured}</Notice>}

        {context.status === "forbidden" && (
          <>
            <Notice tone="error">{t.auth.forbidden(context.user.email ?? "")}</Notice>
            <form action={signOut}>
              <button type="submit" className={secondaryButton}>
                {t.nav.signOut}
              </button>
            </form>
          </>
        )}

        {context.status === "anonymous" && <LoginForm />}
      </div>
    </main>
  );
}
