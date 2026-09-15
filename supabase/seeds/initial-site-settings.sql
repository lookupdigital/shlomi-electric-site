-- CLIENT-SPECIFIC one-time seed for shlomi-electric-site. Not a migration; not part of the reusable starter.
--
-- Until now these values were fallbacks in code, so clearing a field in /admin/settings brought them back.
-- The code fallbacks have been removed; this copies the values the live site currently shows into the
-- database so the site looks the same, and an admin can now replace OR clear each one.
--
-- WARNING: phone, WhatsApp, email and address below are the Figma DEMO values (see docs/launch-content-checklist.md).
-- Only empty fields are filled; anything already saved in the admin is kept. Safe to run more than once.

update public.site_settings
   set business_name            = coalesce(business_name, 'שלומי שירותי חשמל ועבודות בנייה וקבלנות'),
       site_name                = coalesce(site_name, 'שלומי שירותי חשמל וקבלנות'),
       phone                    = coalesce(phone, '03-555-1234'),
       whatsapp                 = coalesce(whatsapp, '972500000000'),
       email                    = coalesce(email, 'info@nidbach.co.il'),
       address                  = coalesce(address, 'רחוב הברזל 30, תל אביב'),
       logo_url                 = coalesce(logo_url, '/images/logo.png'),
       default_meta_description = coalesce(
         default_meta_description,
         'מעל 27 שנות ניסיון בשיפוץ, הקמה ועבודות גמר למשרדים ועסקים. קבלן רשום, חשמלאי מוסמך וליווי מלא – משלב התכנון ועד למסירת הפרויקט.'
       )
 where id = 1;
