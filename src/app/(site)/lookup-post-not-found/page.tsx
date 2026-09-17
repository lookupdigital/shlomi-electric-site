import type { Metadata } from "next";
import NotFoundView from "@/components/NotFoundView";

// Prerendered 404 page for unknown blog slugs. src/proxy.ts rewrites those requests here with HTTP status 404,
// so junk URLs get a fully rendered branded page without creating an ISR cache entry per URL.
// It renders the content directly (instead of calling notFound()) so the static HTML is complete without JavaScript.
export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "העמוד לא נמצא",
  robots: { index: false, follow: false },
};

export default function MissingPostPage() {
  return <NotFoundView />;
}
