#!/usr/bin/env node
// Read-only production safety checks against the configured Supabase project. Prints no secrets.
// Fails (exit 1) if public sign-up is enabled or public access to private data is possible.
import nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd());

const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
if (!/^https:\/\//.test(url) || !anon) {
  console.error("check:supabase — NEXT_PUBLIC_SUPABASE_URL (https://…) and NEXT_PUBLIC_SUPABASE_ANON_KEY are required.");
  process.exit(1);
}

const results = [];
const check = (name, ok, detail) => {
  results.push(ok);
  console.log(`${ok ? "PASS" : "FAIL"} | ${name} | ${detail}`);
};
const call = async (method, path, body) => {
  const response = await fetch(`${url}${path}`, {
    method,
    headers: { apikey: anon, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json = null;
  try {
    json = await response.json();
  } catch {}
  return { status: response.status, json };
};
const denied = (r) => [401, 403].includes(r.status) || r.json?.code === "42501";

const auth = await call("GET", "/auth/v1/settings");
check("public sign-up disabled", auth.json?.disable_signup === true, `disable_signup=${auth.json?.disable_signup}`);

let r = await call("GET", "/rest/v1/leads?select=id&limit=1");
check("anon cannot read leads", denied(r), `${r.status} ${r.json?.code ?? ""}`);
r = await call("POST", "/rest/v1/leads", { name: "", phone: "", form_name: "" });
check("anon cannot insert leads", denied(r), `${r.status} ${r.json?.code ?? ""}`);
r = await call("GET", "/rest/v1/admin_users?select=user_id");
check("anon cannot read admin_users", denied(r), `${r.status} ${r.json?.code ?? ""}`);
r = await call("GET", "/rest/v1/lead_rate_limits?select=bucket&limit=1");
check("anon cannot read lead_rate_limits", denied(r), `${r.status} ${r.json?.code ?? ""}`);
r = await call("POST", "/rest/v1/rpc/lead_rate_limit_consume", { p_bucket: "check", p_limit: 1, p_window_seconds: 1 });
check("anon cannot call lead_rate_limit_consume", denied(r) || r.status === 404, `${r.status} ${r.json?.code ?? ""}`);
r = await call("PATCH", "/rest/v1/site_settings?id=eq.1", { gtm_id: "INVALID" });
check("anon cannot update site_settings", denied(r), `${r.status} ${r.json?.code ?? ""}`);
r = await call("GET", "/rest/v1/site_settings?select=id");
check("anon can read site_settings", r.status === 200 && Array.isArray(r.json) && r.json.length === 1, `${r.status}`);

const failed = results.filter((ok) => !ok).length;
console.log(failed ? `check:supabase FAILED (${failed})` : `check:supabase OK (${results.length} checks)`);
process.exit(failed ? 1 : 0);
