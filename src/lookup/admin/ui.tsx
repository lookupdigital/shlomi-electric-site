import type { ReactNode } from "react";
import { t } from "@/lookup/admin/i18n";
import type { LeadStatus } from "@/lookup/leads/filters";
import { siteConfig } from "@/site.config";

// Small, dependency-free building blocks for the admin (server-safe).

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="break-words font-heading text-2xl font-semibold text-ink lg:text-3xl">{title}</h1>
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
    <fieldset className="min-w-0 rounded-xl border border-line bg-white p-5 lg:p-6">
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
  /** Extra content under the input, e.g. a status badge. */
  extra?: ReactNode;
};

export function TextField({ label, name, defaultValue, placeholder, hint, type = "text", dir, required, maxLength, wide, extra }: InputProps) {
  return (
    <label className={`flex min-w-0 flex-col gap-1.5 ${wide ? "md:col-span-2" : ""}`}>
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
      {extra}
    </label>
  );
}

export function TextAreaField({ label, name, defaultValue, placeholder, hint, maxLength, wide = true }: InputProps) {
  return (
    <label className={`flex min-w-0 flex-col gap-1.5 ${wide ? "md:col-span-2" : ""}`}>
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

export function SelectField({
  label,
  name,
  defaultValue,
  options,
  hint,
  wide,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  options: { value: string; label: string }[];
  hint?: string;
  wide?: boolean;
}) {
  return (
    <label className={`flex min-w-0 flex-col gap-1.5 ${wide ? "md:col-span-2" : ""}`}>
      <span className="font-heading text-sm font-bold text-ink">{label}</span>
      <select name={name} defaultValue={defaultValue} className="field">
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
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

export type Tone = "info" | "warning" | "error" | "success" | "muted";

const NOTICE_TONES: Record<Tone, string> = {
  info: "border-line bg-white text-ink",
  muted: "border-line bg-offwhite text-muted",
  warning: "border-amber-300 bg-amber-50 text-amber-900",
  error: "border-red-300 bg-red-50 text-red-800",
  success: "border-green-300 bg-green-50 text-green-800",
};

export function Notice({ tone = "info", children }: { tone?: Tone; children: ReactNode }) {
  return <div className={`rounded-lg border px-4 py-3 text-sm ${NOTICE_TONES[tone]}`}>{children}</div>;
}

const BADGE_TONES: Record<Tone, string> = {
  info: "bg-mint text-navy",
  muted: "bg-offwhite text-muted",
  warning: "bg-amber-100 text-amber-900",
  error: "bg-red-100 text-red-800",
  success: "bg-green-100 text-green-800",
};

export function Badge({ tone = "info", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={`inline-flex w-fit rounded-full px-2.5 py-0.5 text-xs font-semibold ${BADGE_TONES[tone]}`}>{children}</span>
  );
}

export function StatusBadge({ published }: { published: boolean }) {
  return <Badge tone={published ? "success" : "info"}>{published ? t.posts.published : t.posts.draft}</Badge>;
}

const LEAD_STATUS_TONES: Record<LeadStatus, Tone> = { new: "warning", contacted: "info", closed: "success", spam: "muted" };

export function LeadStatusBadge({ status }: { status: string }) {
  const known = (status in LEAD_STATUS_TONES ? status : "new") as LeadStatus;
  return <Badge tone={LEAD_STATUS_TONES[known]}>{t.leads.status[known]}</Badge>;
}

const dateTimeFormat = new Intl.DateTimeFormat(siteConfig.locale.bcp47, {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: siteConfig.locale.timeZone,
});

export function formatDateTime(value: string | null | undefined): string {
  return value ? dateTimeFormat.format(new Date(value)) : t.common.empty;
}
