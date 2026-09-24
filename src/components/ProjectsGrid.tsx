"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Project } from "@/lib/site";

type Props = {
  projects: Project[];
  className?: string;
};

function Chevron({ direction }: { direction: "right" | "left" }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d={direction === "right" ? "M6 3l5 5-5 5" : "M10 3L5 8l5 5"} />
    </svg>
  );
}

export default function ProjectsGrid({
  projects,
  className = "grid gap-x-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-3",
}: Props) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [imageIndex, setImageIndex] = useState(0);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const touchStartX = useRef<number | null>(null);

  const openProject = projects[openIndex ?? -1] ?? null;
  const total = openProject?.images.length ?? 0;

  const step = useCallback(
    (delta: number) => {
      if (!total) return;
      setImageIndex((current) => (current + delta + total) % total);
    },
    [total],
  );

  // Native <dialog> gives us the focus trap, Esc to close and focus restore for free.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (openIndex !== null && !dialog.open) dialog.showModal();
    if (openIndex === null && dialog.open) dialog.close();
  }, [openIndex]);

  // The page behind the gallery must not scroll while it is open.
  useEffect(() => {
    if (openIndex === null) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [openIndex]);

  useEffect(() => {
    if (openIndex === null) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        step(1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        step(-1);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [openIndex, step]);

  function open(index: number) {
    setImageIndex(0);
    setOpenIndex(index);
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(delta) > 50) step(delta < 0 ? 1 : -1);
    touchStartX.current = null;
  }

  return (
    <>
      <div className={className}>
        {projects.map((project, index) => (
          <button
            key={project.slug}
            type="button"
            aria-haspopup="dialog"
            onClick={() => open(index)}
            className="group flex flex-col overflow-hidden rounded-xl bg-white text-start shadow-[0_4px_24px_rgba(22,38,61,0.08)] transition-shadow hover:shadow-[0_8px_32px_rgba(22,38,61,0.16)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            <div className="relative h-[240px] w-full overflow-hidden">
              <Image
                src={project.images[0].src}
                alt={project.images[0].alt}
                fill
                sizes="(min-width: 1024px) 416px, (min-width: 640px) 50vw, 100vw"
                className="object-cover transition-transform duration-300 group-hover:scale-[1.04]"
              />
              <span className="absolute bottom-3 end-3 rounded-full bg-black/55 px-3 py-1 font-heading text-[13px] text-white">
                {project.images.length} תמונות
              </span>
            </div>
            <div className="flex flex-col gap-1.5 p-6">
              {project.category && <p className="font-heading text-sm text-brand-dark">{project.category}</p>}
              <h3 className="font-heading text-xl font-semibold leading-[1.3] text-ink">{project.title}</h3>
            </div>
          </button>
        ))}
      </div>

      <dialog
        ref={dialogRef}
        onClose={() => setOpenIndex(null)}
        onClick={(e) => {
          // A click on the backdrop lands on the dialog element itself.
          if (e.target === dialogRef.current) setOpenIndex(null);
        }}
        aria-label={openProject ? `תמונות מהפרויקט ${openProject.title}` : "גלריית פרויקטים"}
        className="m-auto w-[min(1100px,94vw)] max-w-none rounded-xl bg-graphite p-0 text-white backdrop:bg-black/75"
      >
        {/* Every project's gallery stays in the HTML so the photos and their descriptions are crawlable;
            only the open project is displayed. */}
        {projects.map((project, projectIndex) => {
          const isOpen = projectIndex === openIndex;
          const current = Math.min(imageIndex, project.images.length - 1);
          return (
            <div
              key={project.slug}
              className={isOpen ? "flex flex-col" : "hidden"}
              onTouchStart={(e) => {
                touchStartX.current = e.touches[0].clientX;
              }}
              onTouchEnd={onTouchEnd}
            >
              <div className="flex items-start justify-between gap-4 p-5 sm:p-6">
                <div className="flex flex-col gap-1">
                  {project.category && <p className="font-heading text-sm text-brand">{project.category}</p>}
                  <h3 className="font-heading text-xl font-semibold">{project.title}</h3>
                </div>
                <button
                  type="button"
                  aria-label="סגירת הגלריה"
                  onClick={() => setOpenIndex(null)}
                  className="grid size-9 shrink-0 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </div>

              <div className="relative aspect-[4/3] w-full bg-black sm:aspect-[3/2]">
                {project.images.map((image, i) => (
                  <Image
                    key={image.src}
                    src={image.src}
                    alt={image.alt}
                    fill
                    sizes="(min-width: 1100px) 1100px, 94vw"
                    className={`object-contain ${i === current ? "" : "hidden"}`}
                  />
                ))}

                {project.images.length > 1 && (
                  <>
                    <button
                      type="button"
                      aria-label="התמונה הקודמת"
                      onClick={() => step(-1)}
                      className="absolute start-3 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-black/55 text-white transition-colors hover:bg-black/75"
                    >
                      <Chevron direction="right" />
                    </button>
                    <button
                      type="button"
                      aria-label="התמונה הבאה"
                      onClick={() => step(1)}
                      className="absolute end-3 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-black/55 text-white transition-colors hover:bg-black/75"
                    >
                      <Chevron direction="left" />
                    </button>
                  </>
                )}
              </div>

              <div className="flex items-center justify-between gap-4 p-5 sm:p-6">
                <div className="flex gap-2">
                  {project.images.map((image, i) => (
                    <button
                      key={image.src}
                      type="button"
                      aria-label={`תמונה ${i + 1}`}
                      aria-current={i === current}
                      onClick={() => setImageIndex(i)}
                      className={`relative h-12 w-16 shrink-0 overflow-hidden rounded-md transition-opacity ${
                        i === current ? "opacity-100 ring-2 ring-brand" : "opacity-55 hover:opacity-100"
                      }`}
                    >
                      <Image src={image.src} alt="" fill sizes="64px" className="object-cover" />
                    </button>
                  ))}
                </div>
                <p className="font-heading text-sm text-[#8a9bb0]" dir="ltr">
                  {current + 1} / {project.images.length}
                </p>
              </div>
            </div>
          );
        })}
      </dialog>
    </>
  );
}
