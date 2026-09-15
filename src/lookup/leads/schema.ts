import { z } from "zod";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => value || null);

/** Fields a visitor fills in; any other validation failure is reported as a generic error. */
export const LEAD_USER_FIELDS = new Set(["name", "phone", "email", "message", "projectType", "consent"]);

export const leadSchema = z
  .object({
    name: z.string().trim().min(2, "נא למלא שם מלא").max(120, "השם ארוך מדי"),
    phone: z
      .string()
      .trim()
      .max(30, "מספר הטלפון אינו תקין")
      .refine((value) => {
        const digits = value.replace(/\D/g, "");
        return digits.length >= 9 && digits.length <= 15;
      }, "מספר הטלפון אינו תקין"),
    email: z
      .string()
      .trim()
      .max(200, "כתובת האימייל אינה תקינה")
      .optional()
      .refine((value) => !value || z.email().safeParse(value).success, "כתובת האימייל אינה תקינה")
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
  })
  .refine((data) => !data.consent_required || data.consent === "on", {
    path: ["consent"],
    message: "יש לאשר יצירת קשר בהתאם למדיניות הפרטיות",
  });

export type LeadInput = z.infer<typeof leadSchema>;

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
