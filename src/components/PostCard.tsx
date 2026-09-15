import Image from "next/image";
import Link from "next/link";
import type { PostSummary } from "@/lookup/posts";

const dateFormat = new Intl.DateTimeFormat("he-IL", { dateStyle: "long", timeZone: "Asia/Jerusalem" });

export default function PostCard({ post }: { post: PostSummary }) {
  return (
    <article className="relative flex flex-col overflow-hidden rounded-xl bg-white shadow-[0_4px_24px_rgba(22,38,61,0.08)]">
      {post.featured_image_url && (
        <div className="relative h-[240px]">
          <Image
            src={post.featured_image_url}
            alt={post.featured_image_alt ?? ""}
            fill
            sizes="(min-width: 1024px) 416px, (min-width: 640px) 50vw, 100vw"
            className="object-cover"
          />
        </div>
      )}
      <div className="flex flex-1 flex-col gap-2 p-6">
        {post.category && <p className="font-heading text-sm text-brand-dark">{post.category}</p>}
        <h2 className="font-heading text-xl font-semibold leading-[1.3] text-ink">
          <Link href={`/blog/${post.slug}`} className="after:absolute after:inset-0 hover:text-brand-dark">
            {post.title}
          </Link>
        </h2>
        {post.excerpt && <p className="text-[15px] leading-[1.7] text-muted">{post.excerpt}</p>}
        {post.published_at && (
          <time dateTime={post.published_at} className="mt-auto pt-2 text-[13px] text-muted">
            {dateFormat.format(new Date(post.published_at))}
          </time>
        )}
      </div>
    </article>
  );
}
