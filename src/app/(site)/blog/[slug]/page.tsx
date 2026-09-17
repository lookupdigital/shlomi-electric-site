import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BlogPostView from "@/components/BlogPostView";
import CtaSection from "@/components/CtaSection";
import { getPublishedPost, getPublishedPosts, type PostRow } from "@/lookup/posts";
import { blogPostingSchema, breadcrumbSchema, JsonLd } from "@/lookup/schema";
import { composeMetadata } from "@/lookup/seo-model";
import { getSiteSettings, isIndexable } from "@/lookup/settings";
import { absoluteUrl } from "@/lookup/settings-model";
import { siteConfig } from "@/site.config";

type Props = PageProps<"/blog/[slug]">;

const blog = siteConfig.routes.blog;

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

const postPath = (slug: string) => `${blog.path}/${encodeURIComponent(slug)}`;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await loadPost(params);
  if (!post) return { robots: { index: false, follow: false } };
  const settings = await getSiteSettings();
  return composeMetadata({
    settings,
    ogLocale: siteConfig.locale.ogLocale,
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
  const home = siteConfig.routes.corePages[0];

  return (
    <>
      <JsonLd
        data={[
          blogPostingSchema({
            settings,
            config: siteConfig,
            url,
            title: post.title,
            description: post.meta_description || post.excerpt,
            image: post.og_image_url || post.featured_image_url,
            publishedAt: post.published_at,
            updatedAt: post.updated_at,
            author: post.author,
          }),
          breadcrumbSchema([
            { name: home.navLabel ?? home.label, url: absoluteUrl(settings.siteUrl, home.path) },
            { name: blog.navLabel ?? blog.label, url: absoluteUrl(settings.siteUrl, blog.path) },
            { name: post.title, url },
          ]),
        ]}
      />
      <BlogPostView post={post} />
      <CtaSection
        id="quote-form"
        formName="blog_post"
        title="יש לכם פרויקט שמתוכנן בקרוב?"
        subtitle="נשמח להכיר את הצרכים שלכם ולהציע פתרון מקצועי שמותאם בדיוק לעסק שלכם."
      />
    </>
  );
}
