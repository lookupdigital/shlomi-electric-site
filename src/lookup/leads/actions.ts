"use server";

import { LEAD_USER_FIELDS, leadSchema, toLeadRow } from "@/lookup/leads/schema";
import { createServiceClient } from "@/lookup/supabase/service";

export type LeadSubmissionResult =
  | { ok: true; leadType: string }
  | { ok: false; error: "validation"; message: string }
  | { ok: false; error: "server" };

const UNIQUE_VIOLATION = "23505";

/**
 * Public lead endpoint. Success is returned ONLY after the row is stored, so the client can safely
 * fire generate_lead on `ok: true`. Logs never include submitted personal data.
 */
export async function submitLead(formData: FormData): Promise<LeadSubmissionResult> {
  const input: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") input[key] = value;
  }

  // Honeypot: the hidden field is empty for real visitors.
  if (input.company_website) return { ok: false, error: "server" };

  const parsed = leadSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues.find((i) => LEAD_USER_FIELDS.has(String(i.path[0])));
    if (!issue) return { ok: false, error: "server" };
    return { ok: false, error: "validation", message: issue.message };
  }

  try {
    const { error } = await createServiceClient().from("leads").insert(toLeadRow(parsed.data));
    // A duplicate submission_id means this exact submission was already stored (e.g. a retried request).
    if (error && error.code !== UNIQUE_VIOLATION) {
      console.error("[leads] insert failed:", error.code, error.message);
      return { ok: false, error: "server" };
    }
  } catch (error) {
    console.error("[leads] insert failed:", (error as Error).message);
    return { ok: false, error: "server" };
  }

  return { ok: true, leadType: "quote_request" };
}
