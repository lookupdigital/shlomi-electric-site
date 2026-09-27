"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { checkbox, firstIssue, formEntries, httpUrl, imageUrl, optional, type FormState } from "@/lookup/admin/form-utils";
import { t } from "@/lookup/admin/i18n";
import { removeUnreferencedUploads, uploadsReferencedBy } from "@/lookup/admin/media-usage";
import { isManagedUploadPath } from "@/lookup/media-rules";
import { writeWithSocialSeoFallback } from "@/lookup/post-schema";
import { requireAdmin } from "@/lookup/auth";
import { POSTS_TAG } from "@/lookup/posts";
import { SLUG_PATTERN, slugify } from "@/lookup/slug";
import type { Json } from "@/lookup/supabase/database.types";

const docJson = z
  .string()
  .max(500_000, t.posts.contentTooLong)
  .transform((value, ctx) => {
    try {
      const doc = JSON.parse(value);
      if (doc?.type === "doc" && Array.isArray(doc.content)) return doc as Json;
    } catch {
      // fall through
    }
    ctx.addIssue({ code: "custom", message: t.posts.invalidContent });
    return z.NEVER;
  });

const postSchema = z.object({
  id: optional(z.uuid()),
  title: z.string().trim().min(1, t.posts.titleRequired).max(200),
  slug: optional(z.string().max(120)),
  excerpt: optional(z.string().max(500)),
  category: optional(z.string().max(80)),
  author: optional(z.string().max(120)),
  status: z.enum(["draft", "published"]),
  published_at: optional(z.iso.datetime({ offset: true })),
  featured_image_url: optional(imageUrl),
  featured_image_alt: optional(z.string().max(200)),
  content: docJson,
  meta_title: optional(z.string().max(200)),
  meta_description: optional(z.string().max(500)),
  canonical_url: optional(httpUrl),
  og_title: optional(z.string().max(200)),
  og_description: optional(z.string().max(500)),
  og_image_url: optional(imageUrl),
  robots_index: checkbox,
  robots_follow: checkbox,
  // The post version (updated_at) the editor loaded; a save based on an older version is rejected, never merged.
  base_updated_at: optional(z.string().max(64)),
  // Uploads the post referenced at its last explicit save. Draft autosave may already have removed a reference, so
  // the stored row alone no longer shows it; these are only candidates — cleanup still deletes nothing referenced.
  previous_uploads: optional(z.string().max(20_000)),
});

/** Columns that can reference uploaded images (content holds rich-text image nodes). */
const POST_IMAGE_COLUMNS = "featured_image_url,og_image_url,content";

export async function savePost(formData: FormData): Promise<FormState> {
  const { supabase } = await requireAdmin();
  const parsed = postSchema.safeParse(formEntries(formData));
  if (!parsed.success) return { ok: false, message: firstIssue(parsed.error, { title: t.posts.fields.title, slug: "Slug", ...t.posts.labels }) };

  const { id, base_updated_at: baseUpdatedAt, previous_uploads: previousUploadsField, ...fields } = parsed.data;
  const slug = slugify(fields.slug || fields.title);
  if (!SLUG_PATTERN.test(slug)) return { ok: false, message: t.posts.invalidSlug };

  const record = {
    ...fields,
    slug,
    published_at: fields.status === "published" ? (fields.published_at ?? new Date().toISOString()) : fields.published_at,
  };

  let postId = id;
  let previousUploads: string[] = [];
  let updatedAt: string | undefined;
  if (id) {
    const { data: previous } = await supabase.from("posts").select(POST_IMAGE_COLUMNS).eq("id", id).maybeSingle();
    previousUploads = [...new Set([...uploadsReferencedBy(previous), ...(previousUploadsField ?? "").split(",").filter(isManagedUploadPath)])];
    const result = await writeWithSocialSeoFallback(record, (values) => {
      let update = supabase.from("posts").update(values).eq("id", id);
      if (baseUpdatedAt) update = update.eq("updated_at", baseUpdatedAt);
      return update.select("id,updated_at");
    });
    if (result === "migrationRequired") return { ok: false, message: t.posts.migrationRequired };
    const { data, error } = result;
    if (error) return { ok: false, message: postError(error) };
    if (!data?.length) {
      if (baseUpdatedAt && (await postExists(supabase, id))) return { ok: false, conflict: true, message: t.posts.safety.conflict };
      return { ok: false, message: t.posts.notFound };
    }
    updatedAt = data[0].updated_at;
  } else {
    const result = await writeWithSocialSeoFallback(record, (values) => supabase.from("posts").insert(values).select("id").single());
    if (result === "migrationRequired") return { ok: false, message: t.posts.migrationRequired };
    const { data, error } = result;
    if (error) return { ok: false, message: postError(error) };
    postId = data.id;
  }

  updateTag(POSTS_TAG);
  revalidatePath("/", "layout");
  // Images replaced or removed by this edit are deleted when nothing else uses them.
  await removeUnreferencedUploads(supabase, previousUploads);

  if (!id) redirect(`/admin/posts/${postId}`);
  return { ok: true, updatedAt, message: record.status === "published" ? t.posts.savedPublished : t.posts.savedDraft };
}

