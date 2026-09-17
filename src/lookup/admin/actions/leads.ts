"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { formEntries, type FormState } from "@/lookup/admin/form-utils";
import { t } from "@/lookup/admin/i18n";
import { requireAdmin } from "@/lookup/auth";
import { LEAD_STATUSES } from "@/lookup/leads/filters";
import { deliverLeadNotification, isLeadWebhookConfigured } from "@/lookup/leads/notify";

export async function updateLeadStatus(formData: FormData): Promise<FormState> {
  const { supabase } = await requireAdmin();
  const parsed = z.object({ id: z.uuid(), status: z.enum(LEAD_STATUSES) }).safeParse(formEntries(formData));
  if (!parsed.success) return { ok: false, message: t.common.invalidData };

  // RLS + a column-level grant allow admins to change only `status`.
  const { data, error } = await supabase.from("leads").update({ status: parsed.data.status }).eq("id", parsed.data.id).select("id");
  if (error) return { ok: false, message: t.common.saveFailed(error.message) };
  if (!data?.length) return { ok: false, message: t.common.noPermission };

  revalidatePath("/admin/leads", "layout");
  revalidatePath("/admin");
  return { ok: true, message: t.leads.statusSaved };
}

export async function resendLeadNotification(formData: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = z.object({ id: z.uuid() }).safeParse(formEntries(formData));
  if (!parsed.success) return { ok: false, message: t.common.invalidData };
  if (!isLeadWebhookConfigured()) return { ok: false, message: t.leads.webhookNotConfigured };

  const result = await deliverLeadNotification(parsed.data.id);
  revalidatePath(`/admin/leads/${parsed.data.id}`);
  return result.ok ? { ok: true, message: t.leads.resendSent } : { ok: false, message: t.leads.resendFailed(result.error ?? "") };
}

/** Permanent deletion for privacy / data-removal requests. Requires typing the confirmation word. */
export async function deleteLead(formData: FormData): Promise<FormState> {
  const { supabase } = await requireAdmin();
  const parsed = z.object({ id: z.uuid(), confirm: z.string() }).safeParse(formEntries(formData));
  if (!parsed.success) return { ok: false, message: t.common.invalidData };
  if (parsed.data.confirm.trim() !== t.leads.deleteConfirmWord) return { ok: false, message: t.leads.deleteMismatch };

  const { data, error } = await supabase.from("leads").delete().eq("id", parsed.data.id).select("id");
  if (error) return { ok: false, message: t.common.saveFailed(error.message) };
  if (!data?.length) return { ok: false, message: t.common.noPermission };

  revalidatePath("/admin/leads", "layout");
  revalidatePath("/admin");
  redirect("/admin/leads?deleted=1");
}
