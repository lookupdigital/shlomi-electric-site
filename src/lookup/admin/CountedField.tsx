"use client";

import { useId, useState } from "react";
import { t } from "@/lookup/admin/i18n";

type Props = {
  label: string;
  name: string;
  defaultValue?: string | null;
  placeholder?: string;
  /** Recommended maximum length (search results truncate longer text); input is still allowed up to maxLength. */
  recommended: number;
  maxLength: number;
  multiline?: boolean;
  wide?: boolean;
};

/** Text input with a live character counter for SEO fields. */
export default function CountedField({ label, name, defaultValue, placeholder, recommended, maxLength, multiline, wide }: Props) {
  const counterId = useId();
  const [length, setLength] = useState((defaultValue ?? "").length);
  const over = length > recommended;
  const shared = {
    name,
    defaultValue: defaultValue ?? "",
    placeholder,
    maxLength,
    "aria-describedby": counterId,
    onChange: (event: { target: { value: string } }) => setLength(event.target.value.length),
  };

  return (
    <label className={`flex min-w-0 flex-col gap-1.5 ${wide || multiline ? "md:col-span-2" : ""}`}>
      <span className="font-heading text-sm font-bold text-ink">{label}</span>
      {multiline ? <textarea {...shared} className="field h-24 resize-y" /> : <input {...shared} className="field" />}
      <span id={counterId} aria-live="polite" className={`text-xs ${over ? "font-semibold text-amber-700" : "text-muted"}`}>
        {t.common.charCount(length, recommended)}
        {over ? ` — ${t.common.overRecommended}` : ""}
      </span>
    </label>
  );
}
