import "server-only";
import { unstable_cache } from "next/cache";
import { CACHE_BUILD_KEY } from "@/lookup/cache";
import type { Database } from "@/lookup/supabase/database.types";
import { createPublicClient } from "@/lookup/supabase/public";

export const POSTS_TAG = "posts";

export type PostRow = Database["public"]["Tables"]["posts"]["Row"];
export type PostStatus = "draft" | "published";

const SUMMARY_COLUMNS =
  "id,title,slug,excerpt,featured_image_url,featured_image_alt,category,author,published_at,updated_at,robots_index" as const;

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
>;

// Public reads use the anon key: RLS only returns posts with status 'published' and published_at <= now().
const readPublishedPosts = unstable_cache(
  async (): Promise<PostSummary[]> => {
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
  },
  ["lookup-published-posts", CACHE_BUILD_KEY],
  { tags: [POSTS_TAG], revalidate: 3600 },
);

const readPublishedPost = unstable_cache(
  async (slug: string): Promise<PostRow | null> => {
    const supabase = createPublicClient();
    if (!supabase) return null;
    const { data, error } = await supabase.from("posts").select("*").eq("slug", slug).eq("status", "published").maybeSingle();
    if (error) throw new Error(`posts: ${error.message}`);
    return data;
  },
  ["lookup-published-post", CACHE_BUILD_KEY],
  { tags: [POSTS_TAG], revalidate: 3600 },
);

export async function getPublishedPosts(): Promise<PostSummary[]> {
  try {
    return await readPublishedPosts();
  } catch (error) {
    console.warn("[lookup] Posts unavailable:", (error as Error).message);
    return [];
  }
}

export async function getPublishedPost(slug: string): Promise<PostRow | null> {
  try {
    return await readPublishedPost(slug);
  } catch (error) {
    console.warn("[lookup] Post unavailable:", (error as Error).message);
    return null;
  }
}
