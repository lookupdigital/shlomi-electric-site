import type { Metadata } from "next";
import { deleteMedia } from "@/lookup/admin/actions/media";
import ConfirmSubmit from "@/lookup/admin/ConfirmSubmit";
import { t } from "@/lookup/admin/i18n";
import { loadMediaUsage } from "@/lookup/admin/media-usage";
import { smallDangerButton } from "@/lookup/admin/styles";
import { Badge, formatDateTime, Notice, PageHeader } from "@/lookup/admin/ui";
import { requireAdmin } from "@/lookup/auth";
import { isManagedUploadPath, MEDIA_BUCKET, UPLOADS_FOLDER } from "@/lookup/media-rules";

export const metadata: Metadata = { title: t.media.title };

type MediaFile = { path: string; size: number | null; createdAt: string | null };

const formatSize = (bytes: number | null) => (bytes === null ? t.common.empty : bytes < 1024 * 1024 ? `${Math.ceil(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`);

export default async function MediaPage({ searchParams }: PageProps<"/admin/media">) {
  const { supabase } = await requireAdmin();
  const { deleted, error: errorParam } = await searchParams;
  const storage = supabase.storage.from(MEDIA_BUCKET);
  const m = t.media;

  // Only files created by the admin uploader (uploads/<YYYY-MM>/<uuid>.<ext>) are listed and deletable.
  const files: MediaFile[] = [];
  let loadError: string | null = null;
  const { data: folders, error: foldersError } = await storage.list(UPLOADS_FOLDER, { limit: 1000, sortBy: { column: "name", order: "desc" } });
  if (foldersError) loadError = foldersError.message;
  for (const folder of folders ?? []) {
    if (folder.id !== null) continue;
    const { data, error } = await storage.list(`${UPLOADS_FOLDER}/${folder.name}`, { limit: 1000, sortBy: { column: "created_at", order: "desc" } });
    if (error) loadError = error.message;
    for (const object of data ?? []) {
      const path = `${UPLOADS_FOLDER}/${folder.name}/${object.name}`;
      if (object.id === null || !isManagedUploadPath(path)) continue;
      const size = (object.metadata as { size?: number } | null)?.size;
      files.push({ path, size: typeof size === "number" ? size : null, createdAt: object.created_at });
    }
  }

  let usage: Map<string, string[]> | null = null;
  let usageError: string | null = null;
  try {
    usage = await loadMediaUsage(supabase);
  } catch (error) {
    usageError = (error as Error).message;
  }

  return (
    <>
      <PageHeader title={m.title} description={m.description} />
      <div className="flex flex-col gap-6">
        {deleted === "1" && <Notice tone="success">{m.deleted}</Notice>}
        {typeof errorParam === "string" && <Notice tone="error">{errorParam}</Notice>}
        {loadError && <Notice tone="error">{t.common.loadFailed(loadError)}</Notice>}
        {usageError && <Notice tone="error">{m.usageUnavailable(usageError)}</Notice>}

        <div className="overflow-x-auto rounded-xl border border-line bg-white">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-offwhite text-muted">
              <tr>
                {[m.columns.preview, m.columns.file, m.columns.size, m.columns.uploaded, m.columns.usage, ""].map((heading, index) => (
                  <th key={index} className="px-4 py-3 text-start font-semibold">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {files.map((file) => {
                const usedIn = usage?.get(file.path);
                const url = storage.getPublicUrl(file.path).data.publicUrl;
                return (
                  <tr key={file.path}>
                    <td className="px-4 py-3">
                      <a href={url} target="_blank" rel="noreferrer">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt="" loading="lazy" className="h-12 w-20 rounded border border-line bg-offwhite object-contain" />
                      </a>
                    </td>
                    <td className="max-w-[260px] truncate px-4 py-3 text-xs text-muted" dir="ltr" title={file.path}>
                      {file.path}
                    </td>
                    <td className="px-4 py-3 text-muted">{formatSize(file.size)}</td>
                    <td className="px-4 py-3 text-muted">{formatDateTime(file.createdAt)}</td>
                    <td className="px-4 py-3">
                      {usedIn ? <span className="text-xs text-ink">{usedIn.join(" · ")}</span> : usage && <Badge tone="muted">{m.unused}</Badge>}
                    </td>
                    <td className="px-4 py-3 text-end">
                      {usage && !usedIn && (
                        <form action={deleteMedia}>
                          <input type="hidden" name="path" value={file.path} />
                          <ConfirmSubmit message={m.deleteConfirm} className={smallDangerButton}>
                            {m.delete}
                          </ConfirmSubmit>
                        </form>
                      )}
                    </td>
                  </tr>
                );
              })}
              {files.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted">
                    {m.empty}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
