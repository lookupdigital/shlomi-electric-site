"use client";

import { useState, useSyncExternalStore } from "react";
import { savePost } from "@/lookup/admin/actions/posts";
import AdminForm from "@/lookup/admin/AdminForm";
import ImageField from "@/lookup/admin/ImageField";
import RichTextEditor from "@/lookup/admin/RichTextEditor";
import { CheckboxField, Fieldset, TextAreaField, TextField } from "@/lookup/admin/ui";
import type { PostRow } from "@/lookup/posts";

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
    <AdminForm action={savePost} submitLabel={post ? "שמירת הפוסט" : "יצירת הפוסט"}>
      {post && <input type="hidden" name="id" value={post.id} />}

      <Fieldset legend="פרטי הפוסט">
        <TextField label="כותרת" name="title" defaultValue={post?.title} required maxLength={200} wide />
        <TextField
          label="Slug (כתובת)"
          name="slug"
          defaultValue={post?.slug}
          dir="ltr"
          maxLength={120}
          hint="אותיות באנגלית/עברית, מספרים ומקפים. ריק = נוצר מהכותרת."
        />
        <TextField label="קטגוריה" name="category" defaultValue={post?.category} maxLength={80} />
        <TextField label="מחבר" name="author" defaultValue={post?.author} maxLength={120} />
        <label className="flex flex-col gap-1.5">
          <span className="font-heading text-sm font-bold text-ink">סטטוס</span>
          <select
            name="status"
            value={status}
            onChange={(event) => setStatus(event.target.value as "draft" | "published")}
            className="field"
          >
            <option value="draft">טיוטה</option>
            <option value="published">פורסם</option>
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="font-heading text-sm font-bold text-ink">תאריך פרסום</span>
          <input
            type="datetime-local"
            value={displayedLocal}
            onChange={(event) => setPublishedLocal(event.target.value)}
            className="field"
          />
          <input type="hidden" name="published_at" value={publishedIso} />
          <span className="text-xs text-muted">ריק בעת פרסום = עכשיו. תאריך עתידי = הפוסט יוצג רק מאותו מועד.</span>
        </label>
        <TextAreaField label="תקציר" name="excerpt" defaultValue={post?.excerpt} maxLength={500} />
        <ImageField label="תמונה ראשית" name="featured_image_url" defaultValue={post?.featured_image_url} />
        <TextField
          label="טקסט חלופי לתמונה (alt)"
          name="featured_image_alt"
          defaultValue={post?.featured_image_alt}
          maxLength={200}
        />
      </Fieldset>

      <div className="flex flex-col gap-2">
        <span className="font-heading text-lg font-semibold text-ink">תוכן</span>
        <RichTextEditor name="content" initialContent={post?.content} />
      </div>

      <Fieldset legend="SEO" description="שדות ריקים משתמשים בכותרת, בתקציר ובתמונה הראשית.">
        <TextField label="Meta title" name="meta_title" defaultValue={post?.meta_title} maxLength={200} />
        <TextField label="Canonical URL" name="canonical_url" defaultValue={post?.canonical_url} dir="ltr" />
        <TextAreaField label="Meta description" name="meta_description" defaultValue={post?.meta_description} maxLength={500} />
        <ImageField label="תמונת שיתוף (OG)" name="og_image_url" defaultValue={post?.og_image_url} />
        <CheckboxField
          label="לאפשר אינדוקס (index)"
          name="robots_index"
          defaultChecked={post?.robots_index ?? true}
          hint="כל עוד האינדוקס הכללי כבוי בהגדרות האתר, אף עמוד לא יאונדקס."
        />
      </Fieldset>
    </AdminForm>
  );
}
