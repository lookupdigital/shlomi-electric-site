// Applies the real migrations to an in-process Postgres (PGlite) with a minimal Supabase-like environment
// (roles, auth.uid(), storage tables) and verifies constraints and Row Level Security.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";

const migrationsDir = join(process.cwd(), "supabase", "migrations");
const migrations = readdirSync(migrationsDir)
  .filter((file) => file.endsWith(".sql"))
  .sort()
  .map((file) => readFileSync(join(migrationsDir, file), "utf8"));

const SUPABASE_STUB = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  grant usage on schema public to anon, authenticated, service_role;

  create schema auth;
  create table auth.users (id uuid primary key, email text);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth to anon, authenticated, service_role;
  grant execute on function auth.uid() to anon, authenticated, service_role;

  create schema storage;
  create table storage.buckets (
    id text primary key, name text not null, public boolean default false,
    file_size_limit bigint, allowed_mime_types text[]
  );
  create table storage.objects (
    id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets (id), name text
  );
  alter table storage.objects enable row level security;
  grant usage on schema storage to anon, authenticated, service_role;
  grant select, insert, update, delete on storage.objects to anon, authenticated;
`;

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

  it("aborts without changes when a Lookup table already exists", async () => {
    const other = await freshDatabase();
    await other.exec("create table public.leads (id int);");
    await expect(other.exec(migrations[0])).rejects.toThrow(/Lookup migration aborted/);
    const { rows } = await other.query("select to_regclass('public.admin_users') as t");
    expect(rows[0]).toEqual({ t: null });
  });

  it("anon cannot read or insert leads", async () => {
    await expect(as(db, "anon", null, "select * from public.leads")).rejects.toThrow(/permission denied/);
    await expect(
      as(db, "anon", null, "insert into public.leads (name, phone, form_name) values ('x', '0500000000', 'test')"),
    ).rejects.toThrow(/permission denied/);
  });

  it("service role inserts leads; submission_id is unique", async () => {
    const sql =
      "insert into public.leads (name, phone, form_name, submission_id, utm_source, gclid) values ('Test', '0500000000', 'contact', '11111111-1111-1111-1111-111111111111', 'google', 'abc')";
    await as(db, "service_role", null, sql);
    await expect(as(db, "service_role", null, sql)).rejects.toThrow(/duplicate key/);
  });

  it("only admins can read leads", async () => {
    expect(await as(db, "authenticated", USER, "select id from public.leads")).toHaveLength(0);
    expect(await as(db, "authenticated", ADMIN, "select id from public.leads")).toHaveLength(1);
  });

  it("public sees only published, already-live posts", async () => {
    const rows = await as<{ slug: string }>(db, "anon", null, "select slug from public.posts");
    expect(rows.map((r) => r.slug)).toEqual(["published-post"]);
    expect(await as(db, "authenticated", ADMIN, "select slug from public.posts")).toHaveLength(3);
  });

  it("non-admins cannot write content; admins can", async () => {
    await expect(as(db, "anon", null, "update public.site_settings set site_name = 'x'")).rejects.toThrow(
      /permission denied/,
    );
    expect(
      await as(db, "authenticated", USER, "update public.site_settings set site_name = 'hacked' returning id"),
    ).toHaveLength(0);
    expect(
      await as(db, "authenticated", ADMIN, "update public.site_settings set site_name = 'ok' returning id"),
    ).toHaveLength(1);
    await expect(
      as(db, "authenticated", USER, "insert into public.posts (title, slug) values ('x', 'x')"),
    ).rejects.toThrow(/row-level security/);
  });

  it("public reads settings and only active redirects", async () => {
    expect(await as(db, "anon", null, "select id from public.site_settings")).toHaveLength(1);
    const redirects = await as<{ source_path: string }>(db, "anon", null, "select source_path from public.redirects");
    expect(redirects.map((r) => r.source_path)).toEqual(["/old"]);
  });

  it("enforces data constraints", async () => {
    await expect(
      db.exec("insert into public.redirects (source_path, destination, status_code) values ('/a', '/b', 307)"),
    ).rejects.toThrow(/check constraint/);
    await expect(
      db.exec("insert into public.posts (title, slug, status) values ('x', 'no-date', 'published')"),
    ).rejects.toThrow(/posts_published_requires_date/);
    await expect(db.exec("insert into public.posts (title, slug) values ('x', 'Bad Slug')")).rejects.toThrow(
      /check constraint/,
    );
    await db.exec("insert into public.posts (title, slug) values ('עברית', 'מאמר-ראשון')");
    await expect(db.exec("update public.site_settings set gtm_id = 'UA-123'")).rejects.toThrow(/check constraint/);
    await expect(db.exec("insert into public.site_settings (id) values (2)")).rejects.toThrow(/site_settings_singleton/);
  });

  it("only admins can upload to the media bucket", async () => {
    await expect(
      as(db, "authenticated", USER, "insert into storage.objects (bucket_id, name) values ('media', 'a.png')"),
    ).rejects.toThrow(/row-level security/);
    expect(
      await as(db, "authenticated", ADMIN, "insert into storage.objects (bucket_id, name) values ('media', 'a.png') returning id"),
    ).toHaveLength(1);
  });
});
