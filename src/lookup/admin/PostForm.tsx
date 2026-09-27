"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { autosaveDraft, savePost } from "@/lookup/admin/actions/posts";
import AdminForm from "@/lookup/admin/AdminForm";
import {
  applyRecovery,
  canServerAutosave,
  parseRecovery,
  recoveryKey,
  recoveryOffer,
  sameSnapshot,
  snapshotEntries,
  type FieldSnapshot,
  type PostRecovery,
  type RecoveryOffer,
} from "@/lookup/admin/content-safety";
import CountedField from "@/lookup/admin/CountedField";
import type { FormState } from "@/lookup/admin/form-utils";
import { t } from "@/lookup/admin/i18n";
import ImageField from "@/lookup/admin/ImageField";
import RichTextEditor from "@/lookup/admin/RichTextEditor";
import { secondaryButton } from "@/lookup/admin/styles";
import { CheckboxField, Fieldset, Notice, TextAreaField, TextField } from "@/lookup/admin/ui";
import { formSnapshot, useUnsavedChanges } from "@/lookup/admin/unsaved-changes";
import { referencedUploadPaths } from "@/lookup/media-rules";
import type { PostRow } from "@/lookup/posts";
import { postAltFacts } from "@/lookup/alt-facts";
import { GooglePreview, SocialPreview, useFormValue } from "@/lookup/admin/SeoPreview";
import { RECOMMENDED_LENGTH, type SeoSettings } from "@/lookup/seo-model";
import { siteConfig } from "@/site.config";

/** ISO timestamp → value for <input type="datetime-local"> in the browser's time zone. */
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

const subscribeNoop = () => () => {};

/** Quiet period after the last edit before a draft is autosaved, and the pause before retrying a failed attempt. */
const AUTOSAVE_DELAY_MS = 2500;
const RETRY_DELAY_MS = 15_000;
const CHECK_INTERVAL_MS = 1000;

const timeFormat = new Intl.DateTimeFormat(siteConfig.locale.bcp47, { hour: "2-digit", minute: "2-digit" });

type SaveState =
  | { kind: "idle" }
  | { kind: "unsaved" }
  | { kind: "saving" }
  | { kind: "autosaved"; at: number }
  | { kind: "localOnly"; message: string }
  | { kind: "blocked"; message: string };

function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/**
 * Post editor with content safety:
 * - leaving the page with unsaved edits asks for confirmation;
 * - edits are copied to this browser (per admin and post) and offered for recovery after a refresh or crash;
 * - drafts are autosaved to the server (never published or scheduled posts — the server re-checks the status);
 * - a save based on an outdated version is rejected instead of overwriting newer work.
 */
export type PostSeoContext = { settings: SeoSettings; indexable: boolean };

