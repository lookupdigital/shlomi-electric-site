-- Lookup website infrastructure — 2/4: content (site settings, page SEO, blog posts, redirects).
-- Additive only. Public reads are limited by RLS; every write requires public.is_admin().

-- Site settings (single row, id = 1) ----------------------------------------------------------
create table public.site_settings (
  id smallint primary key default 1 constraint site_settings_singleton check (id = 1),
  business_name text check (char_length(business_name) <= 200),
  site_name text check (char_length(site_name) <= 200),
  site_url text check (site_url ~ '^https?://' and char_length(site_url) <= 300),
  phone text check (char_length(phone) <= 40),
  whatsapp text check (whatsapp ~ '^[0-9+ -]{6,25}$'),
  email text check (char_length(email) <= 200),
  address text check (char_length(address) <= 300),
  logo_url text check (char_length(logo_url) <= 1000),
  favicon_url text check (char_length(favicon_url) <= 1000),
  facebook_url text check (facebook_url ~ '^https://'),
  instagram_url text check (instagram_url ~ '^https://'),
  linkedin_url text check (linkedin_url ~ '^https://'),
  tiktok_url text check (tiktok_url ~ '^https://'),
  youtube_url text check (youtube_url ~ '^https://'),
  default_meta_title text check (char_length(default_meta_title) <= 200),
  default_meta_description text check (char_length(default_meta_description) <= 500),
  default_og_image_url text check (char_length(default_og_image_url) <= 1000),
  indexing_enabled boolean not null default false,
  local_business_schema_enabled boolean not null default false,
  gtm_id text check (gtm_id ~ '^GTM-[A-Z0-9]{4,12}$'),
  ga4_id text check (ga4_id ~ '^G-[A-Z0-9]{4,20}$'),
  meta_pixel_id text check (meta_pixel_id ~ '^[0-9]{5,20}$'),
  tiktok_pixel_id text check (tiktok_pixel_id ~ '^[A-Za-z0-9]{5,40}$'),
  linkedin_partner_id text check (linkedin_partner_id ~ '^[0-9]{3,15}$'),
  updated_at timestamptz not null default now()
);

comment on table public.site_settings is 'Lookup: global site settings. Public IDs only — never store secrets here.';

-- Empty values fall back to the defaults in code. Indexing starts disabled.
insert into public.site_settings (id) values (1);

create trigger site_settings_set_updated_at
  before update on public.site_settings
  for each row execute function public.set_updated_at();

alter table public.site_settings enable row level security;

create policy "site_settings: public read"
  on public.site_settings for select to anon, authenticated using (true);
create policy "site_settings: admin update"
  on public.site_settings for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

revoke all on public.site_settings from anon, authenticated;
grant select on public.site_settings to anon, authenticated;
grant update on public.site_settings to authenticated;
grant all on public.site_settings to service_role;

-- Page SEO (per static route) ------------------------------------------------------------------
create table public.page_seo (
  path text primary key check (path ~ '^/' and char_length(path) <= 300),
  meta_title text check (char_length(meta_title) <= 200),
  meta_description text check (char_length(meta_description) <= 500),
  canonical_url text check (canonical_url ~ '^https?://' and char_length(canonical_url) <= 1000),
  og_title text check (char_length(og_title) <= 200),
  og_description text check (char_length(og_description) <= 500),
  og_image_url text check (char_length(og_image_url) <= 1000),
  robots_index boolean not null default true,
  robots_follow boolean not null default true,
  updated_at timestamptz not null default now()
);

create trigger page_seo_set_updated_at
  before update on public.page_seo
  for each row execute function public.set_updated_at();

alter table public.page_seo enable row level security;

create policy "page_seo: public read"
  on public.page_seo for select to anon, authenticated using (true);
create policy "page_seo: admin insert"
  on public.page_seo for insert to authenticated with check ((select public.is_admin()));
create policy "page_seo: admin update"
  on public.page_seo for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "page_seo: admin delete"
  on public.page_seo for delete to authenticated using ((select public.is_admin()));

revoke all on public.page_seo from anon, authenticated;
grant select on public.page_seo to anon, authenticated;
grant insert, update, delete on public.page_seo to authenticated;
grant all on public.page_seo to service_role;

-- Blog posts ------------------------------------------------------------------------------------
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 200),
  slug text not null unique
    check (slug ~ '^[a-z0-9א-ת]+(-[a-z0-9א-ת]+)*$' and char_length(slug) <= 120),
  excerpt text check (char_length(excerpt) <= 500),
  content jsonb not null default '{"type":"doc","content":[]}'::jsonb,
  featured_image_url text check (char_length(featured_image_url) <= 1000),
  featured_image_alt text check (char_length(featured_image_alt) <= 200),
  category text check (char_length(category) <= 80),
  author text check (char_length(author) <= 120),
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  meta_title text check (char_length(meta_title) <= 200),
  meta_description text check (char_length(meta_description) <= 500),
  canonical_url text check (canonical_url ~ '^https?://' and char_length(canonical_url) <= 1000),
  og_image_url text check (char_length(og_image_url) <= 1000),
  robots_index boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint posts_published_requires_date check (status = 'draft' or published_at is not null)
);

create index posts_status_published_at_idx on public.posts (status, published_at desc);

create trigger posts_set_updated_at
  before update on public.posts
  for each row execute function public.set_updated_at();

alter table public.posts enable row level security;

create policy "posts: public read published"
  on public.posts for select to anon, authenticated
  using (status = 'published' and published_at <= now());
create policy "posts: admin read all"
  on public.posts for select to authenticated using ((select public.is_admin()));
create policy "posts: admin insert"
  on public.posts for insert to authenticated with check ((select public.is_admin()));
create policy "posts: admin update"
  on public.posts for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "posts: admin delete"
  on public.posts for delete to authenticated using ((select public.is_admin()));

revoke all on public.posts from anon, authenticated;
grant select on public.posts to anon, authenticated;
grant insert, update, delete on public.posts to authenticated;
grant all on public.posts to service_role;

-- Redirects -------------------------------------------------------------------------------------
create table public.redirects (
  id uuid primary key default gen_random_uuid(),
  source_path text not null unique check (source_path ~ '^/' and char_length(source_path) <= 500),
  destination text not null
    check ((destination ~ '^/' or destination ~ '^https?://') and char_length(destination) <= 1000),
  status_code smallint not null default 301 check (status_code in (301, 302)),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint redirects_not_self check (source_path <> destination)
);

create trigger redirects_set_updated_at
  before update on public.redirects
  for each row execute function public.set_updated_at();

alter table public.redirects enable row level security;

create policy "redirects: public read active"
  on public.redirects for select to anon, authenticated using (active);
create policy "redirects: admin read all"
  on public.redirects for select to authenticated using ((select public.is_admin()));
create policy "redirects: admin insert"
  on public.redirects for insert to authenticated with check ((select public.is_admin()));
create policy "redirects: admin update"
  on public.redirects for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "redirects: admin delete"
  on public.redirects for delete to authenticated using ((select public.is_admin()));

revoke all on public.redirects from anon, authenticated;
grant select on public.redirects to anon, authenticated;
grant insert, update, delete on public.redirects to authenticated;
grant all on public.redirects to service_role;
