"use server";

import { randomUUID } from "node:crypto";
import { z } from "zod";
import { t } from "@/lookup/admin/i18n";
import { requireAdmin } from "@/lookup/auth";
import { ACCEPTED_IMAGE_TYPES, IMAGE_EXTENSIONS, MAX_IMAGE_BYTES, MEDIA_BUCKET } from "@/lookup/media-rules";

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

  const extension = IMAGE_EXTENSIONS[parsed.data.contentType];
  const path = `uploads/${new Date().toISOString().slice(0, 7)}/${randomUUID()}.${extension}`;
  const storage = supabase.storage.from(MEDIA_BUCKET);
  const { data, error } = await storage.createSignedUploadUrl(path);
  if (error || !data) return { ok: false, message: t.media.failed(error?.message ?? "") };
  return { ok: true, path: data.path, token: data.token, publicUrl: storage.getPublicUrl(path).data.publicUrl };
}
