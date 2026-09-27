import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { deletePost } from "@/lookup/admin/actions/posts";
import AdminForm from "@/lookup/admin/AdminForm";
import { t } from "@/lookup/admin/i18n";
import PostForm from "@/lookup/admin/PostForm";
import { secondaryButton } from "@/lookup/admin/styles";
import { Card, PageHeader, StatusBadge } from "@/lookup/admin/ui";
import { requireAdmin } from "@/lookup/auth";
import { seoSettings } from "@/lookup/seo-model";
import { getSiteSettings, isIndexable } from "@/lookup/settings";
import { siteConfig } from "@/site.config";

export const metadata: Metadata = { title: t.posts.editTitle };

const UUID = /^[0-9a-f-]{36}$/i;

export default async function EditPostPage({ params }: PageProps<"/admin/posts/[id]">) {
  const { id } = await params;
  const { supabase, user } = await requireAdmin();
  if (!UUID.test(id)) notFound();

  const [{ data: post }, settings] = await Promise.all([supabase.from("posts").select("*").eq("id", id).maybeSingle(), getSiteSettings()]);
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
      <PostForm key={post.id} post={post} editorId={user.id} seo={{ settings: seoSettings(settings), indexable: isIndexable(settings) }} />

      <Card className="mt-10 border-red-200">
        <h2 className="mb-2 font-heading text-lg font-semibold text-red-800">{t.posts.deleteTitle}</h2>
        <p className="mb-3 text-sm text-muted">
          {t.posts.deleteDescription} <strong className="text-ink">{t.posts.deleteConfirmWord}</strong>
        </p>
        <AdminForm action={deletePost} submitLabel={t.posts.deleteSubmit} variant="inline" danger>
          <input type="hidden" name="id" value={post.id} />
          <label className="flex max-w-sm flex-col gap-1.5">
            <span className="text-xs font-bold text-ink">{t.posts.deleteConfirmLabel}</span>
            <input name="confirm" required autoComplete="off" className="field" />
          </label>
        </AdminForm>
      </Card>
    </>
  );
}
