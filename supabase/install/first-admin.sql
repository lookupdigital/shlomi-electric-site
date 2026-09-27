-- Grants Admin access to ONE existing Supabase Auth user.
-- 1. Supabase → Authentication → Users → Add user → Create new user (email + strong password, Auto Confirm User).
-- 2. Replace the email below, paste into SQL Editor, run. Expect "INSERT 0 1".
insert into public.admin_users (user_id)
select id from auth.users where email = 'REPLACE-WITH-ADMIN-EMAIL';
