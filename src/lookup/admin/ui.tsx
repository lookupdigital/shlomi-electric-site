import type { ReactNode } from "react";

// Small, dependency-free building blocks for the admin (server-safe).

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-semibold text-ink lg:text-3xl">{title}</h1>
        {description && <p className="text-sm text-muted">{description}</p>}
      </div>
      {actions}
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-line bg-white p-5 lg:p-6 ${className}`}>{children}</div>;
}

export function Fieldset({ legend, description, children }: { legend: string; description?: string; children: ReactNode }) {
  return (
    <fieldset className="rounded-xl border border-line bg-white p-5 lg:p-6">
      <legend className="px-2 font-heading text-lg font-semibold text-ink">{legend}</legend>
      {description && <p className="mb-4 text-sm text-muted">{description}</p>}
      <div className="grid gap-5 md:grid-cols-2">{children}</div>
    </fieldset>
  );
}

type InputProps = {
  label: string;
  name: string;
  defaultValue?: string | null;
  placeholder?: string;
  hint?: string;
  type?: string;
  dir?: "ltr" | "rtl";
  required?: boolean;
  maxLength?: number;
  wide?: boolean;
};

export function TextField({ label, name, defaultValue, placeholder, hint, type = "text", dir, required, maxLength, wide }: InputProps) {
  return (
    <label className={`flex flex-col gap-1.5 ${wide ? "md:col-span-2" : ""}`}>
      <span className="font-heading text-sm font-bold text-ink">{label}</span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        dir={dir}
        required={required}
        maxLength={maxLength}
        className="field"
      />
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function TextAreaField({ label, name, defaultValue, placeholder, hint, maxLength, wide = true }: InputProps) {
  return (
    <label className={`flex flex-col gap-1.5 ${wide ? "md:col-span-2" : ""}`}>
      <span className="font-heading text-sm font-bold text-ink">{label}</span>
      <textarea
        name={name}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        maxLength={maxLength}
        className="field h-24 resize-y"
      />
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function CheckboxField({ label, name, defaultChecked, hint }: { label: string; name: string; defaultChecked?: boolean; hint?: string }) {
  return (
    <label className="flex items-start gap-3 md:col-span-2">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="consent mt-0.5" />
      <span className="flex flex-col gap-0.5">
        <span className="font-heading text-sm font-bold text-ink">{label}</span>
        {hint && <span className="text-xs text-muted">{hint}</span>}
      </span>
    </label>
  );
}

export function Notice({ tone = "info", children }: { tone?: "info" | "warning" | "error" | "success"; children: ReactNode }) {
  const tones = {
    info: "border-line bg-white text-ink",
    warning: "border-amber-300 bg-amber-50 text-amber-900",
    error: "border-red-300 bg-red-50 text-red-800",
    success: "border-green-300 bg-green-50 text-green-800",
  };
  return <div className={`rounded-lg border px-4 py-3 text-sm ${tones[tone]}`}>{children}</div>;
}

export function StatusBadge({ published }: { published: boolean }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        published ? "bg-green-100 text-green-800" : "bg-mint text-navy"
      }`}
    >
      {published ? "פורסם" : "טיוטה"}
    </span>
  );
}

const dateTimeFormat = new Intl.DateTimeFormat("he-IL", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "Asia/Jerusalem",
});

export function formatDateTime(value: string | null | undefined): string {
  return value ? dateTimeFormat.format(new Date(value)) : "—";
}
