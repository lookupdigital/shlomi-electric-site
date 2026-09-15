"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import type { FormState } from "@/lookup/admin/form-utils";
import { isSupabaseConfigured } from "@/lookup/env";
import { createSessionClient } from "@/lookup/supabase/server";

const credentials = z.object({ email: z.email().max(200), password: z.string().min(1).max(200) });

export async function signIn(formData: FormData): Promise<FormState> {
  if (!isSupabaseConfigured) return { ok: false, message: "Supabase עדיין לא מוגדר (.env.local / Vercel)." };
  const parsed = credentials.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { ok: false, message: "נא להזין אימייל וסיסמה" };

  const supabase = await createSessionClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { ok: false, message: "האימייל או הסיסמה שגויים" };
  redirect("/admin");
}

export async function signOut() {
  if (isSupabaseConfigured) {
    const supabase = await createSessionClient();
    await supabase.auth.signOut();
  }
  redirect("/admin/login");
}
