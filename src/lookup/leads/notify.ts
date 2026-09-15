import "server-only";
import { createHmac, randomUUID } from "node:crypto";
import { createServiceClient } from "@/lookup/supabase/service";

// Lead notifications via a generic signed webhook (Make, Zapier, n8n, a CRM, or an email relay).
// Delivery runs after the lead is stored; a failure only marks the lead, it never loses it.

export const LEAD_WEBHOOK_EVENT = "lead.created";

export function isLeadWebhookConfigured(): boolean {
  return Boolean(process.env.LEAD_WEBHOOK_URL);
}

/** HMAC-SHA256 over "<timestamp>.<body>", sent as `X-Lookup-Signature: sha256=<hex>`. */
export function signWebhookPayload(body: string, timestamp: string, secret: string): string {
  return `sha256=${createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex")}`;
}

const NOTIFICATION_COLUMNS =
  "id,created_at,name,phone,email,message,project_type,consent,form_name,landing_page,referrer,utm_source,utm_medium,utm_campaign,utm_content,utm_term,gclid,gbraid,wbraid,fbclid,ttclid,status,is_test";

const RETRY_DELAYS_MS = [0, 1000, 3000];

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function deliverLeadNotification(leadId: string): Promise<{ ok: boolean; error?: string }> {
  const url = process.env.LEAD_WEBHOOK_URL;
  if (!url) return { ok: false, error: "LEAD_WEBHOOK_URL is not configured" };

  const supabase = createServiceClient();
  const { data: lead, error: loadError } = await supabase.from("leads").select(NOTIFICATION_COLUMNS).eq("id", leadId).single();
  if (loadError || !lead) return { ok: false, error: `lead not found: ${loadError?.code ?? ""}` };
  if (lead.is_test) return { ok: true };

  const { id, created_at, ...rest } = lead;
  const fields: Partial<typeof rest> = { ...rest };
  delete fields.is_test;
  const body = JSON.stringify({ event: LEAD_WEBHOOK_EVENT, lead_id: id, created_at, lead: fields });
  const deliveryId = randomUUID();

  let lastError = "";
  for (const delay of RETRY_DELAYS_MS) {
    if (delay) await wait(delay);
    const timestamp = String(Math.floor(Date.now() / 1000));
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "User-Agent": "lookup-website-webhook/1",
      "X-Lookup-Event": LEAD_WEBHOOK_EVENT,
      "X-Lookup-Delivery": deliveryId,
      "X-Lookup-Timestamp": timestamp,
    };
    const secret = process.env.LEAD_WEBHOOK_SECRET;
    if (secret) headers["X-Lookup-Signature"] = signWebhookPayload(body, timestamp, secret);
    try {
      const response = await fetch(url, { method: "POST", headers, body, signal: AbortSignal.timeout(5000) });
      if (response.ok) {
        lastError = "";
        break;
      }
      lastError = `HTTP ${response.status}`;
    } catch (error) {
      lastError = (error as Error).message;
    }
  }

  const ok = lastError === "";
  const { error: updateError } = await supabase
    .from("leads")
    .update({
      notification_status: ok ? "sent" : "failed",
      notification_error: ok ? null : lastError.slice(0, 500),
      notified_at: new Date().toISOString(),
    })
    .eq("id", leadId);
  if (updateError) console.error("[leads] notification state not saved:", updateError.code, updateError.message);
  if (!ok) console.error("[leads] notification failed:", lastError);
  return ok ? { ok } : { ok, error: lastError };
}
