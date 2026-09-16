-- Lookup website infrastructure — 6: service area setting.
-- Adds an admin-editable service area to the site settings. Additive only; no data is written.
-- Aborts WITHOUT changing anything if run before 1–5 or run twice.

do $$
begin
  if to_regclass('public.site_settings') is null or not exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'site_settings' and column_name = 'consent_default'
  ) then
    raise exception 'Lookup service area migration aborted: apply migrations 1-5 first. Nothing was changed.';
  end if;

  if exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'site_settings' and column_name = 'service_area'
  ) then
    raise exception 'Lookup service area migration aborted: it is already applied. Nothing was changed.';
  end if;
end
$$;

alter table public.site_settings
  add column service_area text check (char_length(service_area) <= 300);

comment on column public.site_settings.service_area is
  'Visitor-facing service area (e.g. regions served). Shown on the site and used as schema.org areaServed; empty hides it.';
