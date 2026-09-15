import { z } from "zod";
import { t } from "@/lookup/admin/i18n";

export type FormState = { ok: boolean; message: string } | null;

export function formEntries(formData: FormData): Record<string, string> {
  const entries: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") entries[key] = value;
  }
  return entries;
}

const emptyToNull = (value: unknown) => {
  if (typeof value !== "string") return value ?? null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
};

/** Empty inputs become null; anything else must match `schema`. */
export const optional = <T extends z.ZodType>(schema: T) => z.preprocess(emptyToNull, schema.nullable());

export const checkbox = z.preprocess((value) => value === "on", z.boolean());

const SUPABASE_PUBLIC_OBJECT = /^https:\/\/[a-z0-9-]+\.supabase\.co\/storage\/v1\/object\/public\//i;

/** Uploaded media (Supabase Storage) or a local path such as /images/logo.png. */
export const imageUrl = z
  .string()
  .max(1000)
  .refine((value) => (value.startsWith("/") && !value.startsWith("//")) || SUPABASE_PUBLIC_OBJECT.test(value), t.media.invalidUrl);

export const httpsUrl = z
  .string()
  .max(1000)
  .refine((value) => /^https:\/\//i.test(value) && URL.canParse(value), t.settings.validation.siteUrl);

export const httpUrl = z
  .string()
  .max(1000)
  .refine((value) => /^https?:\/\//i.test(value) && URL.canParse(value), t.settings.validation.siteUrl);

export function firstIssue(error: z.ZodError, labels: Record<string, string> = {}): string {
  const issue = error.issues[0];
  if (!issue) return t.common.invalidData;
  const key = String(issue.path[0] ?? "");
  const label = labels[key] ?? key;
  return label ? `${label}: ${issue.message}` : issue.message;
}
