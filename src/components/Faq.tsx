"use client";

import Image from "next/image";
import { useId, useState } from "react";

export type FaqItem = { q: string; a: string };

type Props = {
  items: FaqItem[];
  defaultOpen?: number[];
};

export default function Faq({ items, defaultOpen = [] }: Props) {
  const id = useId();
  const [open, setOpen] = useState(() => new Set(defaultOpen));

  function toggle(i: number) {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  return (
    <section className="bg-page">
      <div className="container-x flex flex-col items-center gap-12 py-16 lg:py-20">
        <h2 className="h2 text-center">שאלות נפוצות</h2>
        <div className="flex w-full max-w-[800px] flex-col gap-4">
          {items.map((item, i) => {
            const isOpen = open.has(i);
            return (
              <div key={item.q} className="rounded-xl border border-line bg-white">
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={`${id}-${i}`}
                  onClick={() => toggle(i)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-5 text-start sm:px-8 sm:py-6"
                >
                  <span className="font-heading text-lg font-semibold text-ink">{item.q}</span>
                  <Image
                    src="/icons/chevron-down.svg"
                    alt=""
                    width={20}
                    height={20}
                    className={`shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {isOpen && (
                  <p id={`${id}-${i}`} className="-mt-3 px-5 pb-5 text-[15px] leading-[1.7] text-muted sm:px-8 sm:pb-6">
                    {item.a}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
