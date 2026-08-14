-- Run after creating saif@ibtechar.com in Supabase Authentication > Users.
update public.profiles
set role_id = (select id from public.roles where name = 'ADMIN')
where lower(email) = lower('saif@ibtechar.com');

select p.full_name,p.email,p.job_title,r.name as role
from public.profiles p
join public.roles r on r.id=p.role_id
where lower(p.email)=lower('saif@ibtechar.com');
