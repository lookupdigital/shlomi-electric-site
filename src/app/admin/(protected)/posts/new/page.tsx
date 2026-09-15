import type { Metadata } from "next";
import { t } from "@/lookup/admin/i18n";
import PostForm from "@/lookup/admin/PostForm";
import { PageHeader } from "@/lookup/admin/ui";
import { requireAdmin } from "@/lookup/auth";

export const metadata: Metadata = { title: t.posts.newPost };

export default async function NewPostPage() {
  await requireAdmin();
  return (
    <>
      <PageHeader title={t.posts.newPost} />
      <PostForm post={null} />
    </>
  );
}
