// Applies the real migrations to an in-process Postgres (PGlite) with a minimal Supabase-like environment
// (roles, auth.uid(), storage tables) and verifies constraints and Row Level Security.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";

const migrationsDir = join(process.cwd(), "supabase", "migrations");
const migrationFiles = readdirSync(migrationsDir)
  .filter((file) => file.endsWith(".sql"))
  .sort();
const migrations = migrationFiles.map((file) => readFileSync(join(migrationsDir, file), "utf8"));
const migration = (name: string) => migrations[migrationFiles.findIndex((file) => file.endsWith(`_${name}.sql`))];
const SUPABASE_STUB = readFileSync(join(process.cwd(), "supabase", "tests", "supabase-stub.sql"), "utf8");

const ADMIN = "00000000-0000-0000-0000-00000000000a";
const USER = "00000000-0000-0000-0000-00000000000b";

async function freshDatabase() {
  const db = new PGlite();
  await db.exec(SUPABASE_STUB);
  return db;
}

/** Runs `sql` as a Supabase role; `sub` simulates the JWT subject of a signed-in user. */
async function as<T>(db: PGlite, role: "anon" | "authenticated" | "service_role", sub: string | null, sql: string) {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${sub ?? ""}', false); set role ${role};`);
  try {
    return (await db.query<T>(sql)).rows;
  } finally {
    await db.exec("reset role;");
  }
}

const insertLead = (submissionId: string) =>
  `insert into public.leads (name, phone, form_name, submission_id, utm_source, gclid) values ('Test', '0500000000', 'contact', '${submissionId}', 'google', 'abc') returning id`;

