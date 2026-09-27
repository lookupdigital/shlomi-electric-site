-- Lookup website infrastructure — 7: Consent Mode defaults to "denied" for new sites.
-- Migration 5 added site_settings.consent_default with the default 'granted'. New Lookup Starter sites start
-- privacy-first: the column default becomes 'denied', and the settings row of a site that has never been configured
-- (no site name and no business name yet) is switched to 'denied'. An already configured site keeps its saved value.
-- Aborts WITHOUT changing anything if run before 1–6 or run twice.

do $$
begin
  if not exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'site_settings' and column_name = 'service_area'
  ) then
    raise exception 'Lookup consent default migration aborted: apply migrations 1-6 first. Nothing was changed.';
  end if;

  if exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'site_settings' and column_name = 'consent_default'
       and column_default like '%denied%'
  ) then
    raise exception 'Lookup consent default migration aborted: it is already applied. Nothing was changed.';
  end if;
end
$$;

alter table public.site_settings alter column consent_default set default 'denied';

update public.site_settings
   set consent_default = 'denied'
 where id = 1
   and site_name is null
   and business_name is null;
