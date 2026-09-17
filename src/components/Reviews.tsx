"use client";

import { useState, type KeyboardEvent, type TouchEvent } from "react";
import { reviews } from "@/lib/site";

function ArrowButton({
  direction,
  label,
  onClick,
}: {
  direction: "right" | "left";
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="grid size-10 shrink-0 place-items-center rounded-full border border-[#e8ebf0] bg-white text-ink shadow-[0_2px_4px_rgba(22,38,61,0.04)] transition-colors hover:border-brand hover:text-brand-dark"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <path d={direction === "right" ? "M6 3l5 5-5 5" : "M10 3L5 8l5 5"} />
      </svg>
    </button>
  );
}

export default function Reviews() {
  const total = reviews.length;
  const [active, setActive] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  const go = (index: number) => setActive((index + total) % total);
  const review = reviews[active];

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      go(active + 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      go(active - 1);
    }
  }

  function handleTouchEnd(e: TouchEvent<HTMLDivElement>) {
    if (touchStartX === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(delta) > 50) go(delta < 0 ? active + 1 : active - 1);
    setTouchStartX(null);
  }

  return (
    <section className="bg-white">
      <div className="container-x flex flex-col gap-12 py-16 lg:py-20">
        <h2 className="h2 text-center">לקוחות שכבר עבדו איתנו מספרים</h2>

        <div
          className="mx-auto flex w-full max-w-[880px] flex-col gap-8 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand"
          role="region"
          aria-roledescription="קרוסלה"
          aria-label="המלצות לקוחות"
          tabIndex={0}
          onKeyDown={handleKeyDown}
          onTouchStart={(e) => setTouchStartX(e.touches[0].clientX)}
          onTouchEnd={handleTouchEnd}
        >
          <article
            key={active}
            aria-live="polite"
            className="fade-in flex min-h-[340px] flex-col gap-6 rounded-xl bg-graphite p-7 shadow-[0_8px_24px_rgba(22,38,61,0.16)] sm:p-10"
          >
            <div className="flex items-start justify-between gap-4">
              <p className="font-heading text-sm font-semibold text-brand">{review.company}</p>
              <span aria-hidden="true" className="font-heading text-4xl leading-none text-brand/60">
                ”
              </span>
            </div>

            <div className="flex flex-1 flex-col gap-4 text-[15px] leading-[1.9] text-[#cbd5e0] sm:text-base">
              {review.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>

            <footer className="flex items-center gap-3 border-t border-white/10 pt-6">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand font-heading text-sm font-bold text-white">
                {review.name.charAt(0)}
              </span>
              <span className="flex flex-col gap-0.5">
                <span className="font-heading text-[15px] font-semibold text-white">{review.name}</span>
                <span className="text-[13px] text-[#8a9bb0]">
                  {review.role ? `${review.role}, ${review.company}` : review.company}
                </span>
              </span>
            </footer>
          </article>

          <div className="flex items-center justify-center gap-4">
            <ArrowButton direction="right" label="ההמלצה הקודמת" onClick={() => go(active - 1)} />
            <div className="flex items-center">
              {reviews.map((item, i) => (
                <button
                  key={item.name}
                  type="button"
                  aria-label={`המלצה ${i + 1} מתוך ${total}`}
                  aria-current={i === active}
                  onClick={() => go(i)}
                  className="px-1 py-3"
                >
                  <span
                    className={`block h-2 rounded-full transition-all ${
                      i === active ? "w-[21px] bg-brand" : "w-2 bg-mint"
                    }`}
                  />
                </button>
              ))}
            </div>
            <ArrowButton direction="left" label="ההמלצה הבאה" onClick={() => go(active + 1)} />
          </div>
        </div>
      </div>
    </section>
  );
}
