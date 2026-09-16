"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { checkbox, firstIssue, formEntries, httpUrl, imageUrl, optional, type FormState } from "@/lookup/admin/form-utils";
import { t } from "@/lookup/admin/i18n";
import { revalidatePublicSite } from "@/lookup/admin/revalidate";
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
  og_image_url: optional(imageUrl),
  robots_index: checkbox,
});

export async function savePost(formData: FormData): Promise<FormState> {
  const { supabase } = await requireAdmin();
  const parsed = postSchema.safeParse(formEntries(formData));
  if (!parsed.success) return { ok: false, message: firstIssue(parsed.error, { title: t.posts.fields.title, slug: "Slug", ...t.posts.labels }) };

  const { id, ...fields } = parsed.data;
  const slug = slugify(fields.slug || fields.title);
  if (!SLUG_PATTERN.test(slug)) return { ok: false, message: t.posts.invalidSlug };

  const record = {
    ...fields,
    slug,
    published_at: fields.status === "published" ? (fields.published_at ?? new Date().toISOString()) : fields.published_at,
  };

  let postId = id;
  if (id) {
    const { data, error } = await supabase.from("posts").update(record).eq("id", id).select("id");
    if (error) return { ok: false, message: postError(error) };
    if (!data?.length) return { ok: false, message: t.posts.notFound };
  } else {
    const { data, error } = await supabase.from("posts").insert(record).select("id").single();
    if (error) return { ok: false, message: postError(error) };
    postId = data.id;
  }

  updateTag(POSTS_TAG);
  revalidatePublicSite();

  if (!id) redirect(`/admin/posts/${postId}`);
  return { ok: true, message: record.status === "published" ? t.posts.savedPublished : t.posts.savedDraft };
}

function postError(error: { code?: string; message: string }) {
  if (error.code === "23505") return t.posts.duplicateSlug;
  return t.common.saveFailed(error.message);
}
