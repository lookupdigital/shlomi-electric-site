"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { formEntries, type FormState } from "@/lookup/admin/form-utils";
import { t } from "@/lookup/admin/i18n";
import { blockingItems } from "@/lookup/admin/readiness";
import { getSiteReport } from "@/lookup/admin/site-report";
import { requireAdmin } from "@/lookup/auth";
import { SITE_SETTINGS_TAG } from "@/lookup/settings";

async function setIndexing(enabled: boolean): Promise<string | null> {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.from("site_settings").update({ indexing_enabled: enabled }).eq("id", 1).select("id");
  if (error) return t.common.saveFailed(error.message);
  if (!data?.length) return t.common.noPermission;
  updateTag(SITE_SETTINGS_TAG);
  revalidatePath("/", "layout");
  return null;
}

/** Go live = enable indexing. Refused on the server unless every required launch check passes right now. */
export async function goLive(formData: FormData): Promise<FormState> {
  await requireAdmin();
  if (formEntries(formData).confirm !== "on") return { ok: false, message: t.launch.confirmRequired };

  const report = await getSiteReport();
  const blocking = blockingItems(report.checklist);
  if (blocking.length > 0) {
    return { ok: false, message: t.launch.goLiveBlocked(blocking.map((item) => t.launch.checks[item.id].label).join(", ")) };
  }

  const failure = await setIndexing(true);
  if (failure) return { ok: false, message: failure };
  redirect("/admin/launch?live=1");
}

/** Take offline = disable indexing (always allowed). */
export async function takeOffline() {
  const failure = await setIndexing(false);
  if (failure) redirect(`/admin/launch?error=${encodeURIComponent(failure)}`);
  redirect("/admin/launch?offline=1");
}
