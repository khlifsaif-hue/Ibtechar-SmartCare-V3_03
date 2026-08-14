-- Use only if a verified Supabase Auth user can sign in but SmartCare says
-- that the identity is not linked to a profile. This safely repairs Saif's
-- profile in the CURRENT Supabase project; it does not expose admin secrets.
insert into public.profiles (id, email, full_name, department, job_title, phone, active, role_id)
select
  u.id,
  lower(u.email),
  coalesce(nullif(u.raw_user_meta_data->>'full_name', ''), 'Saif Khlif'),
  'Ibtechar',
  'SmartCare Developer & System Administrator',
  '',
  true,
  r.id
from auth.users u
cross join public.roles r
where lower(u.email) = lower('saif@ibtechar.com')
  and r.name = 'ADMIN'
on conflict (id) do update set
  email = excluded.email,
  full_name = excluded.full_name,
  department = excluded.department,
  job_title = excluded.job_title,
  active = true,
  role_id = excluded.role_id;

select p.full_name, p.email, p.active, r.name as role
from public.profiles p
join public.roles r on r.id = p.role_id
where lower(p.email) = lower('saif@ibtechar.com');
