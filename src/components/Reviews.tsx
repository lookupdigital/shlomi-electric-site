"use client";

import { useState } from "react";
import { reviews, type Review } from "@/lib/site";

function ReviewCard({ review, featured, className = "" }: { review: Review; featured: boolean; className?: string }) {
  return (
    <figure
      className={`flex flex-col gap-5 rounded-xl p-8 shadow-[0_8px_16px_rgba(22,38,61,0.1)] ${
        featured ? "bg-graphite" : "bg-offwhite"
      } ${className}`}
    >
      <p className="flex gap-1 text-lg leading-none text-brand" aria-label="5 מתוך 5 כוכבים">
        {"★★★★★".split("").map((star, i) => (
          <span key={i} aria-hidden="true">
            {star}
          </span>
        ))}
      </p>
      <blockquote className={`text-[15px] leading-[1.7] ${featured ? "text-[#cbd5e0]" : "text-coal"}`}>
        ”{review.quote}”
      </blockquote>
      <figcaption className="flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand font-heading text-sm font-bold text-white">
          {review.name.charAt(0)}
        </span>
        <span className="flex flex-col gap-0.5">
          <span className={`font-heading text-[15px] font-semibold ${featured ? "text-white" : "text-coal"}`}>{review.name}</span>
          <span className={`text-[13px] ${featured ? "text-[#8a9bb0]" : "text-graphite"}`}>{review.role}</span>
        </span>
      </figcaption>
    </figure>
  );
}

function ArrowButton({ direction, label, onClick }: { direction: "right" | "left"; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="grid size-10 place-items-center rounded-full border border-[#e8ebf0] bg-white text-ink shadow-[0_2px_4px_rgba(22,38,61,0.04)] transition-colors hover:border-brand"
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <path d={direction === "right" ? "M6 3l5 5-5 5" : "M10 3L5 8l5 5"} />
      </svg>
    </button>
  );
}

export default function Reviews() {
  const n = reviews.length;
  const [active, setActive] = useState(Math.floor(n / 2));
  const at = (k: number) => (k + n) % n;
  const visible = [at(active - 1), active, at(active + 1)];

  return (
    <section className="bg-white">
      <div className="container-x flex flex-col gap-12 py-16 lg:py-20">
        <h2 className="h2 text-center">לקוחות שכבר עבדו איתנו מספרים</h2>

        <div className="grid gap-4 lg:grid-cols-3 lg:items-center">
          {visible.map((index, pos) => (
            <ReviewCard
              key={pos}
              review={reviews[index]}
              featured={pos === 1}
              className={pos === 1 ? "" : "hidden lg:flex"}
            />
          ))}
        </div>

        <div className="flex items-center justify-center gap-4">
          <ArrowButton direction="right" label="ההמלצה הקודמת" onClick={() => setActive(at(active - 1))} />
          <div className="flex items-center">
            {reviews.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`המלצה ${i + 1}`}
                aria-current={i === active}
                onClick={() => setActive(i)}
                className="px-1 py-3"
              >
                <span className={`block h-2 rounded-full transition-all ${i === active ? "w-[21px] bg-brand" : "w-2 bg-mint"}`} />
              </button>
            ))}
          </div>
          <ArrowButton direction="left" label="ההמלצה הבאה" onClick={() => setActive(at(active + 1))} />
        </div>
      </div>
    </section>
  );
}
