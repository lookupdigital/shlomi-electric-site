import type { Metadata } from "next";
import Link from "next/link";
import { t } from "@/lookup/admin/i18n";
import { primaryButton } from "@/lookup/admin/styles";
import { formatDateTime, Notice, PageHeader, StatusBadge } from "@/lookup/admin/ui";
import { requireAdmin } from "@/lookup/auth";
import { siteConfig } from "@/site.config";

export const metadata: Metadata = { title: t.posts.title };

export default async function PostsListPage() {
  const { supabase } = await requireAdmin();
  const { data: posts, error } = await supabase
    .from("posts")
    .select("id,title,slug,status,published_at,updated_at")
    .order("updated_at", { ascending: false });
  const p = t.posts;

  return (
    <>
      <PageHeader
        title={p.title}
        actions={
          <Link href="/admin/posts/new" className={primaryButton}>
            {p.newPost}
          </Link>
        }
      />
      {error && <Notice tone="error">{t.common.loadFailed(error.message)}</Notice>}

      <div className="overflow-x-auto rounded-xl border border-line bg-white">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-offwhite text-muted">
            <tr>
              <th className="px-4 py-3 text-start font-semibold">{p.columns.title}</th>
              <th className="px-4 py-3 text-start font-semibold">{p.columns.status}</th>
              <th className="px-4 py-3 text-start font-semibold">{p.columns.published}</th>
              <th className="px-4 py-3 text-start font-semibold">{p.columns.updated}</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {posts?.map((post) => (
              <tr key={post.id}>
                <td className="px-4 py-3 font-semibold text-ink">
                  <Link href={`/admin/posts/${post.id}`} className="hover:text-brand-dark">
                    {post.title}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge published={post.status === "published"} />
                </td>
                <td className="px-4 py-3 text-muted">{formatDateTime(post.published_at)}</td>
                <td className="px-4 py-3 text-muted">{formatDateTime(post.updated_at)}</td>
                <td className="px-4 py-3 text-end">
                  <Link
                    href={post.status === "published" ? `${siteConfig.routes.blog.path}/${post.slug}` : `/admin/preview/posts/${post.id}`}
                    target="_blank"
                    className="text-xs text-muted hover:text-ink"
                  >
                    {post.status === "published" ? p.view : p.preview}
                  </Link>
                </td>
              </tr>
            ))}
            {!posts?.length && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted">
                  {p.empty}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
