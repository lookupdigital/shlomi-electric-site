/**
 * Lowercase letters (any script) and digits separated by single hyphens. No spaces, uppercase or URL delimiters.
 * Mirrors the posts_slug_check constraint in supabase/migrations.
 */
export const SLUG_PATTERN = /^[^\s\p{Lu}/?#%&"'<>\\-]+(-[^\s\p{Lu}/?#%&"'<>\\-]+)*$/u;

export function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .normalize("NFKC")
    .replace(/\p{M}/gu, "") // combining marks (e.g. Hebrew niqqud, detached accents)
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120)
    .replace(/-+$/g, "");
}
