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
