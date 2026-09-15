"use client";

import { useState, type ChangeEvent } from "react";
import { secondaryButton } from "@/lookup/admin/styles";
import { ACCEPTED_IMAGE_TYPES, uploadImage } from "@/lookup/media";

type Props = { label: string; name: string; defaultValue?: string | null; hint?: string; wide?: boolean };

export default function ImageField({ label, name, defaultValue, hint, wide }: Props) {
  const [url, setUrl] = useState(defaultValue ?? "");
  const [status, setStatus] = useState<{ error: boolean; text: string } | null>(null);

  async function onFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setStatus({ error: false, text: "מעלה…" });
    try {
      setUrl(await uploadImage(file));
      setStatus({ error: false, text: "התמונה הועלתה — לחצו שמירה כדי לעדכן" });
    } catch (error) {
      setStatus({ error: true, text: (error as Error).message });
    }
  }

  return (
    <div className={`flex flex-col gap-1.5 ${wide ? "md:col-span-2" : ""}`}>
      <span className="font-heading text-sm font-bold text-ink">{label}</span>
      <div className="flex flex-wrap items-center gap-2">
        <input
          name={name}
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          dir="ltr"
          placeholder="https://…supabase.co/storage/… או /images/…"
          className="field min-w-0 flex-1"
          aria-label={label}
        />
        <label className={`${secondaryButton} cursor-pointer`}>
          העלאה
          <input type="file" accept={ACCEPTED_IMAGE_TYPES.join(",")} className="sr-only" onChange={onFile} />
        </label>
      </div>
      {url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="h-20 w-auto max-w-full rounded border border-line bg-white object-contain" />
      )}
      {status && <span className={`text-xs ${status.error ? "text-red-700" : "text-muted"}`}>{status.text}</span>}
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </div>
  );
}
