import "server-only";
import { t } from "@/lookup/admin/i18n";
import type { requireAdmin } from "@/lookup/auth";
import { supabaseUrl } from "@/lookup/env";
import { MEDIA_BUCKET, ownUploadPaths, referencedUploadPaths } from "@/lookup/media-rules";

type AdminClient = Awaited<ReturnType<typeof requireAdmin>>["supabase"];

const PAGE_SIZE = 1000;

/**
 * Where each uploaded file is used: site settings, page SEO and posts (all statuses, including rich-text content).
 * Throws when any source cannot be read completely — callers must never delete on an incomplete picture.
 */
export async function loadMediaUsage(supabase: AdminClient): Promise<Map<string, string[]>> {
  const usage = new Map<string, string[]>();
  const add = (text: string, label: string) => {
    for (const path of referencedUploadPaths(text)) usage.set(path, [...(usage.get(path) ?? []), label]);
  };

  const [settings, pages] = await Promise.all([
    supabase.from("site_settings").select("*"),
    supabase.from("page_seo").select("*"),
  ]);
  if (settings.error) throw new Error(`site_settings: ${settings.error.message}`);
  if (pages.error) throw new Error(`page_seo: ${pages.error.message}`);
  for (const row of settings.data) add(JSON.stringify(row), t.media.usedInSettings);
  for (const row of pages.data) add(JSON.stringify(row), t.media.usedInPage(row.path));

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("posts")
      .select("id,title,featured_image_url,og_image_url,content")
      .order("id")
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`posts: ${error.message}`);
    for (const post of data) add(JSON.stringify(post), t.media.usedInPost(post.title));
    if (data.length < PAGE_SIZE) break;
  }
  return usage;
}

/** Upload paths of this project's media bucket referenced by a row (or any value) before it changed. */
export function uploadsReferencedBy(value: unknown): string[] {
  return ownUploadPaths(JSON.stringify(value ?? null), supabaseUrl);
}

/**
 * Deletes uploads that an edit or deletion just stopped referencing, unless they are still used anywhere else.
 * Runs after the change is saved and never fails it: on any doubt the files are kept (they stay listed in Admin → Media).
 */
export async function removeUnreferencedUploads(supabase: AdminClient, candidates: string[]): Promise<void> {
  if (candidates.length === 0) return;
  try {
    const usage = await loadMediaUsage(supabase);
    const unused = candidates.filter((path) => !usage.has(path));
    if (unused.length === 0) return;
    const { error } = await supabase.storage.from(MEDIA_BUCKET).remove(unused);
    if (error) console.error("[media] cleanup failed:", error.message);
  } catch (error) {
    console.error("[media] cleanup skipped:", (error as Error).message);
  }
}
