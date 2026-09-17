import Image from "next/image";
import Link from "next/link";
import type { PostRow } from "@/lookup/posts";
import { RichText } from "@/lookup/richtext";
import { siteConfig } from "@/site.config";

const dateFormat = new Intl.DateTimeFormat(siteConfig.locale.bcp47, {
  dateStyle: "long",
  timeZone: siteConfig.locale.timeZone,
});

/** Blog post article — shared by the public post page and the admin draft preview. */
export default function BlogPostView({ post }: { post: PostRow }) {
  const home = siteConfig.routes.corePages[0];
  const blog = siteConfig.routes.blog;
  const published = post.published_at ? dateFormat.format(new Date(post.published_at)) : null;
  const updated = dateFormat.format(new Date(post.updated_at));
  const showUpdated = Boolean(
    post.published_at && updated !== published && new Date(post.updated_at) > new Date(post.published_at),
  );

  return (
    <article>
      <header className="border-b border-line bg-offwhite">
        <div className="container-x flex flex-col gap-5 py-10 lg:py-16">
          <nav aria-label="פירורי לחם" className="font-heading text-sm text-muted">
            <ol className="flex flex-wrap items-center gap-2">
              <li>
                <Link href={home.path} className="hover:text-ink">
                  {home.navLabel ?? home.label}
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li>
                <Link href={blog.path} className="hover:text-ink">
                  {blog.navLabel ?? blog.label}
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li aria-current="page" className="text-ink">
                {post.title}
              </li>
            </ol>
          </nav>
          {post.category && <p className="font-heading text-sm text-brand-dark">{post.category}</p>}
          <h1 className="h1 max-w-[900px] text-navy">{post.title}</h1>
          {post.excerpt && <p className="subheading max-w-[760px] text-muted">{post.excerpt}</p>}
          <p className="flex flex-wrap gap-x-4 gap-y-1 font-heading text-sm text-muted">
            {post.author && <span>{`מאת ${post.author}`}</span>}
            {published && post.published_at && (
              <span>
                פורסם: <time dateTime={post.published_at}>{published}</time>
              </span>
            )}
            {showUpdated && (
              <span>
                עודכן: <time dateTime={post.updated_at}>{updated}</time>
              </span>
            )}
          </p>
        </div>
      </header>

      <div className="container-x flex flex-col items-center gap-10 py-12 lg:py-16">
        {post.featured_image_url && (
          <div className="relative aspect-[16/9] w-full max-w-[960px] overflow-hidden rounded-xl">
            <Image
              src={post.featured_image_url}
              alt={post.featured_image_alt ?? ""}
              fill
              priority
              sizes="(min-width: 1024px) 960px, 100vw"
              className="object-cover"
            />
          </div>
        )}
        <RichText doc={post.content} className="w-full max-w-[760px]" />
      </div>
    </article>
  );
}