type AdminClient = Awaited<ReturnType<typeof requireAdmin>>["supabase"];

async function postExists(supabase: AdminClient, id: string) {
  const { data } = await supabase.from("posts").select("id").eq("id", id).maybeSingle();
  return Boolean(data);
}

export type AutosaveResult =
  | { ok: true; updatedAt: string }
  | { ok: false; reason: "conflict" | "not_draft" | "invalid" | "failed"; message: string };

/**
 * Draft autosave. Writes the editable fields of a post ONLY while its stored status is "draft" and it is still the
 * version the editor is based on — both enforced by the update's own WHERE clause, not by the client. Status and
 * publish date are never written here, public caches are not invalidated (drafts are not public) and media cleanup
 * never runs (an image removed mid-edit may come back; cleanup stays with the explicit save).
 */
export async function autosaveDraft(formData: FormData): Promise<AutosaveResult> {
  const { supabase } = await requireAdmin();
  const parsed = postSchema.safeParse(formEntries(formData));
  if (!parsed.success) {
    return { ok: false, reason: "invalid", message: firstIssue(parsed.error, { title: t.posts.fields.title, slug: "Slug", ...t.posts.labels }) };
  }
  const { id, base_updated_at: baseUpdatedAt, previous_uploads: _previousUploads, status: _status, published_at: _publishedAt, ...fields } = parsed.data;
  void _previousUploads;
  void _status;
  void _publishedAt;
  if (!id || !baseUpdatedAt) return { ok: false, reason: "invalid", message: t.common.invalidData };

  const slug = slugify(fields.slug || fields.title);
  if (!SLUG_PATTERN.test(slug)) return { ok: false, reason: "invalid", message: t.posts.invalidSlug };

  const result = await writeWithSocialSeoFallback({ ...fields, slug }, (values) =>
    supabase.from("posts").update(values).eq("id", id).eq("status", "draft").eq("updated_at", baseUpdatedAt).select("updated_at"),
  );
  if (result === "migrationRequired") return { ok: false, reason: "invalid", message: t.posts.migrationRequired };
  const { data, error } = result;
  if (error) return { ok: false, reason: error.code === "23505" ? "invalid" : "failed", message: postError(error) };
  if (data?.length) return { ok: true, updatedAt: data[0].updated_at };

  const { data: current } = await supabase.from("posts").select("status").eq("id", id).maybeSingle();
  if (!current) return { ok: false, reason: "failed", message: t.posts.notFound };
  if (current.status !== "draft") return { ok: false, reason: "not_draft", message: t.posts.safety.notDraft };
  return { ok: false, reason: "conflict", message: t.posts.safety.conflict };
}

/** Permanent deletion. Requires typing the confirmation word; the post's unused images are deleted with it. */
export async function deletePost(formData: FormData): Promise<FormState> {
  const { supabase } = await requireAdmin();
  const parsed = z.object({ id: z.uuid(), confirm: z.string() }).safeParse(formEntries(formData));
  if (!parsed.success) return { ok: false, message: t.common.invalidData };
  if (parsed.data.confirm.trim() !== t.posts.deleteConfirmWord) return { ok: false, message: t.posts.deleteMismatch };

  const { data, error } = await supabase.from("posts").delete().eq("id", parsed.data.id).select(POST_IMAGE_COLUMNS);
  if (error) return { ok: false, message: t.common.saveFailed(error.message) };
  if (!data?.length) return { ok: false, message: t.posts.notFound };

  updateTag(POSTS_TAG);
  revalidatePath("/", "layout");
  await removeUnreferencedUploads(supabase, uploadsReferencedBy(data));
  redirect("/admin/posts?deleted=1");
}

function postError(error: { code?: string; message: string }) {
  if (error.code === "23505") return t.posts.duplicateSlug;
  return t.common.saveFailed(error.message);
}
