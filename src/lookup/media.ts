import { createClient } from "@supabase/supabase-js";
import { createImageUpload } from "@/lookup/admin/actions/media";
import { t } from "@/lookup/admin/i18n";
import { supabaseAnonKey, supabaseUrl } from "@/lookup/env";
import { ACCEPTED_IMAGE_TYPES, MAX_IMAGE_BYTES, MEDIA_BUCKET } from "@/lookup/media-rules";

export { ACCEPTED_IMAGE_TYPES } from "@/lookup/media-rules";

/**
 * Uploads an image for the signed-in admin: the server checks the admin session and issues a signed upload
 * token; the file goes straight to Supabase Storage. No auth cookie or token is ever readable by page scripts.
 */
export async function uploadImage(file: File): Promise<string> {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) throw new Error(t.media.unsupportedType);
  if (file.size > MAX_IMAGE_BYTES) throw new Error(t.media.tooLarge);

  const ticket = await createImageUpload({ contentType: file.type, size: file.size });
  if (!ticket.ok) throw new Error(ticket.message);

  const storage = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  }).storage;
  const { error } = await storage
    .from(MEDIA_BUCKET)
    .uploadToSignedUrl(ticket.path, ticket.token, file, { contentType: file.type, cacheControl: "31536000" });
  if (error) throw new Error(t.media.failed(error.message));
  return ticket.publicUrl;
}
