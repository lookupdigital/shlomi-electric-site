// Missing-alt facts for Admin-managed post images. Pure: no data access.
// A content image is "missing alt" when it is not marked decorative and its alt text is empty. An empty alt is never
// assumed to be decorative — that is an explicit editor choice. Featured images always need alt text when set.

type Node = { type?: unknown; attrs?: Record<string, unknown> | null; content?: unknown };

export type ContentImage = { src: string; alt: string; decorative: boolean };

export function contentImages(doc: unknown): ContentImage[] {
  const images: ContentImage[] = [];
  const walk = (node: unknown, depth: number) => {
    if (!node || typeof node !== "object" || depth > 50) return;
    const current = node as Node;
    if (current.type === "image") {
      const attrs = current.attrs ?? {};
      images.push({
        src: typeof attrs.src === "string" ? attrs.src : "",
        alt: typeof attrs.alt === "string" ? attrs.alt : "",
        decorative: attrs.decorative === true,
      });
    }
    if (Array.isArray(current.content)) for (const child of current.content) walk(child, depth + 1);
  };
  walk(doc, 0);
  return images;
}

export function isMissingAlt(image: Pick<ContentImage, "alt" | "decorative">): boolean {
  return !image.decorative && image.alt.trim() === "";
}

export type AltFacts = { contentMissing: number; featuredMissing: boolean; total: number };

export function postAltFacts(post: { content?: unknown; featured_image_url?: string | null; featured_image_alt?: string | null }): AltFacts {
  const contentMissing = contentImages(post.content).filter(isMissingAlt).length;
  const featuredMissing = Boolean(post.featured_image_url?.trim()) && !post.featured_image_alt?.trim();
  return { contentMissing, featuredMissing, total: contentMissing + (featuredMissing ? 1 : 0) };
}
