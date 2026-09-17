import PostCard from "@/components/PostCard";
import { getPublishedPosts } from "@/lookup/posts";
import { buildPageMetadata } from "@/lookup/seo";
import { siteConfig } from "@/site.config";

const blog = siteConfig.routes.blog;

export function generateMetadata() {
  return buildPageMetadata({ path: blog.path, title: blog.title });
}

export default async function BlogPage() {
  const posts = await getPublishedPosts();

  return (
    <>
      <section className="border-b border-line bg-offwhite">
        <div className="container-x flex flex-col gap-4 py-12 lg:py-20">
          <h1 className="h1 text-navy">{blog.title ?? blog.label}</h1>
        </div>
      </section>

      <section>
        <div className="container-x py-16 lg:py-20">
          {posts.length > 0 ? (
            <div className="grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          ) : (
            <p className="body-text text-center text-muted">עדיין לא פורסמו מאמרים.</p>
          )}
        </div>
      </section>
    </>
  );
}