export default function PostForm({ post, editorId, seo }: { post: PostRow | null; editorId: string; seo: PostSeoContext }) {
  const formRef = useRef<HTMLFormElement>(null);
  const guard = useUnsavedChanges(formRef);
  const [shown, setShown] = useState<Partial<PostRow> | null>(post);
  const [fieldsKey, setFieldsKey] = useState(0);
  const [baseUpdatedAt, setBaseUpdatedAt] = useState<string | null>(post?.updated_at ?? null);
  const [save, setSave] = useState<SaveState>({ kind: "idle" });
  const [offer, setOffer] = useState<RecoveryOffer | null>(null);
  const [restored, setRestored] = useState(false);

  const key = recoveryKey(editorId, post?.id ?? null);
  const live = useRef({
    base: post?.updated_at ?? null,
    loadedStatus: post?.status ?? null,
    lastSeen: null as FieldSnapshot | null,
    lastChangeAt: 0,
    inFlight: null as Promise<void> | null,
    submitting: false,
    blocked: false,
    retryAt: 0,
    offerPending: false,
    /** Upload paths referenced at load or at the last explicit save: explicit-save cleanup candidates. */
    savedUploads: null as string[] | null,
  });

  const uploadsIn = (snapshot: FieldSnapshot) => [...referencedUploadPaths(Object.values(snapshot).join("\n"))];

  const setSaveKind = useCallback((next: SaveState) => {
    setSave((current) => (current.kind === next.kind && !("at" in next) && !("message" in next) ? current : next));
  }, []);

  const writeRecovery = useCallback(
    (fields: FieldSnapshot) => {
      if (live.current.offerPending) return; // never overwrite a copy the admin has not decided about yet
      const record: PostRecovery = { v: 1, postId: post?.id ?? null, baseUpdatedAt: live.current.base, savedAt: Date.now(), fields };
      try {
        storage()?.setItem(key, JSON.stringify(record));
      } catch {
        // storage full or blocked: the server copy (drafts) and the leave-page warning still apply
      }
    },
    [key, post?.id],
  );

  const clearRecovery = useCallback(() => {
    try {
      storage()?.removeItem(key);
    } catch {
      // ignore
    }
  }, [key]);

  // Offer a local copy left by an earlier session (refresh, crash, closed tab, rejected save).
  useEffect(() => {
    live.current.savedUploads = uploadsIn(formSnapshot(formRef.current));
    const record = parseRecovery(storage()?.getItem(key) ?? null, post?.id ?? null);
    const found = recoveryOffer(record, formSnapshot(formRef.current), post?.updated_at ?? null);
    live.current.offerPending = Boolean(found);
    setOffer(found);
  }, [key, post?.id, post?.updated_at]);

  const runAutosave = useCallback(
    async (snapshot: FieldSnapshot) => {
      const form = formRef.current;
      if (!form) return;
      setSave({ kind: "saving" });
      const formData = new FormData(form);
      formData.set("base_updated_at", live.current.base ?? "");
      try {
        const result = await autosaveDraft(formData);
        if (result.ok) {
          live.current.base = result.updatedAt;
          setBaseUpdatedAt(result.updatedAt);
          guard.markSaved(snapshot);
          if (sameSnapshot(formSnapshot(formRef.current), snapshot)) clearRecovery();
          setSave({ kind: "autosaved", at: Date.now() });
        } else if (result.reason === "conflict" || result.reason === "not_draft") {
          live.current.blocked = true;
          writeRecovery(formSnapshot(formRef.current));
          setSave({ kind: "blocked", message: result.message });
        } else {
          live.current.retryAt = Date.now() + RETRY_DELAY_MS;
          setSave({ kind: "localOnly", message: result.reason === "invalid" ? t.posts.safety.localOnlyReason(result.message) : t.posts.safety.localOnly });
        }
      } catch {
        live.current.retryAt = Date.now() + RETRY_DELAY_MS;
        setSave({ kind: "localOnly", message: t.posts.safety.localOnly });
      }
    },
    [clearRecovery, guard, writeRecovery],
  );

  // One lightweight check per second: notice edits (including editor/image fields that fire no input events),
  // keep the local copy current, and autosave drafts after a quiet period.
  useEffect(() => {
    const onOnline = () => {
      live.current.retryAt = 0;
    };
    window.addEventListener("online", onOnline);
    const timer = window.setInterval(() => {
      const state = live.current;
      const baseline = guard.baseline();
      const form = formRef.current;
      if (!baseline || !form) return;
      const current = formSnapshot(form);
      const dirty = !sameSnapshot(current, baseline);
      if (!state.lastSeen || !sameSnapshot(current, state.lastSeen)) {
        state.lastSeen = current;
        state.lastChangeAt = Date.now();
        state.retryAt = 0;
        if (dirty) writeRecovery(current);
      }
      if (!dirty) return;
      if (!canServerAutosave(post, state.loadedStatus) || state.blocked) {
        if (!state.blocked) setSaveKind({ kind: "unsaved" });
        return;
      }
      if (state.inFlight || state.submitting || Date.now() - state.lastChangeAt < AUTOSAVE_DELAY_MS || Date.now() < state.retryAt) return;
      if (!navigator.onLine) {
        setSaveKind({ kind: "localOnly", message: t.posts.safety.localOnly });
        return;
      }
      state.inFlight = runAutosave(current).finally(() => {
        state.inFlight = null;
      });
    }, CHECK_INTERVAL_MS);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("online", onOnline);
    };
  }, [guard, post, runAutosave, setSaveKind, writeRecovery]);

  // Explicit save: waits for a running autosave, then saves against the latest known version.
  const submit = useCallback(async (formData: FormData): Promise<FormState> => {
    live.current.submitting = true;
    try {
      if (live.current.inFlight) await live.current.inFlight;
      formData.set("base_updated_at", live.current.base ?? "");
      formData.set("previous_uploads", (live.current.savedUploads ?? []).join(","));
      return await savePost(formData);
    } finally {
      live.current.submitting = false;
    }
  }, []);

  const onResult = useCallback(
    (result: FormState | "redirect", submitted: FormData) => {
      if (result === "redirect") {
        clearRecovery();
        return;
      }
      const submittedSnapshot = snapshotEntries(submitted.entries());
      if (result?.ok) {
        if (result.updatedAt) {
          live.current.base = result.updatedAt;
          setBaseUpdatedAt(result.updatedAt);
        }
        live.current.loadedStatus = String(submitted.get("status") ?? live.current.loadedStatus);
        live.current.blocked = false;
        live.current.savedUploads = uploadsIn(submittedSnapshot);
        guard.markSaved(submittedSnapshot);
        if (sameSnapshot(formSnapshot(formRef.current), submittedSnapshot)) clearRecovery();
        setRestored(false);
        setSave({ kind: "idle" });
      } else if (result?.conflict) {
        live.current.blocked = true;
        live.current.offerPending = false;
        writeRecovery(formSnapshot(formRef.current));
        setSave({ kind: "idle" });
      }
    },
    [clearRecovery, guard, writeRecovery],
  );

  function restore() {
    const record = parseRecovery(storage()?.getItem(key) ?? null, post?.id ?? null);
    live.current.offerPending = false;
    setOffer(null);
    if (!record) return;
    setShown(applyRecovery(post, record.fields));
    setFieldsKey((value) => value + 1);
    setRestored(true);
  }

  function discard() {
    live.current.offerPending = false;
    clearRecovery();
    setOffer(null);
  }

  const status =
    save.kind === "saving" ? (
      <span className="text-sm text-muted">{t.posts.safety.saving}</span>
    ) : save.kind === "autosaved" ? (
      <span className="text-sm text-muted">{t.posts.safety.autosaved(timeFormat.format(save.at))}</span>
    ) : save.kind === "localOnly" || save.kind === "blocked" ? (
      <span role="alert" className="text-sm font-semibold text-amber-800">
        {save.message}
      </span>
    ) : save.kind === "unsaved" ? (
      <span className="text-sm text-muted">{post ? t.posts.safety.unsavedPublished : t.posts.safety.unsavedNew}</span>
    ) : null;

  return (
    <div className="flex flex-col gap-4">
      {offer && (
        <Notice tone="warning">
          <div className="flex flex-col gap-3">
            <p className="font-semibold">{t.posts.safety.recoveryFound(timeFormat.format(offer.savedAt))}</p>
            {offer.stale && <p>{t.posts.safety.recoveryStale}</p>}
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={restore} className={secondaryButton}>
                {t.posts.safety.restore}
              </button>
              <button type="button" onClick={discard} className={secondaryButton}>
                {t.posts.safety.discard}
              </button>
            </div>
          </div>
        </Notice>
      )}
      {restored && <Notice tone="info">{t.posts.safety.restored}</Notice>}

      <AdminForm action={submit} submitLabel={post ? t.posts.save : t.posts.create} formRef={formRef} onResult={onResult} status={status}>
        {post && <input type="hidden" name="id" value={post.id} />}
        <input type="hidden" name="base_updated_at" value={baseUpdatedAt ?? ""} />
        <PostFields key={fieldsKey} post={shown} seo={seo} />
      </AdminForm>
    </div>
  );
}

