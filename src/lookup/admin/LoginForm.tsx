"use client";

import { signIn } from "@/lookup/admin/actions/auth";
import AdminForm from "@/lookup/admin/AdminForm";
import { t } from "@/lookup/admin/i18n";

export default function LoginForm() {
  return (
    <AdminForm action={signIn} submitLabel={t.auth.submit} variant="inline" className="gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="font-heading text-sm font-bold text-ink">{t.auth.email}</span>
        <input name="email" type="email" required autoComplete="username" dir="ltr" className="field" />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="font-heading text-sm font-bold text-ink">{t.auth.password}</span>
        <input name="password" type="password" required autoComplete="current-password" dir="ltr" className="field" />
      </label>
      <p className="text-xs text-muted">{t.auth.sessionNote}</p>
    </AdminForm>
  );
}
