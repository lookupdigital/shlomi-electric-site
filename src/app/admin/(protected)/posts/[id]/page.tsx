import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PostForm from "@/lookup/admin/PostForm";
import { secondaryButton } from "@/lookup/admin/styles";
import { PageHeader, StatusBadge } from "@/lookup/admin/ui";
import { requireAdmin } from "@/lookup/auth";
import type { PostRow } from "@/lookup/posts";

export const metadata: Metadata = { title: "עריכת פוסט" };

export default async function EditPostPage({ params }: PageProps<"/admin/posts/[id]">) {
  const { id } = await params;
  const { supabase } = await requireAdmin();
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const { data } = await supabase.from("posts").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const post = data as PostRow;

  return (
    <>
      <PageHeader
        title={post.title}
        description={`/blog/${post.slug}`}
        actions={
          <div className="flex items-center gap-3">
            <StatusBadge published={post.status === "published"} />
            {post.status === "published" && (
              <Link href={`/blog/${post.slug}`} target="_blank" className={secondaryButton}>
                צפייה באתר ↗
              </Link>
            )}
          </div>
        }
      />
      <PostForm key={post.updated_at} post={post} />
    </>
  );
}
