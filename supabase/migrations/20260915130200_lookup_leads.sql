-- Lookup website infrastructure — 3/4: leads.
-- Contains personal data. No public access at all: inserts happen only on the server with the service role
-- key (which bypasses RLS); only allowlisted admins can read.

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null check (char_length(name) between 1 and 200),
  phone text not null check (char_length(phone) between 1 and 40),
  email text check (char_length(email) <= 200),
  message text check (char_length(message) <= 5000),
  project_type text check (char_length(project_type) <= 100),
  consent boolean not null default false,
  form_name text not null check (char_length(form_name) between 1 and 60),
  landing_page text check (char_length(landing_page) <= 1000),
  referrer text check (char_length(referrer) <= 1000),
  utm_source text check (char_length(utm_source) <= 255),
  utm_medium text check (char_length(utm_medium) <= 255),
  utm_campaign text check (char_length(utm_campaign) <= 255),
  utm_content text check (char_length(utm_content) <= 255),
  utm_term text check (char_length(utm_term) <= 255),
  gclid text check (char_length(gclid) <= 255),
  gbraid text check (char_length(gbraid) <= 255),
  wbraid text check (char_length(wbraid) <= 255),
  fbclid text check (char_length(fbclid) <= 255),
  ttclid text check (char_length(ttclid) <= 255),
  -- Generated once per form view; makes retried submissions idempotent.
  submission_id uuid unique
);

comment on table public.leads is 'Lookup: website leads (PII). Insert via server-side service role only; admins read.';

create index leads_created_at_idx on public.leads (created_at desc);

alter table public.leads enable row level security;

create policy "leads: admin read"
  on public.leads for select to authenticated using ((select public.is_admin()));

revoke all on public.leads from anon, authenticated;
grant select on public.leads to authenticated;
grant all on public.leads to service_role;
