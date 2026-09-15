-- Lookup website infrastructure — 1/4: foundation (admin allowlist, helper functions).
-- Additive only. Aborts WITHOUT changing anything if any Lookup object already exists.

do $$
declare
  existing_tables text;
begin
  select string_agg(table_name, ', ')
    into existing_tables
    from information_schema.tables
   where table_schema = 'public'
     and table_name in ('admin_users', 'site_settings', 'page_seo', 'posts', 'leads', 'redirects');

  if existing_tables is not null then
    raise exception 'Lookup migration aborted: public tables already exist: %. Nothing was changed.', existing_tables;
  end if;

  if exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname in ('is_admin', 'set_updated_at')
  ) then
    raise exception 'Lookup migration aborted: public.is_admin() or public.set_updated_at() already exists. Nothing was changed.';
  end if;
end
$$;

-- Admin allowlist: a signed-in Supabase Auth user is an admin only if listed here.
create table public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

comment on table public.admin_users is 'Lookup: users allowed into /admin. Add rows via SQL only.';

alter table public.admin_users enable row level security;

create policy "admin_users: read own row"
  on public.admin_users for select
  to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.admin_users from anon, authenticated;
grant select on public.admin_users to authenticated;
grant all on public.admin_users to service_role;

-- True when the current request belongs to an allowlisted admin. Used by RLS policies.
create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admin_users where user_id = (select auth.uid()));
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated, service_role;

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
