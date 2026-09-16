import "server-only";
import { revalidatePath } from "next/cache";

/**
 * Refreshes the public site after an admin change. Pages share the root layout; the metadata routes
 * (sitemap.xml, robots.txt) are separate route handlers that Vercel's CDN keeps cached unless they are
 * revalidated by path.
 */
export function revalidatePublicSite() {
  revalidatePath("/", "layout");
  revalidatePath("/sitemap.xml");
  revalidatePath("/robots.txt");
}
