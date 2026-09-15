import type { Metadata } from "next";
import PostForm from "@/lookup/admin/PostForm";
import { PageHeader } from "@/lookup/admin/ui";
import { requireAdmin } from "@/lookup/auth";

export const metadata: Metadata = { title: "פוסט חדש" };

export default async function NewPostPage() {
  await requireAdmin();
  return (
    <>
      <PageHeader title="פוסט חדש" />
      <PostForm post={null} />
    </>
  );
}
