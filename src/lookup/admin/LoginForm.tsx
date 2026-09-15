"use client";

import { signIn } from "@/lookup/admin/actions/auth";
import AdminForm from "@/lookup/admin/AdminForm";

export default function LoginForm() {
  return (
    <AdminForm action={signIn} submitLabel="כניסה" className="gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="font-heading text-sm font-bold text-ink">אימייל</span>
        <input name="email" type="email" required autoComplete="username" dir="ltr" className="field" />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="font-heading text-sm font-bold text-ink">סיסמה</span>
        <input name="password" type="password" required autoComplete="current-password" dir="ltr" className="field" />
      </label>
    </AdminForm>
  );
}
