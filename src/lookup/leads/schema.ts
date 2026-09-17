import { z } from "zod";
import type { LeadMessages } from "@/lookup/config";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => value || null);

/** Fields a visitor fills in; any other validation failure is reported as a generic error. */
export const LEAD_USER_FIELDS = new Set(["name", "phone", "email", "message", "projectType", "consent"]);

export function createLeadSchema(messages: LeadMessages) {
  return z
    .object({
      name: z.string().trim().min(2, messages.nameRequired).max(120, messages.nameTooLong),
      phone: z
        .string()
        .trim()
        .max(30, messages.phoneInvalid)
        .refine((value) => {
          const digits = value.replace(/\D/g, "");
          return digits.length >= 9 && digits.length <= 15;
        }, messages.phoneInvalid),
      email: z
        .string()
        .trim()
        .max(200, messages.emailInvalid)
        .optional()
        .refine((value) => !value || z.email().safeParse(value).success, messages.emailInvalid)
        .transform((value) => value || null),
      message: optionalText(2000),
      projectType: optionalText(100),
      consent: z.literal("on").optional(),
      consent_required: z.literal("1").optional(),
      form_name: z.string().regex(/^[a-z0-9_-]{1,60}$/),
      submission_id: z.uuid(),
      landing_page: optionalText(500),
      referrer: optionalText(500),
      utm_source: optionalText(255),
      utm_medium: optionalText(255),
      utm_campaign: optionalText(255),
      utm_content: optionalText(255),
      utm_term: optionalText(255),
      gclid: optionalText(255),
      gbraid: optionalText(255),
      wbraid: optionalText(255),
      fbclid: optionalText(255),
      ttclid: optionalText(255),
      "cf-turnstile-response": z.string().max(4096).optional(),
      e2e_token: z.string().max(200).optional(),
    })
    .refine((data) => !data.consent_required || data.consent === "on", {
      path: ["consent"],
      message: messages.consentRequired,
    });
}

export type LeadInput = z.infer<ReturnType<typeof createLeadSchema>>;

export function toLeadRow(lead: LeadInput) {
  return {
    name: lead.name,
    phone: lead.phone,
    email: lead.email,
    message: lead.message,
    project_type: lead.projectType,
    consent: lead.consent === "on",
    form_name: lead.form_name,
    submission_id: lead.submission_id,
    landing_page: lead.landing_page,
    referrer: lead.referrer,
    utm_source: lead.utm_source,
    utm_medium: lead.utm_medium,
    utm_campaign: lead.utm_campaign,
    utm_content: lead.utm_content,
    utm_term: lead.utm_term,
    gclid: lead.gclid,
    gbraid: lead.gbraid,
    wbraid: lead.wbraid,
    fbclid: lead.fbclid,
    ttclid: lead.ttclid,
  };
}
