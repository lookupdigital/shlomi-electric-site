import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { signOut } from "@/lookup/admin/actions/auth";
import LoginForm from "@/lookup/admin/LoginForm";
import { secondaryButton } from "@/lookup/admin/styles";
import { Notice } from "@/lookup/admin/ui";
import { getAdminContext } from "@/lookup/auth";

export const metadata: Metadata = { title: "כניסה" };

export default async function AdminLoginPage() {
  const context = await getAdminContext();
  if (context.status === "admin") redirect("/admin");

  return (
    <main className="grid min-h-screen place-items-center px-5 py-10">
      <div className="flex w-full max-w-sm flex-col gap-6 rounded-xl border border-line bg-white p-8">
        <h1 className="font-heading text-2xl font-semibold text-ink">כניסה לניהול האתר</h1>

        {context.status === "unconfigured" && (
          <Notice tone="warning">
            Supabase עדיין לא מחובר. יש למלא את NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY ו-SUPABASE_SERVICE_ROLE_KEY
            ב-.env.local (מקומית) או ב-Vercel.
          </Notice>
        )}

        {context.status === "forbidden" && (
          <>
            <Notice tone="error">
              המשתמש <span dir="ltr">{context.user.email}</span> מחובר אך אינו מורשה לניהול. יש להוסיף אותו לטבלת admin_users.
            </Notice>
            <form action={signOut}>
              <button type="submit" className={secondaryButton}>
                התנתקות
              </button>
            </form>
          </>
        )}

        {context.status === "anonymous" && <LoginForm />}
      </div>
    </main>
  );
}
