import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import BlogPostView from "@/components/BlogPostView";
import SiteChrome from "@/components/SiteChrome";
import { t } from "@/lookup/admin/i18n";
import { requireAdmin } from "@/lookup/auth";
import { getSiteSettings } from "@/lookup/settings";

export const metadata: Metadata = { title: t.preview.pageTitle, robots: { index: false, follow: false } };

const UUID = /^[0-9a-f-]{36}$/i;

/** Draft preview: renders the saved post with the public template. Admin session required; never cached or indexed. */
export default async function PostPreviewPage({ params }: PageProps<"/admin/preview/posts/[id]">) {
  const { id } = await params;
  const { supabase } = await requireAdmin();
  if (!UUID.test(id)) notFound();

  const [{ data: post }, settings] = await Promise.all([
    supabase.from("posts").select("*").eq("id", id).maybeSingle(),
    getSiteSettings(),
  ]);
  if (!post) notFound();

  return (
    <div className="flex min-h-screen flex-col bg-page">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-amber-100 px-5 py-2 text-sm text-amber-900">
        <span>{t.preview.banner(post.status === "published" ? t.posts.published : t.posts.draft)}</span>
        <Link href={`/admin/posts/${post.id}`} className="font-semibold underline">
          {t.preview.backToEditor}
        </Link>
      </div>
      <SiteChrome settings={settings}>
        <BlogPostView post={post} />
      </SiteChrome>
    </div>
  );
}
