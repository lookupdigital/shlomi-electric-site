"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { formEntries } from "@/lookup/admin/form-utils";
import { t } from "@/lookup/admin/i18n";
import { loadMediaUsage } from "@/lookup/admin/media-usage";
import { requireAdmin } from "@/lookup/auth";
import {
  ACCEPTED_IMAGE_TYPES,
  IMAGE_EXTENSIONS,
  isManagedUploadPath,
  MAX_IMAGE_BYTES,
  MEDIA_BUCKET,
  newUploadPath,
} from "@/lookup/media-rules";

export type UploadTicket = { ok: true; path: string; token: string; publicUrl: string } | { ok: false; message: string };

const uploadSchema = z.object({
  contentType: z.string().refine((type) => ACCEPTED_IMAGE_TYPES.includes(type), t.media.unsupportedType),
  size: z.number().int().positive().max(MAX_IMAGE_BYTES, t.media.tooLarge),
});

/**
 * Issues a one-time signed upload token for the signed-in admin (storage RLS applies to the admin's session).
 * The browser then uploads directly to Storage without holding any session credentials.
 */
export async function createImageUpload(input: { contentType: string; size: number }): Promise<UploadTicket> {
  const { supabase } = await requireAdmin();
  const parsed = uploadSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? t.common.invalidData };

  const path = newUploadPath(IMAGE_EXTENSIONS[parsed.data.contentType], new Date(), randomUUID());
  const storage = supabase.storage.from(MEDIA_BUCKET);
  const { data, error } = await storage.createSignedUploadUrl(path);
  if (error || !data) return { ok: false, message: t.media.failed(error?.message ?? "") };
  return { ok: true, path: data.path, token: data.token, publicUrl: storage.getPublicUrl(path).data.publicUrl };
}

const mediaPage = (query: Record<string, string>) => `/admin/media?${new URLSearchParams(query)}`;

/**
 * Permanently deletes one uploaded file with the admin's session (storage RLS applies).
 * Only paths created by the uploader are accepted, and a file that is still in use is never deleted.
 */
export async function deleteMedia(formData: FormData) {
  const { supabase } = await requireAdmin();
  const path = formEntries(formData).path ?? "";
  if (!isManagedUploadPath(path)) redirect(mediaPage({ error: t.media.invalidPath }));

  let usage: Map<string, string[]>;
  try {
    usage = await loadMediaUsage(supabase);
  } catch (error) {
    redirect(mediaPage({ error: t.media.usageUnavailable((error as Error).message) }));
  }
  const usedIn = usage.get(path);
  if (usedIn) redirect(mediaPage({ error: t.media.inUse(usedIn.join(", ")) }));

  const { data, error } = await supabase.storage.from(MEDIA_BUCKET).remove([path]);
  if (error) redirect(mediaPage({ error: t.media.deleteFailed(error.message) }));
  if (!data?.length) redirect(mediaPage({ error: t.media.notFound }));

  revalidatePath("/admin/media");
  redirect(mediaPage({ deleted: "1" }));
}
