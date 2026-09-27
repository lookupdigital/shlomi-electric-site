-- Lookup website infrastructure — 8: post social SEO and follow control (Lookup Starter v1.2).
-- Adds an Open Graph title/description override and a follow/nofollow flag to blog posts, matching page_seo.
-- Additive only: existing posts get NULL overrides (the existing fallbacks keep applying) and follow = true
-- (the behavior before this migration). No data is rewritten.
-- Aborts WITHOUT changing anything if run before 1–7 or run twice.

do $$
begin
  if to_regclass('public.posts') is null or not exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'site_settings' and column_name = 'consent_default'
       and column_default like '%denied%'
  ) then
    raise exception 'Lookup post social SEO migration aborted: apply migrations 1-7 first. Nothing was changed.';
  end if;

  if exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'posts' and column_name = 'og_title'
  ) then
    raise exception 'Lookup post social SEO migration aborted: it is already applied. Nothing was changed.';
  end if;
end
$$;

alter table public.posts
  add column og_title text check (char_length(og_title) <= 200),
  add column og_description text check (char_length(og_description) <= 500),
  add column robots_follow boolean not null default true;

comment on column public.posts.og_title is 'Open Graph title override; empty = the resolved SEO title.';
comment on column public.posts.og_description is 'Open Graph description override; empty = the resolved meta description.';
comment on column public.posts.robots_follow is 'false = nofollow for this post (only effective while the site is indexable).';
