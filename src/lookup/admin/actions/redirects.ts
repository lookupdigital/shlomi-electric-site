"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { checkbox, formEntries, type FormState } from "@/lookup/admin/form-utils";
import { t } from "@/lookup/admin/i18n";
import { requireAdmin } from "@/lookup/auth";
import { findRedirectLoop, isValidDestination, isValidSourcePath, normalizePath } from "@/lookup/redirects";
import { siteConfig } from "@/site.config";

// Paths the proxy never handles — a redirect there would silently do nothing.
const CORE_PATHS = new Set(siteConfig.routes.corePages.map((page) => normalizePath(page.path)));
const UNSUPPORTED_SOURCE = /^\/(admin|api|_next|images|icons)(\/|$)|\.[A-Za-z0-9]+$/;

const r = t.redirects;

const redirectSchema = z.object({
  source_path: z.string().trim().refine(isValidSourcePath, r.invalidSource),
  destination: z.string().trim().refine(isValidDestination, r.invalidDestination),
  status_code: z.enum(["301", "302"]).transform(Number),
  active: checkbox,
});

export async function createRedirect(formData: FormData): Promise<FormState> {
  const { supabase } = await requireAdmin();
  const parsed = redirectSchema.safeParse(formEntries(formData));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? t.common.invalidData };

  const source_path = normalizePath(parsed.data.source_path);
  const destination = parsed.data.destination.startsWith("/")
    ? normalizePath(parsed.data.destination) + (parsed.data.destination.match(/\?.*$/)?.[0] ?? "")
    : parsed.data.destination;

  if (CORE_PATHS.has(source_path) || UNSUPPORTED_SOURCE.test(source_path)) return { ok: false, message: r.unsupportedSource };
  if (destination === source_path) return { ok: false, message: r.sameSourceAndDestination };

  if (parsed.data.active) {
    const loop = await detectLoop(supabase, { source_path, destination });
    if (loop) return { ok: false, message: r.loop(loop.join(" ← ")) };
  }

  const { error } = await supabase
    .from("redirects")
    .insert({ source_path, destination, status_code: parsed.data.status_code, active: parsed.data.active });
  if (error) return { ok: false, message: error.code === "23505" ? r.duplicate : t.common.saveFailed(error.message) };

  revalidatePath("/admin/redirects");
  return { ok: true, message: r.saved };
}

export async function toggleRedirect(formData: FormData) {
  const { supabase } = await requireAdmin();
  const parsed = z.object({ id: z.uuid(), activate: z.enum(["0", "1"]) }).safeParse(formEntries(formData));
  if (!parsed.success) redirect(`/admin/redirects?error=${encodeURIComponent(t.common.invalidData)}`);
  const activate = parsed.data.activate === "1";

  if (activate) {
    const { data: rule } = await supabase.from("redirects").select("source_path,destination").eq("id", parsed.data.id).single();
    if (rule) {
      const loop = await detectLoop(supabase, rule, parsed.data.id);
      if (loop) redirect(`/admin/redirects?error=${encodeURIComponent(r.loop(loop.join(" ← ")))}`);
    }
  }

  const { error } = await supabase.from("redirects").update({ active: activate }).eq("id", parsed.data.id);
  if (error) redirect(`/admin/redirects?error=${encodeURIComponent(t.common.saveFailed(error.message))}`);
  revalidatePath("/admin/redirects");
}

export async function deleteRedirect(formData: FormData) {
  const { supabase } = await requireAdmin();
  const parsed = z.object({ id: z.uuid() }).safeParse(formEntries(formData));
  if (!parsed.success) redirect(`/admin/redirects?error=${encodeURIComponent(t.common.invalidData)}`);
  const { error } = await supabase.from("redirects").delete().eq("id", parsed.data.id);
  if (error) redirect(`/admin/redirects?error=${encodeURIComponent(t.common.saveFailed(error.message))}`);
  revalidatePath("/admin/redirects");
}

type AdminClient = Awaited<ReturnType<typeof requireAdmin>>["supabase"];

async function detectLoop(supabase: AdminClient, candidate: { source_path: string; destination: string }, excludeId?: string) {
  let query = supabase.from("redirects").select("id,source_path,destination").eq("active", true);
  if (excludeId) query = query.neq("id", excludeId);
  const { data } = await query;
  return findRedirectLoop(data ?? [], candidate);
}
