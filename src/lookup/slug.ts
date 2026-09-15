/** Lowercase latin letters, digits and Hebrew letters separated by single hyphens. */
export const SLUG_PATTERN = /^[a-z0-9א-ת]+(-[a-z0-9א-ת]+)*$/;

export function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[֑-ׇ]/g, "") // Hebrew niqqud and cantillation marks
    .replace(/[^a-z0-9א-ת]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120)
    .replace(/-+$/g, "");
}
