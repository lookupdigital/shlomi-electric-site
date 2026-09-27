// Frontend contract between the Lookup infrastructure and the client website.
//
// Infrastructure routes that render public-site UI import it ONLY from this file:
//   - src/app/admin/preview/posts/[id]  (draft preview: SiteChrome + BlogPostView)
//   - src/app/(site)/lookup-post-not-found and src/app/not-found.tsx  (NotFoundView inside SiteChrome)
// A client frontend may rename or restyle its components freely; keep these three exports pointing at them.
export { default as SiteChrome } from "@/components/SiteChrome";
export { default as BlogPostView } from "@/components/BlogPostView";
export { default as NotFoundView } from "@/components/NotFoundView";