/** Live notice while a featured image is set without alt text (never blocks saving). */
function FeaturedAltStatus() {
  const { anchor, value: missing } = useFormValue(
    (form) => postAltFacts({ featured_image_url: String(form.get("featured_image_url") ?? ""), featured_image_alt: String(form.get("featured_image_alt") ?? "") }).featuredMissing,
  );
  return (
    <div ref={anchor} className="md:col-span-2" aria-live="polite">
      {missing && <span className="text-xs font-semibold text-amber-800">{t.posts.featuredAltMissing}</span>}
    </div>
  );
}

function PostFields({ post, seo }: { post: Partial<PostRow> | null; seo: PostSeoContext }) {
  const target = { kind: "post", blogPath: siteConfig.routes.blog.path } as const;
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
    <>
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
        <FeaturedAltStatus />
      </Fieldset>

      <div className="flex flex-col gap-2">
        <span className="font-heading text-lg font-semibold text-ink">{t.posts.fields.content}</span>
        <RichTextEditor name="content" initialContent={post?.content} />
      </div>

      <Fieldset legend={`${t.posts.seo} · ${t.seo.search}`} description={`${t.seo.searchDescription} ${t.posts.seoDescription}`}>
        <CountedField label="Meta title" name="meta_title" defaultValue={post?.meta_title} recommended={RECOMMENDED_LENGTH.metaTitle} maxLength={200} wide />
        <CountedField
          label="Meta description"
          name="meta_description"
          defaultValue={post?.meta_description}
          recommended={RECOMMENDED_LENGTH.metaDescription}
          maxLength={500}
          multiline
        />
        <GooglePreview settings={seo.settings} indexable={seo.indexable} target={target} />
      </Fieldset>

      <Fieldset legend={`${t.posts.seo} · ${t.seo.social}`} description={t.seo.socialDescription}>
        <TextField label="OG title" name="og_title" defaultValue={post?.og_title} placeholder={t.seo.ogTitlePlaceholder} maxLength={200} wide />
        <TextAreaField label="OG description" name="og_description" defaultValue={post?.og_description} placeholder={t.seo.ogDescriptionPlaceholder} maxLength={500} />
        <ImageField label={t.posts.ogImage} name="og_image_url" defaultValue={post?.og_image_url} hint={t.seo.postOgImageHint} wide />
        <SocialPreview settings={seo.settings} indexable={seo.indexable} target={target} />
      </Fieldset>

      <Fieldset legend={`${t.posts.seo} · ${t.seo.advanced}`} description={t.seo.advancedDescription}>
        <TextField label="Canonical URL" name="canonical_url" defaultValue={post?.canonical_url} dir="ltr" hint={t.seo.canonicalHint} wide />
        <CheckboxField label={t.posts.robotsIndex} name="robots_index" defaultChecked={post?.robots_index ?? true} hint={t.posts.robotsIndexHint} />
        <CheckboxField label={t.posts.robotsFollow} name="robots_follow" defaultChecked={post?.robots_follow ?? true} hint={t.seo.followHint} />
      </Fieldset>
    </>
  );
}
