"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { checkbox, formEntries, type FormState } from "@/lookup/admin/form-utils";
import { requireAdmin } from "@/lookup/auth";
import { findRedirectLoop, isValidDestination, isValidSourcePath, normalizePath } from "@/lookup/redirects";

// Paths the proxy never handles (core pages, internals, files) — a redirect there would silently do nothing.
const UNSUPPORTED_SOURCE = /^\/(projects|contact)?$|^\/(admin|api|_next|images|icons)(\/|$)|\.[A-Za-z0-9]+$/;

const redirectSchema = z.object({
  source_path: z.string().trim().refine(isValidSourcePath, "נתיב מקור חייב להתחיל ב-/"),
  destination: z.string().trim().refine(isValidDestination, "יעד חייב להיות נתיב שמתחיל ב-/ או כתובת https:// מלאה"),
  status_code: z.enum(["301", "302"]).transform(Number),
  active: checkbox,
});

export async function createRedirect(formData: FormData): Promise<FormState> {
  const { supabase } = await requireAdmin();
  const parsed = redirectSchema.safeParse(formEntries(formData));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "נתונים לא תקינים" };

  const source_path = normalizePath(parsed.data.source_path);
  const destination = parsed.data.destination.startsWith("/")
    ? normalizePath(parsed.data.destination) + (parsed.data.destination.match(/\?.*$/)?.[0] ?? "")
    : parsed.data.destination;

  if (UNSUPPORTED_SOURCE.test(source_path)) {
    return { ok: false, message: "לא ניתן להגדיר הפניה מעמודי הליבה, מאזור הניהול או מקבצים." };
  }
  if (destination === source_path) return { ok: false, message: "המקור והיעד זהים." };

  if (parsed.data.active) {
    const loop = await detectLoop(supabase, { source_path, destination });
    if (loop) return { ok: false, message: `ההפניה תיצור לולאה: ${loop.join(" ← ")}` };
  }

  const { error } = await supabase
    .from("redirects")
    .insert({ source_path, destination, status_code: parsed.data.status_code, active: parsed.data.active });
  if (error) {
    return { ok: false, message: error.code === "23505" ? "כבר קיימת הפניה מהנתיב הזה." : `השמירה נכשלה: ${error.message}` };
  }

  revalidatePath("/admin/redirects");
  return { ok: true, message: "ההפניה נשמרה. היא תיכנס לתוקף תוך כדקה." };
}

export async function toggleRedirect(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = z.uuid().parse(formData.get("id"));
  const activate = formData.get("activate") === "1";

  if (activate) {
    const { data: rule } = await supabase.from("redirects").select("source_path,destination").eq("id", id).single();
    if (rule) {
      const loop = await detectLoop(supabase, rule, id);
      if (loop) redirect(`/admin/redirects?error=${encodeURIComponent(`לולאה: ${loop.join(" ← ")}`)}`);
    }
  }

  await supabase.from("redirects").update({ active: activate }).eq("id", id);
  revalidatePath("/admin/redirects");
}

export async function deleteRedirect(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = z.uuid().parse(formData.get("id"));
  await supabase.from("redirects").delete().eq("id", id);
  revalidatePath("/admin/redirects");
}

type AdminClient = Awaited<ReturnType<typeof requireAdmin>>["supabase"];

async function detectLoop(
  supabase: AdminClient,
  candidate: { source_path: string; destination: string },
  excludeId?: string,
) {
  let query = supabase.from("redirects").select("id,source_path,destination").eq("active", true);
  if (excludeId) query = query.neq("id", excludeId);
  const { data } = await query;
  return findRedirectLoop(data ?? [], candidate);
}
