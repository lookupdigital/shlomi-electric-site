import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import AdminNav from "@/lookup/admin/AdminNav";
import { getAdminContext } from "@/lookup/auth";

// Every page below also calls requireAdmin() itself: layouts are not re-run on client navigation,
// so the page (and each Server Action) is where authorization is enforced.
export default async function ProtectedAdminLayout({ children }: { children: ReactNode }) {
  const context = await getAdminContext();
  if (context.status !== "admin") redirect("/admin/login");

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <AdminNav email={context.user.email ?? ""} />
      <main className="min-w-0 flex-1 px-5 py-8 lg:px-10">{children}</main>
    </div>
  );
}
