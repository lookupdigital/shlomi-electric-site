"use server";

import { headers } from "next/headers";
import { after } from "next/server";
import { deliverLeadNotification, isLeadWebhookConfigured } from "@/lookup/leads/notify";
import {
  clientIp,
  consumeLeadRateLimit,
  isAuthorizedTestSubmission,
  verifyTurnstile,
} from "@/lookup/leads/protection";
import { createLeadSchema, LEAD_USER_FIELDS, toLeadRow } from "@/lookup/leads/schema";
import { createServiceClient } from "@/lookup/supabase/service";
import { siteConfig } from "@/site.config";

export type LeadSubmissionResult =
  | { ok: true; leadType: string; eventId: string }
  | { ok: false; error: "validation" | "rate_limited" | "verification"; message: string }
  | { ok: false; error: "server" };

const UNIQUE_VIOLATION = "23505";
const leadSchema = createLeadSchema(siteConfig.leads.messages);

/**
 * Public lead endpoint. Order: honeypot → validation → Turnstile → rate limit → insert → notification (after).
 * Success is returned ONLY after the row is stored, so the client can safely fire generate_lead on `ok: true`.
 * Logs never include submitted personal data.
 */
export async function submitLead(formData: FormData): Promise<LeadSubmissionResult> {
  const { messages } = siteConfig.leads;
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

  const requestHeaders = await headers();
  const ip = clientIp(requestHeaders);

  const turnstile = await verifyTurnstile(parsed.data["cf-turnstile-response"], ip);
  if (turnstile === "failed") return { ok: false, error: "verification", message: messages.verificationFailed };

  const rateLimit = await consumeLeadRateLimit(ip);
  if (rateLimit === "limited") return { ok: false, error: "rate_limited", message: messages.rateLimited };

  const isTest = isAuthorizedTestSubmission(parsed.data.e2e_token);
  const notify = isLeadWebhookConfigured() && !isTest;

  let leadId: string | null = null;
  try {
    const { data, error } = await createServiceClient()
      .from("leads")
      .insert({
        ...toLeadRow(parsed.data),
        status: "new",
        is_test: isTest,
        notification_status: notify ? "pending" : "skipped",
      })
      .select("id")
      .single();
    // A duplicate submission_id means this exact submission was already stored (e.g. a retried request).
    if (error && error.code !== UNIQUE_VIOLATION) {
      console.error("[leads] insert failed:", error.code, error.message);
      return { ok: false, error: "server" };
    }
    leadId = data?.id ?? null;
  } catch (error) {
    console.error("[leads] insert failed:", (error as Error).message);
    return { ok: false, error: "server" };
  }

  if (notify && leadId) {
    const id = leadId;
    // Runs after the response is sent; a delivery failure is recorded on the lead, never lost.
    after(() => deliverLeadNotification(id).then(() => undefined));
  }

  return { ok: true, leadType: siteConfig.leads.leadType, eventId: parsed.data.submission_id };
}
