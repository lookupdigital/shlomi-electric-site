-- Lookup website infrastructure — 5: hardening.
-- Lead workflow (status, test flag, notification delivery state, admin update/delete), anti-spam rate limiting,
-- and the Consent Mode default. Additive only. Aborts WITHOUT changing anything if run before 1–4 or run twice.

do $$
begin
  if to_regclass('public.leads') is null or to_regclass('public.site_settings') is null then
    raise exception 'Lookup hardening migration aborted: apply migrations 1-4 first. Nothing was changed.';
  end if;

  if exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'leads' and column_name in ('status', 'is_test', 'notification_status')
  ) or to_regclass('public.lead_rate_limits') is not null then
    raise exception 'Lookup hardening migration aborted: it is already applied. Nothing was changed.';
  end if;
end
$$;

-- Leads: workflow status, test marker, notification delivery state ---------------------------------
alter table public.leads
  add column status text not null default 'new'
    constraint leads_status_check check (status in ('new', 'contacted', 'closed', 'spam')),
  add column is_test boolean not null default false,
  add column notification_status text not null default 'skipped'
    constraint leads_notification_status_check check (notification_status in ('pending', 'sent', 'failed', 'skipped')),
  add column notification_error text check (char_length(notification_error) <= 500),
  add column notified_at timestamptz,
  add column updated_at timestamptz not null default now();

comment on column public.leads.is_test is 'Automated test submissions (E2E). Hidden from admin lists, exports and notifications.';

create index leads_status_created_at_idx on public.leads (status, created_at desc) where not is_test;

create trigger leads_set_updated_at
  before update on public.leads
  for each row execute function public.set_updated_at();

create policy "leads: admin update status"
  on public.leads for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "leads: admin delete"
  on public.leads for delete to authenticated
  using ((select public.is_admin()));

-- Admins may change only the workflow status; submitted data and attribution stay immutable.
grant update (status) on public.leads to authenticated;
grant delete on public.leads to authenticated;

-- Anti-spam: per-client rate limiting (called only by the server with the service role) ---------------
create table public.lead_rate_limits (
  bucket text not null check (char_length(bucket) between 1 and 128),
  created_at timestamptz not null default now()
);

comment on table public.lead_rate_limits is 'Lookup: lead submission rate-limit events keyed by a hashed client identifier. No personal data.';

create index lead_rate_limits_bucket_created_at_idx on public.lead_rate_limits (bucket, created_at desc);
create index lead_rate_limits_created_at_idx on public.lead_rate_limits (created_at);

alter table public.lead_rate_limits enable row level security;
revoke all on public.lead_rate_limits from anon, authenticated;
grant all on public.lead_rate_limits to service_role;

-- Records one submission attempt for the bucket and returns true when it is within the limit.
create function public.lead_rate_limit_consume(p_bucket text, p_limit integer, p_window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  recent integer;
begin
  if p_bucket is null or char_length(p_bucket) not between 1 and 128 or p_limit < 1 or p_window_seconds < 1 then
    raise exception 'invalid rate limit arguments';
  end if;

  -- Serialise attempts per bucket so concurrent requests cannot exceed the limit.
  perform pg_advisory_xact_lock(hashtext(p_bucket));

  delete from public.lead_rate_limits where created_at < now() - interval '1 day';

  select count(*) into recent
    from public.lead_rate_limits
   where bucket = p_bucket
     and created_at > now() - make_interval(secs => p_window_seconds);

  if recent >= p_limit then
    return false;
  end if;

  insert into public.lead_rate_limits (bucket) values (p_bucket);
  return true;
end;
$$;

revoke all on function public.lead_rate_limit_consume(text, integer, integer) from public, anon, authenticated;
grant execute on function public.lead_rate_limit_consume(text, integer, integer) to service_role;

-- Blog slugs: allow lowercase letters of any script (previously Latin + Hebrew only) ----------------------
alter table public.posts drop constraint posts_slug_check;
alter table public.posts add constraint posts_slug_check check (
  char_length(slug) <= 120
  and slug ~ '^[^[:space:][:upper:]/?#%&"''<>\\-]+(-[^[:space:][:upper:]/?#%&"''<>\\-]+)*$'
);

-- Consent Mode v2 default ------------------------------------------------------------------------------
alter table public.site_settings
  add column consent_default text not null default 'granted'
    constraint site_settings_consent_default_check check (consent_default in ('granted', 'denied'));