describe("Lookup migrations", () => {
  let db: PGlite;

  beforeAll(async () => {
    db = await freshDatabase();
    for (const sql of migrations) await db.exec(sql);
    await db.exec(`
      insert into auth.users (id, email) values ('${ADMIN}', 'admin@example.com'), ('${USER}', 'user@example.com');
      insert into public.admin_users (user_id) values ('${ADMIN}');
      insert into public.posts (title, slug, status, published_at) values
        ('Published', 'published-post', 'published', now() - interval '1 day'),
        ('Scheduled', 'scheduled-post', 'published', now() + interval '7 days'),
        ('Draft', 'draft-post', 'draft', null);
      insert into public.redirects (source_path, destination, status_code, active) values
        ('/old', '/new', 301, true), ('/inactive', '/new', 302, false);
    `);
  });

  it("the first migration aborts without changes when a Lookup table already exists", async () => {
    const other = await freshDatabase();
    await other.exec("create table public.leads (id int);");
    await expect(other.exec(migrations[0])).rejects.toThrow(/Lookup migration aborted/);
    const { rows } = await other.query("select to_regclass('public.admin_users') as t");
    expect(rows[0]).toEqual({ t: null });
  });

  it("the hardening migration refuses to run twice", async () => {
    await expect(db.exec(migration("lookup_hardening"))).rejects.toThrow(/already applied/);
  });

  it("the service area migration refuses to run twice or before migration 5", async () => {
    await expect(db.exec(migration("lookup_service_area"))).rejects.toThrow(/already applied/);
    const other = await freshDatabase();
    for (const sql of migrations.slice(0, 4)) await other.exec(sql);
    await expect(other.exec(migration("lookup_service_area"))).rejects.toThrow(/apply migrations 1-5 first/);
  });

  it("admins can edit the service area; the public can read it but not change it", async () => {
    await as(db, "authenticated", ADMIN, "update public.site_settings set service_area = 'Area A' where id = 1");
    expect(await as(db, "anon", null, "select service_area from public.site_settings")).toEqual([{ service_area: "Area A" }]);
    await as(db, "authenticated", USER, "update public.site_settings set service_area = 'Hijacked' where id = 1");
    expect(await as(db, "anon", null, "select service_area from public.site_settings")).toEqual([{ service_area: "Area A" }]);
    await expect(db.exec(`update public.site_settings set service_area = '${"x".repeat(301)}'`)).rejects.toThrow(/check constraint/);
    await db.exec("update public.site_settings set service_area = null");
  });

  it("anon cannot read or insert leads", async () => {
    await expect(as(db, "anon", null, "select * from public.leads")).rejects.toThrow(/permission denied/);
    await expect(
      as(db, "anon", null, "insert into public.leads (name, phone, form_name) values ('x', '0500000000', 'test')"),
    ).rejects.toThrow(/permission denied/);
  });

  it("service role inserts leads with workflow defaults; submission_id is unique", async () => {
    const rows = await as<{ id: string }>(db, "service_role", null, insertLead("11111111-1111-1111-1111-111111111111"));
    const { rows: stored } = await db.query<{ status: string; is_test: boolean; notification_status: string }>(
      `select status, is_test, notification_status from public.leads where id = '${rows[0].id}'`,
    );
    expect(stored[0]).toEqual({ status: "new", is_test: false, notification_status: "skipped" });
    await expect(as(db, "service_role", null, insertLead("11111111-1111-1111-1111-111111111111"))).rejects.toThrow(/duplicate key/);
  });

  it("only admins can read leads", async () => {
    expect(await as(db, "authenticated", USER, "select id from public.leads")).toHaveLength(0);
    expect((await as(db, "authenticated", ADMIN, "select id from public.leads")).length).toBeGreaterThan(0);
  });

  it("admins can change a lead's status but not its submitted data", async () => {
    expect(await as(db, "authenticated", ADMIN, "update public.leads set status = 'contacted' returning id")).not.toHaveLength(0);
    await expect(as(db, "authenticated", ADMIN, "update public.leads set name = 'changed'")).rejects.toThrow(/permission denied/);
    expect(await as(db, "authenticated", USER, "update public.leads set status = 'spam' returning id")).toHaveLength(0);
    await expect(db.exec("update public.leads set status = 'archived'")).rejects.toThrow(/leads_status_check/);
  });

  it("only admins can delete leads (privacy requests)", async () => {
    const [{ id }] = await as<{ id: string }>(db, "service_role", null, insertLead("22222222-2222-2222-2222-222222222222"));
    await expect(as(db, "anon", null, `delete from public.leads where id = '${id}'`)).rejects.toThrow(/permission denied/);
    expect(await as(db, "authenticated", USER, `delete from public.leads where id = '${id}' returning id`)).toHaveLength(0);
    expect(await as(db, "authenticated", ADMIN, `delete from public.leads where id = '${id}' returning id`)).toHaveLength(1);
  });

  it("the lead rate limit is server-only and enforces the limit per bucket", async () => {
    const call = (bucket: string) => `select public.lead_rate_limit_consume('${bucket}', 2, 60) as allowed`;
    await expect(as(db, "anon", null, call("x"))).rejects.toThrow(/permission denied/);
    await expect(as(db, "authenticated", ADMIN, call("x"))).rejects.toThrow(/permission denied/);
    await expect(as(db, "anon", null, "select * from public.lead_rate_limits")).rejects.toThrow(/permission denied/);
    const results = [];
    for (let i = 0; i < 3; i++) results.push((await as<{ allowed: boolean }>(db, "service_role", null, call("bucket-a")))[0].allowed);
    expect(results).toEqual([true, true, false]);
    expect((await as<{ allowed: boolean }>(db, "service_role", null, call("bucket-b")))[0].allowed).toBe(true);
  });

  it("public sees only published, already-live posts", async () => {
    const rows = await as<{ slug: string }>(db, "anon", null, "select slug from public.posts");
    expect(rows.map((r) => r.slug)).toEqual(["published-post"]);
    expect(await as(db, "authenticated", ADMIN, "select slug from public.posts")).toHaveLength(3);
  });

  it("non-admins cannot write content; admins can", async () => {
    await expect(as(db, "anon", null, "update public.site_settings set site_name = 'x'")).rejects.toThrow(/permission denied/);
    expect(await as(db, "authenticated", USER, "update public.site_settings set site_name = 'hacked' returning id")).toHaveLength(0);
    expect(await as(db, "authenticated", ADMIN, "update public.site_settings set site_name = 'ok' returning id")).toHaveLength(1);
    await expect(as(db, "authenticated", USER, "insert into public.posts (title, slug) values ('x', 'x')")).rejects.toThrow(/row-level security/);
  });

  it("public reads settings and only active redirects", async () => {
    expect(await as(db, "anon", null, "select id from public.site_settings")).toHaveLength(1);
    const redirects = await as<{ source_path: string }>(db, "anon", null, "select source_path from public.redirects");
    expect(redirects.map((r) => r.source_path)).toEqual(["/old"]);
  });

  it("enforces data constraints", async () => {
    await expect(db.exec("insert into public.redirects (source_path, destination, status_code) values ('/a', '/b', 307)")).rejects.toThrow(/check constraint/);
    await expect(db.exec("insert into public.posts (title, slug, status) values ('x', 'no-date', 'published')")).rejects.toThrow(/posts_published_requires_date/);
    for (const slug of ["Bad-Slug", "bad slug", "a/b", "a--b"]) {
      await expect(db.exec(`insert into public.posts (title, slug) values ('x', '${slug}')`)).rejects.toThrow(/posts_slug_check/);
    }
    await db.exec("insert into public.posts (title, slug) values ('עברית', 'מאמר-ראשון'), ('latin', 'first-post-2')");
    await expect(db.exec("update public.site_settings set gtm_id = 'UA-123'")).rejects.toThrow(/check constraint/);
    await expect(db.exec("update public.site_settings set consent_default = 'maybe'")).rejects.toThrow(/site_settings_consent_default_check/);
    await expect(db.exec("insert into public.site_settings (id) values (2)")).rejects.toThrow(/site_settings_singleton/);
  });

  it("only admins can upload to the media bucket", async () => {
    await expect(as(db, "authenticated", USER, "insert into storage.objects (bucket_id, name) values ('media', 'a.png')")).rejects.toThrow(/row-level security/);
    expect(await as(db, "authenticated", ADMIN, "insert into storage.objects (bucket_id, name) values ('media', 'a.png') returning id")).toHaveLength(1);
  });
});
