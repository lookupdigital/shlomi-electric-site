import { createBrowserSupabase } from "@/lookup/supabase/browser";

export const MEDIA_BUCKET = "media";
export const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
  "image/x-icon",
  "image/vnd.microsoft.icon",
];
const MAX_BYTES = 5 * 1024 * 1024;

/** Uploads an image to Supabase Storage as the signed-in admin and returns its public URL. */
export async function uploadImage(file: File): Promise<string> {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) throw new Error("סוג קובץ לא נתמך (JPG, PNG, WebP, AVIF, GIF, ICO)");
  if (file.size > MAX_BYTES) throw new Error("הקובץ גדול מ-5MB");

  const extension = (file.name.split(".").pop() ?? "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "img";
  const path = `uploads/${new Date().toISOString().slice(0, 7)}/${crypto.randomUUID()}.${extension}`;
  const supabase = createBrowserSupabase();
  const { error } = await supabase.storage
    .from(MEDIA_BUCKET)
    .upload(path, file, { contentType: file.type, cacheControl: "31536000", upsert: false });
  if (error) throw new Error(`ההעלאה נכשלה: ${error.message}`);
  return supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path).data.publicUrl;
}
