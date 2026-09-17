#!/usr/bin/env node
// Fails when the Supabase service role key — or its variable name — appears in anything sent to browsers:
// client JS/CSS (.next/static) and prerendered HTML / RSC payloads (.next/server/app).
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const staticDir = join(root, ".next", "static");
const prerenderDir = join(root, ".next", "server", "app");

if (!existsSync(staticDir)) {
  console.error("check:secrets — no build output found. Run `npm run build` first.");
  process.exit(1);
}

function envValue(name) {
  if (process.env[name]) return process.env[name];
  for (const file of [".env.local", ".env"]) {
    const path = join(root, file);
    if (!existsSync(path)) continue;
    const line = readFileSync(path, "utf8").split(/\r?\n/).find((l) => l.startsWith(`${name}=`));
    const value = line?.slice(name.length + 1).trim().replace(/^["']|["']$/g, "");
    if (value) return value;
  }
  return "";
}

const serviceRoleKey = envValue("SUPABASE_SERVICE_ROLE_KEY");
const needles = [{ label: "variable name SUPABASE_SERVICE_ROLE_KEY", value: "SUPABASE_SERVICE_ROLE_KEY" }];
if (serviceRoleKey.length >= 20) needles.push({ label: "service role key VALUE", value: serviceRoleKey });

function* walk(dir, filter) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) yield* walk(path, filter);
    else if (filter(path)) yield path;
  }
}

const targets = [
  ...walk(staticDir, () => true),
  ...(existsSync(prerenderDir) ? walk(prerenderDir, (p) => /\.(html|rsc|body|meta)$/.test(p)) : []),
];

const leaks = [];
for (const file of targets) {
  const content = readFileSync(file, "utf8");
  for (const needle of needles) {
    if (content.includes(needle.value)) leaks.push(`${file.replace(root + "/", "")}: ${needle.label}`);
  }
}

if (leaks.length > 0) {
  console.error(`check:secrets FAILED\n${leaks.join("\n")}`);
  process.exit(1);
}

console.log(
  `check:secrets OK — ${targets.length} client-facing files scanned` +
    (serviceRoleKey ? " for the variable name and the key value." : " for the variable name (key value not set locally)."),
);
