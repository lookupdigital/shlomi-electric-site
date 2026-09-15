"use client";

import { useState, useSyncExternalStore } from "react";
import { savePost } from "@/lookup/admin/actions/posts";
import AdminForm from "@/lookup/admin/AdminForm";
import CountedField from "@/lookup/admin/CountedField";
import { t } from "@/lookup/admin/i18n";
import ImageField from "@/lookup/admin/ImageField";
import RichTextEditor from "@/lookup/admin/RichTextEditor";
import { CheckboxField, Fieldset, TextAreaField, TextField } from "@/lookup/admin/ui";
import type { PostRow } from "@/lookup/posts";
import { RECOMMENDED_LENGTH } from "@/lookup/seo-model";

/** ISO timestamp → value for <input type="datetime-local"> in the browser's time zone. */
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

const subscribeNoop = () => () => {};

export default function PostForm({ post }: { post: PostRow | null }) {
  const [status, setStatus] = useState(post?.status ?? "draft");
  // null = the admin has not touched the date; keep the stored value.
  const [publishedLocal, setPublishedLocal] = useState<string | null>(null);
  // The browser time zone is unknown during server rendering, so the stored date is shown only on the client.
  const isClient = useSyncExternalStore(subscribeNoop, () => true, () => false);

  const storedPublishedAt = post?.published_at ?? null;
  const displayedLocal = publishedLocal ?? (isClient ? toLocalInput(storedPublishedAt) : "");
  const publishedIso =
    publishedLocal === null ? (storedPublishedAt ?? "") : publishedLocal ? new Date(publishedLocal).toISOString() : "";

  return (
    <AdminForm action={savePost} submitLabel={post ? t.posts.save : t.posts.create}>
      {post && <input type="hidden" name="id" value={post.id} />}

      <Fieldset legend={t.posts.details}>
        <TextField label={t.posts.fields.title} name="title" defaultValue={post?.title} required maxLength={200} wide />
        <TextField label={t.posts.fields.slug} name="slug" defaultValue={post?.slug} dir="ltr" maxLength={120} hint={t.posts.fields.slugHint} />
        <TextField label={t.posts.fields.category} name="category" defaultValue={post?.category} maxLength={80} />
        <TextField label={t.posts.fields.author} name="author" defaultValue={post?.author} maxLength={120} />
        <label className="flex flex-col gap-1.5">
          <span className="font-heading text-sm font-bold text-ink">{t.posts.fields.status}</span>
          <select name="status" value={status} onChange={(event) => setStatus(event.target.value)} className="field">
            <option value="draft">{t.posts.draft}</option>
            <option value="published">{t.posts.published}</option>
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="font-heading text-sm font-bold text-ink">{t.posts.fields.publishedAt}</span>
          <input type="datetime-local" value={displayedLocal} onChange={(event) => setPublishedLocal(event.target.value)} className="field" />
          <input type="hidden" name="published_at" value={publishedIso} />
          <span className="text-xs text-muted">{t.posts.fields.publishedAtHint}</span>
        </label>
        <TextAreaField label={t.posts.fields.excerpt} name="excerpt" defaultValue={post?.excerpt} maxLength={500} />
        <ImageField label={t.posts.fields.featuredImage} name="featured_image_url" defaultValue={post?.featured_image_url} />
        <TextField label={t.posts.fields.featuredImageAlt} name="featured_image_alt" defaultValue={post?.featured_image_alt} maxLength={200} />
      </Fieldset>

      <div className="flex flex-col gap-2">
        <span className="font-heading text-lg font-semibold text-ink">{t.posts.fields.content}</span>
        <RichTextEditor name="content" initialContent={post?.content} />
      </div>

      <Fieldset legend={t.posts.seo} description={t.posts.seoDescription}>
        <CountedField label="Meta title" name="meta_title" defaultValue={post?.meta_title} recommended={RECOMMENDED_LENGTH.metaTitle} maxLength={200} />
        <TextField label="Canonical URL" name="canonical_url" defaultValue={post?.canonical_url} dir="ltr" />
        <CountedField
          label="Meta description"
          name="meta_description"
          defaultValue={post?.meta_description}
          recommended={RECOMMENDED_LENGTH.metaDescription}
          maxLength={500}
          multiline
        />
        <ImageField label={t.posts.ogImage} name="og_image_url" defaultValue={post?.og_image_url} />
        <CheckboxField label={t.posts.robotsIndex} name="robots_index" defaultChecked={post?.robots_index ?? true} hint={t.posts.robotsIndexHint} />
      </Fieldset>
    </AdminForm>
  );
}
