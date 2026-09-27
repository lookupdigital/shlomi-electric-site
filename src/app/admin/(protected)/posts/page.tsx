import type { Metadata } from "next";
import Link from "next/link";
import { postAltFacts } from "@/lookup/alt-facts";
import { t } from "@/lookup/admin/i18n";
import SeoStates from "@/lookup/admin/SeoStates";
import { primaryButton } from "@/lookup/admin/styles";
import { Badge, formatDateTime, Notice, PageHeader, StatusBadge } from "@/lookup/admin/ui";
import { requireAdmin } from "@/lookup/auth";
import { postSeoInput, resolveSeo, seoStates } from "@/lookup/seo-model";
import { getSiteSettings, isIndexable } from "@/lookup/settings";
import { siteConfig } from "@/site.config";

export const metadata: Metadata = { title: t.posts.title };

export default async function PostsListPage({ searchParams }: PageProps<"/admin/posts">) {
  const { supabase } = await requireAdmin();
  const { deleted, alt } = await searchParams;
  // "*" rather than a column list: the page keeps working on a database without migration 8.
  const [{ data, error }, settings] = await Promise.all([
    supabase.from("posts").select("*").order("updated_at", { ascending: false }),
    getSiteSettings(),
  ]);
  const p = t.posts;
  const onlyMissingAlt = alt === "missing";
  const indexable = isIndexable(settings);
  const rows = (data ?? []).map((post) => ({
    post,
    altFacts: postAltFacts(post),
    states: seoStates(resolveSeo(postSeoInput(post, settings, siteConfig.routes.blog.path, indexable))),
  }));
  const posts = onlyMissingAlt ? rows.filter((row) => row.altFacts.total > 0) : rows;

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
      {deleted === "1" && (
        <div className="mb-6">
          <Notice tone="success">{p.deleted}</Notice>
        </div>
      )}
      {error && <Notice tone="error">{t.common.loadFailed(error.message)}</Notice>}
      <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
        {onlyMissingAlt ? (
          <>
            <Badge tone="warning">{p.altFilter}</Badge>
            <Link href="/admin/posts" className="text-muted underline hover:text-ink">
              {p.altFilterClear}
            </Link>
          </>
        ) : (
          rows.some((row) => row.altFacts.total > 0) && (
            <Link href="/admin/posts?alt=missing" className="text-muted underline hover:text-ink">
              {p.altFilter}
            </Link>
          )
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-line bg-white">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-offwhite text-muted">
            <tr>
              <th className="px-4 py-3 text-start font-semibold">{p.columns.title}</th>
              <th className="px-4 py-3 text-start font-semibold">{p.columns.status}</th>
              <th className="px-4 py-3 text-start font-semibold">{p.columns.seo}</th>
              <th className="px-4 py-3 text-start font-semibold">{p.columns.published}</th>
              <th className="px-4 py-3 text-start font-semibold">{p.columns.updated}</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {posts.map(({ post, altFacts, states }) => (
              <tr key={post.id}>
                <td className="px-4 py-3 font-semibold text-ink">
                  <Link href={`/admin/posts/${post.id}`} className="hover:text-brand-dark">
                    {post.title}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge published={post.status === "published"} />
                </td>
                <td className="px-4 py-3">
                  <span className="flex flex-wrap gap-1.5">
                    <SeoStates states={states} />
                    {altFacts.total > 0 && <Badge tone="warning">{p.altMissingBadge(altFacts.total)}</Badge>}
                  </span>
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
            {!posts.length && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted">
                  {onlyMissingAlt ? p.altFilterEmpty : p.empty}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
