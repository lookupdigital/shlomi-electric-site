import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import CtaSection from "@/components/CtaSection";
import { getPublishedPost, getPublishedPosts, type PostRow } from "@/lookup/posts";
import { RichText } from "@/lookup/richtext";
import { blogPostingSchema, breadcrumbSchema, JsonLd } from "@/lookup/schema";
import { composeMetadata } from "@/lookup/seo-model";
import { getSiteSettings, isIndexable } from "@/lookup/settings";
import { absoluteUrl } from "@/lookup/settings-model";

type Props = PageProps<"/blog/[slug]">;

const dateFormat = new Intl.DateTimeFormat("he-IL", { dateStyle: "long", timeZone: "Asia/Jerusalem" });

export async function generateStaticParams() {
  const posts = await getPublishedPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

async function loadPost(params: Props["params"]): Promise<PostRow | null> {
  const { slug } = await params;
  let decoded = slug;
  try {
    decoded = decodeURIComponent(slug);
  } catch {
    // Not percent-encoded.
  }
  return getPublishedPost(decoded);
}

const postPath = (slug: string) => `/blog/${encodeURIComponent(slug)}`;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await loadPost(params);
  if (!post) return { title: "העמוד לא נמצא", robots: { index: false, follow: false } };
  const settings = await getSiteSettings();
  return composeMetadata({
    settings,
    path: postPath(post.slug),
    seo: {
      meta_title: post.meta_title,
      meta_description: post.meta_description,
      canonical_url: post.canonical_url,
      og_image_url: post.og_image_url,
      robots_index: post.robots_index,
    },
    fallbackTitle: post.title,
    fallbackDescription: post.excerpt ?? undefined,
    fallbackImage: post.featured_image_url,
    indexable: isIndexable(settings),
    type: "article",
    publishedTime: post.published_at ?? undefined,
    modifiedTime: post.updated_at,
  });
}

export default async function BlogPostPage({ params }: Props) {
  // Drafts and future-dated posts are never returned by the public (RLS-limited) query.
  const post = await loadPost(params);
  if (!post?.published_at) notFound();

  const settings = await getSiteSettings();
  const url = post.canonical_url || absoluteUrl(settings.siteUrl, postPath(post.slug));
  const published = dateFormat.format(new Date(post.published_at));
  const updated = dateFormat.format(new Date(post.updated_at));
  const showUpdated = updated !== published && new Date(post.updated_at) > new Date(post.published_at);

  return (
    <>
      <JsonLd
        data={[
          blogPostingSchema({
            settings,
            url,
            title: post.title,
            description: post.meta_description || post.excerpt,
            image: post.og_image_url || post.featured_image_url,
            publishedAt: post.published_at,
            updatedAt: post.updated_at,
            author: post.author,
          }),
          breadcrumbSchema([
            { name: "בית", url: absoluteUrl(settings.siteUrl, "/") },
            { name: "בלוג", url: absoluteUrl(settings.siteUrl, "/blog") },
            { name: post.title, url },
          ]),
        ]}
      />

      <article>
        <header className="border-b border-line bg-offwhite">
          <div className="container-x flex flex-col gap-5 py-10 lg:py-16">
            <nav aria-label="פירורי לחם" className="font-heading text-sm text-muted">
              <ol className="flex flex-wrap items-center gap-2">
                <li>
                  <Link href="/" className="hover:text-ink">
                    בית
                  </Link>
                </li>
                <li aria-hidden="true">/</li>
                <li>
                  <Link href="/blog" className="hover:text-ink">
                    בלוג
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
              {post.author && <span>מאת {post.author}</span>}
              <span>
                פורסם: <time dateTime={post.published_at}>{published}</time>
              </span>
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

      <CtaSection
        id="quote-form"
        formName="blog_post"
        title="יש לכם פרויקט שמתוכנן בקרוב?"
        subtitle="נשמח להכיר את הצרכים שלכם ולהציע פתרון מקצועי שמותאם בדיוק לעסק שלכם."
      />
    </>
  );
}
