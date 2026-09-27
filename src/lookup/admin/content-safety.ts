// Content safety rules for Admin editors: form snapshots, navigation guarding, local recovery and autosave
// eligibility. Pure (no React, no storage access) so every rule is unit-tested.
import type { PostRow } from "@/lookup/posts";

export type FieldSnapshot = Record<string, string>;

/** Hidden bookkeeping fields that are not user edits (Server Action ids, the post id and its base version). */
const IGNORED_FIELD = /^(\$ACTION|id$|base_updated_at$|previous_uploads$)/;

/** Form entries as a comparable snapshot. File inputs are ignored (uploads are stored immediately as URLs). */
export function snapshotEntries(entries: Iterable<[string, FormDataEntryValue]>): FieldSnapshot {
  const snapshot: FieldSnapshot = {};
  for (const [key, value] of entries) {
    if (typeof value !== "string" || IGNORED_FIELD.test(key)) continue;
    snapshot[key] = key in snapshot ? `${snapshot[key]}\u0000${value}` : value;
  }
  return snapshot;
}

export function sameSnapshot(a: FieldSnapshot, b: FieldSnapshot): boolean {
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every((key) => key in b && a[key] === b[key]);
}

/**
 * A click that would leave the current Admin page: same-origin link, plain left click, same tab, different page.
 * New tabs, downloads, modified clicks and in-page anchors never leave the editor.
 */
export function leavesPage(
  link: { href: string; target?: string | null; download?: boolean },
  click: { button: number; metaKey: boolean; ctrlKey: boolean; shiftKey: boolean; altKey: boolean; defaultPrevented: boolean },
  current: string,
): boolean {
  if (click.defaultPrevented || click.button !== 0 || click.metaKey || click.ctrlKey || click.shiftKey || click.altKey) return false;
  if (link.download || (link.target && link.target !== "_self")) return false;
  let to: URL;
  let from: URL;
  try {
    from = new URL(current);
    to = new URL(link.href, from);
  } catch {
    return false;
  }
  if (to.origin !== from.origin) return false;
  return to.pathname !== from.pathname || to.search !== from.search;
}

/** Server autosave only ever touches posts whose stored status is still "draft" (the database re-checks it). */
export function canServerAutosave(post: Pick<PostRow, "id" | "status"> | null, loadedStatus: string | null): boolean {
  return Boolean(post?.id) && loadedStatus === "draft";
}

// ── Local recovery ──────────────────────────────────────────────────────────────────────────────────────────

export type PostRecovery = {
  v: 1;
  postId: string | null;
  /** updated_at of the server version the edits were based on (null for a post not created yet). */
  baseUpdatedAt: string | null;
  /** When the local copy was written (ms since epoch). */
  savedAt: number;
  fields: FieldSnapshot;
};

/** Scoped per editor (admin user id) and per post, so admins sharing a browser never see each other's copies. */
export function recoveryKey(editorId: string, postId: string | null): string {
  return `lookup-admin:post-recovery:v1:${editorId}:${postId ?? "new"}`;
}

export function parseRecovery(raw: string | null, postId: string | null): PostRecovery | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as PostRecovery;
    if (value?.v !== 1 || value.postId !== postId || typeof value.savedAt !== "number" || typeof value.fields !== "object") return null;
    return value;
  } catch {
    return null;
  }
}

export type RecoveryOffer = { savedAt: number; stale: boolean };

/**
 * Whether to offer restoring a local copy. Nothing is offered when the copy equals the current form. A copy is
 * "stale" when the server version changed since the edits began (another tab or admin saved): it is still offered,
 * with a warning, so work is never silently lost — and never applied automatically.
 */
export function recoveryOffer(record: PostRecovery | null, current: FieldSnapshot, serverUpdatedAt: string | null): RecoveryOffer | null {
  if (!record || sameSnapshot(record.fields, current)) return null;
  return { savedAt: record.savedAt, stale: record.baseUpdatedAt !== serverUpdatedAt };
}

/** Applies recovered form fields to the post shown in the editor (the editor is re-rendered from it). */
export function applyRecovery(post: PostRow | null, fields: FieldSnapshot): Partial<PostRow> {
  const text = (key: string) => (fields[key] ? fields[key] : null);
  let content: unknown = post?.content ?? null;
  try {
    if (fields.content) content = JSON.parse(fields.content);
  } catch {
    // keep the stored content
  }
  return {
    ...(post ?? {}),
    title: fields.title ?? post?.title ?? "",
    slug: fields.slug ?? post?.slug ?? "",
    category: text("category"),
    author: text("author"),
    status: fields.status === "published" ? "published" : "draft",
    published_at: text("published_at"),
    excerpt: text("excerpt"),
    featured_image_url: text("featured_image_url"),
    featured_image_alt: text("featured_image_alt"),
    content: content as PostRow["content"],
    meta_title: text("meta_title"),
    meta_description: text("meta_description"),
    canonical_url: text("canonical_url"),
    og_title: text("og_title"),
    og_description: text("og_description"),
    og_image_url: text("og_image_url"),
    robots_index: fields.robots_index === "on",
    // Copies written before v1.2 have no follow checkbox: keep the stored value instead of reading "unchecked".
    robots_follow: "og_title" in fields ? fields.robots_follow === "on" : (post?.robots_follow ?? true),
  };
}
