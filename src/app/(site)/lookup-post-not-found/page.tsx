import { notFound } from "next/navigation";

// Prerendered 404 used by src/proxy.ts for unknown blog slugs, so junk URLs never create ISR cache entries.
export const dynamic = "force-static";

export default function MissingPostPage() {
  notFound();
}
