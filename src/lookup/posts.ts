import "server-only";
import { unstable_cache } from "next/cache";
import { CACHE_BUILD_KEY, freshValue, takeSnapshot } from "@/lookup/cache";
import type { Database } from "@/lookup/supabase/database.types";
import { createPublicClient } from "@/lookup/supabase/public";

export const POSTS_TAG = "posts";

/**
 * Longest time a scheduled post stays hidden after its published_at. Publishing on a schedule is not an admin action,
 * so no cache tag is invalidated at that moment: public post reads are re-read at least this often instead. Pages that
 * list posts (home, blog index, post pages) inherit this as their ISR revalidate interval.
 */
export const POST_FRESHNESS_SECONDS = 60;

export type PostRow = Database["public"]["Tables"]["posts"]["Row"];
export type PostStatus = "draft" | "published";

const SUMMARY_COLUMNS =
  "id,title,slug,excerpt,featured_image_url,featured_image_alt,category,author,published_at,updated_at,robots_index,canonical_url" as const;

export type PostSummary = Pick<
  PostRow,
  | "id"
  | "title"
  | "slug"
  | "excerpt"
  | "featured_image_url"
  | "featured_image_alt"
  | "category"
  | "author"
  | "published_at"
  | "updated_at"
  | "robots_index"
  | "canonical_url"
>;

// Public reads use the anon key: RLS only returns posts with status 'published' and published_at <= now().
async function loadPublishedPosts(): Promise<PostSummary[]> {
  const supabase = createPublicClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("posts")
    .select(SUMMARY_COLUMNS)
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(500);
  if (error) throw new Error(`posts: ${error.message}`);
  return data ?? [];
}

async function loadPublishedPost(slug: string): Promise<PostRow | null> {
  const supabase = createPublicClient();
  if (!supabase) return null;
  const { data, error } = await supabase.from("posts").select("*").eq("slug", slug).eq("status", "published").maybeSingle();
  if (error) throw new Error(`posts: ${error.message}`);
  return data;
}

const readPublishedPosts = unstable_cache(() => takeSnapshot(loadPublishedPosts), ["lookup-published-posts", CACHE_BUILD_KEY], {
  tags: [POSTS_TAG],
  revalidate: POST_FRESHNESS_SECONDS,
});

const readPublishedPost = unstable_cache(
  (slug: string) => takeSnapshot(() => loadPublishedPost(slug)),
  ["lookup-published-post", CACHE_BUILD_KEY],
  { tags: [POSTS_TAG], revalidate: POST_FRESHNESS_SECONDS },
);

export async function getPublishedPosts(): Promise<PostSummary[]> {
  try {
    return await freshValue(readPublishedPosts, loadPublishedPosts, POST_FRESHNESS_SECONDS);
  } catch (error) {
    console.warn("[lookup] Posts unavailable:", (error as Error).message);
    return [];
  }
}

export async function getPublishedPost(slug: string): Promise<PostRow | null> {
  try {
    return await freshValue(() => readPublishedPost(slug), () => loadPublishedPost(slug), POST_FRESHNESS_SECONDS);
  } catch (error) {
    console.warn("[lookup] Post unavailable:", (error as Error).message);
    return null;
  }
}
