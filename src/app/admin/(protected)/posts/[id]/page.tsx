import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { t } from "@/lookup/admin/i18n";
import PostForm from "@/lookup/admin/PostForm";
import { secondaryButton } from "@/lookup/admin/styles";
import { PageHeader, StatusBadge } from "@/lookup/admin/ui";
import { requireAdmin } from "@/lookup/auth";
import { siteConfig } from "@/site.config";

export const metadata: Metadata = { title: t.posts.editTitle };

const UUID = /^[0-9a-f-]{36}$/i;

export default async function EditPostPage({ params }: PageProps<"/admin/posts/[id]">) {
  const { id } = await params;
  const { supabase } = await requireAdmin();
  if (!UUID.test(id)) notFound();

  const { data: post } = await supabase.from("posts").select("*").eq("id", id).maybeSingle();
  if (!post) notFound();
  const publicPath = `${siteConfig.routes.blog.path}/${post.slug}`;

  return (
    <>
      <PageHeader
        title={post.title}
        description={publicPath}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge published={post.status === "published"} />
            <Link href={`/admin/preview/posts/${post.id}`} target="_blank" className={secondaryButton}>
              {t.posts.preview}
            </Link>
            {post.status === "published" && (
              <Link href={publicPath} target="_blank" className={secondaryButton}>
                {t.common.viewSite}
              </Link>
            )}
          </div>
        }
      />
      {/* Keyed by id, not updated_at: a remount after saving would wipe the save confirmation message. */}
      <PostForm key={post.id} post={post} />
    </>
  );
}
