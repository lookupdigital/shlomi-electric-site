import { expect, test } from "@playwright/test";

// End-to-end lead flow against the configured Supabase project.
// Safe for a shared/production database: the submission carries E2E_TEST_TOKEN, so the server stores it with
// is_test = true — hidden from the admin lists, exports and dashboard counts, and never sent to the webhook.
// Clean up when convenient: delete from public.leads where is_test;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const e2eToken = process.env.E2E_TEST_TOKEN ?? "";

test.skip(!supabaseUrl || !serviceRoleKey || e2eToken.length < 16, "Requires Supabase env and an E2E_TEST_TOKEN (16+ characters).");

type DataLayerEntry = Record<string, unknown>;

test("visitor with UTM → lead form → stored lead with attribution → generate_lead", async ({ page }) => {
  const runId = `e2e_${Date.now()}`;
  await page.goto(`/?utm_source=playwright&utm_medium=e2e&utm_campaign=${runId}&gclid=PW-${runId}`);
  await page.goto("/contact");

  const form = page.locator("#contact-form form");
  await form.evaluate((element, token) => {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = "e2e_token";
    input.value = token;
    element.appendChild(input);
  }, e2eToken);

  await form.getByLabel("שם מלא").fill("Playwright E2E");
  await form.getByLabel("טלפון").fill("050-0000000");
  await form.getByLabel("אימייל (לא חובה)").fill("playwright-e2e@example.com");
  await form.getByLabel("סוג הפרויקט").selectOption({ index: 1 });
  await form.getByLabel("הודעה").fill(`Automated Playwright test ${runId}`);
  await form.getByRole("checkbox").check();
  await form.getByRole("button", { name: "שלחו פרטים" }).click();

  await expect(page.locator("#contact-form [role=status]")).toBeVisible({ timeout: 30_000 });

  const leadEvents = await page.evaluate(
    () => ((window as unknown as { dataLayer?: DataLayerEntry[] }).dataLayer ?? []).filter((entry) => entry.event === "generate_lead"),
  );
  expect(leadEvents).toHaveLength(1);
  const eventId = String(leadEvents[0].event_id);
  expect(eventId).toMatch(/^[0-9a-f-]{36}$/);
  expect(JSON.stringify(leadEvents)).not.toContain("playwright-e2e@example.com");

  const response = await fetch(
    `${supabaseUrl}/rest/v1/leads?select=form_name,is_test,notification_status,landing_page,utm_source,utm_medium,utm_campaign,gclid&submission_id=eq.${eventId}`,
    { headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` } },
  );
  expect(response.ok).toBe(true);
  const rows = (await response.json()) as Record<string, unknown>[];
  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({
    form_name: "contact",
    is_test: true,
    notification_status: "skipped",
    landing_page: "/",
    utm_source: "playwright",
    utm_medium: "e2e",
    utm_campaign: runId,
    gclid: `PW-${runId}`,
  });
});
