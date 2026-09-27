"use client";

import { useEffect, useRef, useState } from "react";
import { t } from "@/lookup/admin/i18n";
import SeoStates from "@/lookup/admin/SeoStates";
import { pageSeoInput, postSeoInput, resolveSeo, seoStates, type SeoInput, type SeoSettings } from "@/lookup/seo-model";
import { slugify } from "@/lookup/slug";

export type SeoTarget =
  | { kind: "page"; route: { path: string; title?: string; description?: string } }
  | { kind: "post"; blogPath: string };

type Props = { settings: SeoSettings; indexable: boolean; target: SeoTarget };

const READ_INTERVAL_MS = 500;

/** The SEO input for the current (unsaved) form values — the same resolution the live page metadata uses. */
export function seoInputFromForm(form: FormData, { settings, indexable, target }: Props): SeoInput {
  const text = (name: string) => {
    const value = form.get(name);
    return typeof value === "string" ? value : "";
  };
  const seo = {
    meta_title: text("meta_title"),
    meta_description: text("meta_description"),
    canonical_url: text("canonical_url"),
    og_title: text("og_title"),
    og_description: text("og_description"),
    og_image_url: text("og_image_url"),
    robots_index: form.get("robots_index") === "on",
    robots_follow: form.get("robots_follow") === "on",
  };
  if (target.kind === "page") return pageSeoInput(target.route, seo, settings, indexable);
  const title = text("title").trim();
  return postSeoInput(
    { ...seo, title, slug: slugify(text("slug") || title), excerpt: text("excerpt") || null, featured_image_url: text("featured_image_url") || null },
    settings,
    target.blogPath,
    indexable,
  );
}

/** Re-reads a value from the surrounding form twice a second (fields such as images and the editor fire no events). */
export function useFormValue<T>(read: (form: FormData) => T) {
  const anchor = useRef<HTMLDivElement>(null);
  const reader = useRef(read);
  const [value, setValue] = useState<T | null>(null);
  useEffect(() => {
    reader.current = read;
  });
  useEffect(() => {
    let previous = "";
    const tick = () => {
      const form = anchor.current?.closest("form");
      if (!form) return;
      const next = reader.current(new FormData(form));
      const key = JSON.stringify(next);
      if (key !== previous) {
        previous = key;
        setValue(next);
      }
    };
    tick();
    const timer = window.setInterval(tick, READ_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, []);
  return { anchor, value };
}

function useResolvedSeo(props: Props) {
  const { anchor, value } = useFormValue((form) => resolveSeo(seoInputFromForm(form, props)));
  return { anchor, resolved: value };
}

function displayUrl(url: string) {
  try {
    const parsed = new URL(url);
    return `${parsed.host}${parsed.pathname === "/" ? "" : decodeURI(parsed.pathname).replace(/\//g, " › ")}`;
  } catch {
    return url;
  }
}

/** Google-style search result for the current form values, with the factual SEO states. */
export function GooglePreview(props: Props) {
  const { anchor, resolved } = useResolvedSeo(props);
  return (
    <div ref={anchor} className="flex min-w-0 flex-col gap-2 md:col-span-2">
      <span className="font-heading text-sm font-bold text-ink">{t.seo.googlePreview}</span>
      {resolved && (
        <>
          <div className="min-w-0 rounded-lg border border-line bg-white p-4" dir="auto">
            <p className="truncate text-xs text-muted" dir="ltr">
              {displayUrl(resolved.canonical)}
            </p>
            <p className="mt-1 line-clamp-1 break-words text-lg leading-snug text-[#1a0dab]">{resolved.title}</p>
            <p className="mt-1 line-clamp-2 break-words text-sm text-[#4d5156]">{resolved.description ?? ""}</p>
          </div>
          <SeoStates states={seoStates(resolved)} />
          {!props.indexable && <span className="text-xs text-muted">{t.seo.globalIndexingOff}</span>}
          <span className="text-xs text-muted">{t.seo.previewNote}</span>
        </>
      )}
    </div>
  );
}

/** Link-share card for the current form values. */
export function SocialPreview(props: Props) {
  const { anchor, resolved } = useResolvedSeo(props);
  const [failed, setFailed] = useState<string | null>(null);
  return (
    <div ref={anchor} className="flex min-w-0 flex-col gap-2 md:col-span-2">
      <span className="font-heading text-sm font-bold text-ink">{t.seo.socialPreview}</span>
      {resolved && (
        <div className="w-full max-w-md overflow-hidden rounded-lg border border-line bg-white" dir="auto">
          <div className="flex aspect-[1200/630] items-center justify-center bg-offwhite text-xs text-muted">
            {failed === resolved.ogImage.url ? (
              <span className="px-4 text-center">{resolved.ogImage.generated ? t.seo.generatedImage : resolved.ogImage.url}</span>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element -- arbitrary external URLs; next/image needs configured hosts
              <img src={resolved.ogImage.url} alt="" className="h-full w-full object-cover" onError={() => setFailed(resolved.ogImage.url)} />
            )}
          </div>
          <div className="flex flex-col gap-0.5 border-t border-line p-3">
            <span className="truncate text-xs uppercase text-muted" dir="ltr">
              {displayUrl(resolved.canonical).split(" ")[0]}
            </span>
            <span className="line-clamp-2 break-words font-semibold text-ink">{resolved.ogTitle}</span>
            <span className="line-clamp-2 break-words text-sm text-muted">{resolved.ogDescription ?? ""}</span>
          </div>
        </div>
      )}
    </div>
  );
}
