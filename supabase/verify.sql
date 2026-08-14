-- Read-only verification after migration + seed.
select 'projects' as check_name,count(*)::text as result from public.projects
union all select 'assets',count(*)::text from public.assets
union all select 'modules',count(*)::text from public.app_modules
union all select 'storage_buckets',count(*)::text from storage.buckets where id in ('asset-images','diagnostic-images','purchase-order-pdfs','reports','manuals');

select schemaname,tablename,rowsecurity
from pg_tables
where schemaname='public' and tablename in ('profiles','projects','assets','purchase_requests','purchase_orders','project_tasks','notifications')
order by tablename;
