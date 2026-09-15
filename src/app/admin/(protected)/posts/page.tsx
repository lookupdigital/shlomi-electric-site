import type { Metadata } from "next";
import Link from "next/link";
import { primaryButton } from "@/lookup/admin/styles";
import { formatDateTime, Notice, PageHeader, StatusBadge } from "@/lookup/admin/ui";
import { requireAdmin } from "@/lookup/auth";

export const metadata: Metadata = { title: "פוסטים" };

export default async function PostsListPage() {
  const { supabase } = await requireAdmin();
  const { data: posts, error } = await supabase
    .from("posts")
    .select("id,title,slug,status,published_at,updated_at")
    .order("updated_at", { ascending: false });

  return (
    <>
      <PageHeader
        title="פוסטים"
        actions={
          <Link href="/admin/posts/new" className={primaryButton}>
            פוסט חדש
          </Link>
        }
      />
      {error && <Notice tone="error">הטעינה נכשלה: {error.message}</Notice>}

      <div className="overflow-x-auto rounded-xl border border-line bg-white">
        <table className="w-full min-w-[640px] text-start text-sm">
          <thead className="bg-offwhite text-muted">
            <tr>
              <th className="px-4 py-3 text-start font-semibold">כותרת</th>
              <th className="px-4 py-3 text-start font-semibold">סטטוס</th>
              <th className="px-4 py-3 text-start font-semibold">פרסום</th>
              <th className="px-4 py-3 text-start font-semibold">עודכן</th>
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
                  {post.status === "published" && (
                    <Link href={`/blog/${post.slug}`} target="_blank" className="text-xs text-muted hover:text-ink">
                      צפייה ↗
                    </Link>
                  )}
                </td>
              </tr>
            ))}
            {!posts?.length && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted">
                  עדיין אין פוסטים.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
