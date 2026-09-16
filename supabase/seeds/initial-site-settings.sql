-- CLIENT-SPECIFIC one-time seed for shlomi-electric-site. Not a migration; not part of the reusable starter.
--
-- Fills an empty settings row with the business details confirmed by the client. Only empty fields are filled;
-- anything already saved in the admin is kept. Safe to run more than once.
-- The service area is not a database field: it lives in src/site.config.ts (business.serviceArea).

update public.site_settings
   set business_name            = coalesce(business_name, 'שלומי בארון - שירותי חשמל ועבודות בנייה ושיפוצים'),
       site_name                = coalesce(site_name, 'שלומי בארון - שירותי חשמל ועבודות בנייה ושיפוצים'),
       phone                    = coalesce(phone, '050-536-7464'),
       whatsapp                 = coalesce(whatsapp, '050-536-7464'),
       email                    = coalesce(email, 'Shlomi_boaron@walla.co.il'),
       address                  = coalesce(address, 'רננים 14, רמת גן'),
       logo_url                 = coalesce(logo_url, '/images/logo.png'),
       default_meta_description = coalesce(
         default_meta_description,
         'מעל 27 שנות ניסיון בשיפוץ, הקמה ועבודות גמר למשרדים ועסקים. קבלן רשום, חשמלאי מוסמך וליווי מלא – משלב התכנון ועד למסירת הפרויקט.'
       )
 where id = 1;
