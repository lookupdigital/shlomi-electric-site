"use server";

import type { FormState } from "@/lookup/admin/form-utils";
import { t } from "@/lookup/admin/i18n";
import { requireAdmin } from "@/lookup/auth";
import { buildTestWebhookBody, isLeadWebhookConfigured, LEAD_TEST_WEBHOOK_EVENT, postSignedWebhook } from "@/lookup/leads/notify";
import { getSiteEnvironment } from "@/lookup/runtime";

/**
 * Sends one signed TEST payload through the real delivery path. Stores nothing (no lead row, no metrics) and
 * reports only the outcome — never the URL or the secret.
 */
export async function sendTestWebhook(): Promise<FormState> {
  await requireAdmin();
  const url = process.env.LEAD_WEBHOOK_URL;
  if (!isLeadWebhookConfigured() || !url) return { ok: false, message: t.integrations.webhookTestNotConfigured };
  const started = Date.now();
  const result = await postSignedWebhook(url, LEAD_TEST_WEBHOOK_EVENT, buildTestWebhookBody(getSiteEnvironment()));
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  return result.ok
    ? { ok: true, message: t.integrations.webhookTestSent(result.status ?? 200, seconds) }
    : { ok: false, message: t.integrations.webhookTestFailed(result.error ?? "", seconds) };
}
