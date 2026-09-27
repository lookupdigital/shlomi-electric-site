// Upload rules shared by the browser uploader and the server action that issues upload tokens.

export const MEDIA_BUCKET = "media";

/** Extension is derived from the verified content type, never from the uploaded file name. */
export const IMAGE_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
  "image/x-icon": "ico",
  "image/vnd.microsoft.icon": "ico",
};

export const ACCEPTED_IMAGE_TYPES = Object.keys(IMAGE_EXTENSIONS);

/** Matches the storage bucket's file_size_limit. */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export const UPLOADS_FOLDER = "uploads";

/** Storage path for a new admin upload: uploads/<YYYY-MM>/<uuid>.<ext>. */
export function newUploadPath(extension: string, date: Date, id: string): string {
  return `${UPLOADS_FOLDER}/${date.toISOString().slice(0, 7)}/${id}.${extension}`;
}

// Exactly the shape newUploadPath produces. Admin deletion accepts nothing else, so no other bucket path can be removed.
const UPLOAD_PATH_SOURCE = String.raw`uploads/\d{4}-\d{2}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(?:jpg|png|webp|avif|gif|ico)`;
const UPLOAD_PATH = new RegExp(`^${UPLOAD_PATH_SOURCE}$`);

export function isManagedUploadPath(path: string): boolean {
  return UPLOAD_PATH.test(path);
}

/** Every upload path mentioned anywhere in `text` (any host or URL form): used to decide what is still referenced. */
export function referencedUploadPaths(text: string): Set<string> {
  return new Set(text.match(new RegExp(UPLOAD_PATH_SOURCE, "g")) ?? []);
}

/** Upload paths that `text` references through this project's public media URL: the only candidates for removal. */
export function ownUploadPaths(text: string, supabaseUrl: string): string[] {
  if (!supabaseUrl) return [];
  const prefix = `${supabaseUrl.replace(/\/+$/, "")}/storage/v1/object/public/${MEDIA_BUCKET}/`.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const matches = text.matchAll(new RegExp(`${prefix}(${UPLOAD_PATH_SOURCE})`, "g"));
  return [...new Set([...matches].map((match) => match[1]))];
}
