-- Ibtechar SmartCare V3_01 — unified project control, protected finance and RBAC
-- Developed by Seif Khlif
begin;

create extension if not exists pgcrypto;

-- Roles are positions. CEO and ADMIN are the only platform-wide super users.
alter table public.roles drop constraint if exists roles_name_check;
alter table public.roles add constraint roles_name_check check (
  name in ('CEO','ADMIN','PROJECT_MANAGER','MANAGER','FINANCE','TECHNICIAN','STAFF','VIEWER')
);
insert into public.roles(name) values
  ('CEO'),('ADMIN'),('PROJECT_MANAGER'),('MANAGER'),('FINANCE'),('TECHNICIAN'),('STAFF'),('VIEWER')
on conflict (name) do nothing;

create or replace function app_private.is_platform_admin()
returns boolean language sql stable security definer set search_path = ''
as $$ select coalesce(app_private.current_role() in ('CEO','ADMIN'),false) $$;
revoke all on function app_private.is_platform_admin() from public, anon;
grant execute on function app_private.is_platform_admin() to authenticated;

-- Kept for backward-compatible policies; MANAGER is no longer a global super user.
create or replace function app_private.is_admin_or_manager()
returns boolean language sql stable security definer set search_path = ''
as $$ select app_private.is_platform_admin() $$;

create or replace function app_private.can_project(target_project uuid, action_name text default 'view')
returns boolean language sql stable security definer set search_path = ''
as $$
  select app_private.is_platform_admin() or exists (
    select 1 from public.user_project_access a
    where a.user_id=(select auth.uid()) and a.project_id=target_project
      and case action_name
        when 'create' then a.can_create
        when 'edit' then a.can_edit
        when 'approve' then a.can_approve
        else a.can_view
      end
  )
$$;

create or replace function app_private.can_view_financials(target_project uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select app_private.is_platform_admin()
    or (
      app_private.current_role() in ('PROJECT_MANAGER','FINANCE')
      and app_private.can_project(target_project,'view')
    )
$$;
revoke all on function app_private.can_view_financials(uuid) from public, anon;
grant execute on function app_private.can_view_financials(uuid) to authenticated;

create or replace function app_private.can_manage_project(target_project uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select app_private.is_platform_admin()
    or (
      app_private.current_role() in ('PROJECT_MANAGER','FINANCE')
      and app_private.can_project(target_project,'edit')
    )
$$;
revoke all on function app_private.can_manage_project(uuid) from public, anon;
grant execute on function app_private.can_manage_project(uuid) to authenticated;

-- Financial values live in protected tables. Staff and technicians cannot query them.
create table if not exists public.project_financials (
  project_id uuid primary key references public.projects(id) on delete cascade,
  approved_budget numeric(14,2) not null default 0 check (approved_budget >= 0),
  committed numeric(14,2) not null default 0 check (committed >= 0),
  spent numeric(14,2) not null default 0 check (spent >= 0),
  updated_at timestamptz not null default now()
);
insert into public.project_financials(project_id,approved_budget,committed,spent)
select id,approved_budget,committed,spent from public.projects
on conflict(project_id) do update set
  approved_budget=excluded.approved_budget,
  committed=excluded.committed,
  spent=excluded.spent;

create table if not exists public.asset_financials (
  asset_id text primary key references public.assets(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  acquisition_cost numeric(14,2) not null default 0 check (acquisition_cost >= 0),
  residual_value numeric(14,2) not null default 0 check (residual_value >= 0),
  useful_life_years integer not null default 5 check (useful_life_years > 0),
  purchase_date date,
  insured boolean not null default false,
  open_box boolean not null default false,
  damage_percent integer not null default 0 check (damage_percent between 0 and 100),
  updated_at timestamptz not null default now()
);
create index if not exists asset_financials_project_idx on public.asset_financials(project_id);
insert into public.asset_financials(asset_id,project_id,acquisition_cost,residual_value,useful_life_years,purchase_date,insured,open_box,damage_percent)
select id,project_id,acquisition_cost,residual_value,useful_life_years,purchase_date,insured,open_box,damage_percent
from public.assets
on conflict(asset_id) do update set
  project_id=excluded.project_id,
  acquisition_cost=excluded.acquisition_cost,
  residual_value=excluded.residual_value,
  useful_life_years=excluded.useful_life_years,
  purchase_date=excluded.purchase_date,
  insured=excluded.insured,
  open_box=excluded.open_box,
  damage_percent=excluded.damage_percent;

alter table public.projects
  drop column approved_budget,
  drop column committed,
  drop column spent;
alter table public.assets
  drop column acquisition_cost,
  drop column residual_value,
  drop column useful_life_years,
  drop column purchase_date,
  drop column insured,
  drop column open_box,
  drop column damage_percent;

-- Teams can own trackable items and have a many-to-many membership.
create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  description text not null default '',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(project_id,name)
);
create table if not exists public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key(group_id,user_id)
);

create table if not exists public.trackable_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  type text not null check (type in ('task','activity','kpi','milestone')),
  title text not null,
  description text not null default '',
  category text not null default '',
  owner_type text check (owner_type in ('user','group')),
  owner_user_id uuid references public.profiles(id) on delete set null,
  owner_group_id uuid references public.groups(id) on delete set null,
  reviewer_id uuid references public.profiles(id) on delete set null,
  group_target_mode text not null default 'shared' check (group_target_mode in ('shared','split')),
  metric_type text check (metric_type in ('numeric','percentage','currency','boolean','milestone')),
  target_value numeric,
  current_value numeric,
  unit text,
  frequency text check (frequency in ('daily','weekly','monthly','quarterly','one-time')),
  status text not null default 'not_started' check (status in ('not_started','pending','accepted','deferred','in_progress','on_track','at_risk','off_track','completed','archived','cancelled')),
  progress_percent numeric(5,2) not null default 0 check (progress_percent between 0 and 100),
  priority text not null default 'normal' check (priority in ('low','normal','medium','high','critical')),
  weight numeric(8,2) not null default 1 check (weight >= 0),
  start_date date,
  due_date date,
  defer_reason text,
  response_note text,
  responded_at timestamptz,
  source_key text,
  source_config jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trackable_owner_shape check (
    (owner_type is null and owner_user_id is null and owner_group_id is null)
    or (owner_type='user' and owner_user_id is not null and owner_group_id is null)
    or (owner_type='group' and owner_user_id is null and owner_group_id is not null)
  ),
  constraint trackable_kpi_shape check (
    type <> 'kpi' or (metric_type is not null and target_value is not null)
  )
);
create index if not exists trackable_project_idx on public.trackable_items(project_id,type,status,due_date);
create index if not exists trackable_owner_user_idx on public.trackable_items(owner_user_id,status,due_date);
create index if not exists trackable_owner_group_idx on public.trackable_items(owner_group_id,status,due_date);
create unique index if not exists trackable_source_key_idx on public.trackable_items(source_key) where source_key is not null;

create table if not exists public.progress_logs (
  id uuid primary key default gen_random_uuid(),
  trackable_item_id uuid not null references public.trackable_items(id) on delete cascade,
  updated_by uuid references public.profiles(id) on delete set null,
  value numeric,
  progress_percent numeric(5,2) check (progress_percent between 0 and 100),
  status text,
  note text,
  attachment_url text,
  created_at timestamptz not null default now()
);
create index if not exists progress_logs_item_idx on public.progress_logs(trackable_item_id,created_at desc);

create table if not exists public.risk_issues (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  description text not null default '',
  severity text not null default 'medium' check (severity in ('low','medium','high','critical')),
  status text not null default 'open' check (status in ('open','mitigated','closed')),
  owner_user_id uuid references public.profiles(id) on delete set null,
  due_date date,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists risk_issues_project_idx on public.risk_issues(project_id,status,severity,due_date);

-- Trackable status is recalculated when progress changes.
create or replace function public.calculate_trackable_status(
  p_progress numeric, p_target numeric, p_current numeric, p_start date, p_due date, p_type text
) returns text language plpgsql stable set search_path = '' as $$
declare
  progress numeric := greatest(0,least(100,coalesce(p_progress,
    case when p_target is not null and p_target <> 0 then p_current / p_target * 100 else 0 end)));
  elapsed numeric;
begin
  if progress >= 100 then return 'completed'; end if;
  if p_due is not null and current_date > p_due then return 'off_track'; end if;
  if p_start is null or p_due is null or p_due <= p_start then
    return case when progress > 0 then 'on_track' else 'not_started' end;
  end if;
  elapsed := greatest(0,least(100,(current_date-p_start)::numeric / greatest(1,(p_due-p_start)) * 100));
  if progress + 20 < elapsed then return 'off_track'; end if;
  if progress + 10 < elapsed then return 'at_risk'; end if;
  return case when progress > 0 then 'on_track' else 'not_started' end;
end $$;

create or replace function public.refresh_trackable_status()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.status not in ('completed','archived','cancelled','deferred','pending','accepted') then
    new.status=public.calculate_trackable_status(new.progress_percent,new.target_value,new.current_value,new.start_date,new.due_date,new.type);
  end if;
  new.updated_at=now();
  return new;
end $$;

create or replace function public.create_trackable_progress_log()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.progress_logs(trackable_item_id,updated_by,value,progress_percent,status,note)
  values(new.id,(select auth.uid()),new.current_value,new.progress_percent,new.status,'Automatic update from linked source');
  return new;
end $$;

create or replace function public.apply_trackable_source_event(
  p_source_key text,p_current_value numeric,p_progress_percent numeric default null,p_note text default 'Automated source update'
) returns uuid language plpgsql security definer set search_path = '' as $$
declare target_id uuid;
begin
  update public.trackable_items set
    current_value=p_current_value,
    progress_percent=coalesce(p_progress_percent,progress_percent),
    updated_at=now()
  where source_key=p_source_key
  returning id into target_id;
  if target_id is null then raise exception 'Unknown trackable source key'; end if;
  insert into public.progress_logs(trackable_item_id,updated_by,value,progress_percent,status,note)
  select id,(select auth.uid()),current_value,progress_percent,status,p_note from public.trackable_items where id=target_id;
  return target_id;
end $$;
revoke all on function public.apply_trackable_source_event(text,numeric,numeric,text) from public,anon;
grant execute on function public.apply_trackable_source_event(text,numeric,numeric,text) to authenticated,service_role;
drop trigger if exists trackable_status_refresh on public.trackable_items;
create trigger trackable_status_refresh before insert or update of progress_percent,current_value,target_value,start_date,due_date,status
on public.trackable_items for each row execute function public.refresh_trackable_status();

do $$ declare t text; begin
  foreach t in array array['project_financials','asset_financials','groups','group_members','trackable_items','progress_logs','risk_issues'] loop
    execute format('alter table public.%I enable row level security',t);
  end loop;
end $$;

create policy project_financials_read on public.project_financials for select to authenticated
using (app_private.can_view_financials(project_id));
create policy project_financials_write on public.project_financials for all to authenticated
using (app_private.can_manage_project(project_id)) with check (app_private.can_manage_project(project_id));
create policy asset_financials_read on public.asset_financials for select to authenticated
using (app_private.can_view_financials(project_id));
create policy asset_financials_write on public.asset_financials for all to authenticated
using (app_private.can_manage_project(project_id)) with check (app_private.can_manage_project(project_id));

-- Financial workflow rows are also protected from STAFF/TECHNICIAN direct Data API access.
drop policy if exists expenses_read on public.project_expenses;
drop policy if exists expenses_write on public.project_expenses;
create policy expenses_read on public.project_expenses for select to authenticated
using (app_private.can_view_financials(project_id));
create policy expenses_write on public.project_expenses for all to authenticated
using (app_private.can_manage_project(project_id)) with check (app_private.can_manage_project(project_id));
drop policy if exists purchase_orders_read on public.purchase_orders;
drop policy if exists purchase_orders_write on public.purchase_orders;
create policy purchase_orders_read on public.purchase_orders for select to authenticated
using (app_private.can_view_financials(project_id));
create policy purchase_orders_write on public.purchase_orders for all to authenticated
using (app_private.can_manage_project(project_id)) with check (app_private.can_manage_project(project_id));
drop policy if exists project_children_read_budget on public.budget_branches;
drop policy if exists project_children_write_budget on public.budget_branches;
create policy project_children_read_budget on public.budget_branches for select to authenticated
using (app_private.can_view_financials(project_id));
create policy project_children_write_budget on public.budget_branches for all to authenticated
using (app_private.can_manage_project(project_id)) with check (app_private.can_manage_project(project_id));

drop policy if exists projects_manage on public.projects;
create policy projects_insert on public.projects for insert to authenticated
with check (app_private.is_platform_admin());
create policy projects_update on public.projects for update to authenticated
using (app_private.can_manage_project(id)) with check (app_private.can_manage_project(id));
create policy projects_delete on public.projects for delete to authenticated
using (app_private.is_platform_admin());

drop policy if exists spare_parts_write on public.spare_parts;
create policy spare_parts_write on public.spare_parts for all to authenticated
using (app_private.is_platform_admin() or app_private.current_role()='TECHNICIAN')
with check (app_private.is_platform_admin() or app_private.current_role()='TECHNICIAN');

create policy groups_read on public.groups for select to authenticated using (app_private.can_project(project_id,'view'));
create policy groups_write on public.groups for all to authenticated using (app_private.can_project(project_id,'edit')) with check (app_private.can_project(project_id,'edit'));
create policy group_members_read on public.group_members for select to authenticated using (
  exists(select 1 from public.groups g where g.id=group_id and app_private.can_project(g.project_id,'view'))
);
create policy group_members_write on public.group_members for all to authenticated using (
  exists(select 1 from public.groups g where g.id=group_id and app_private.can_project(g.project_id,'edit'))
) with check (
  exists(select 1 from public.groups g where g.id=group_id and app_private.can_project(g.project_id,'edit'))
);

create policy trackables_read on public.trackable_items for select to authenticated using (
  app_private.can_project(project_id,'view')
  or owner_user_id=(select auth.uid())
  or reviewer_id=(select auth.uid())
  or exists(select 1 from public.group_members gm where gm.group_id=owner_group_id and gm.user_id=(select auth.uid()))
);
create policy trackables_create on public.trackable_items for insert to authenticated with check (
  created_by=(select auth.uid()) and app_private.can_project(project_id,'create')
);
create policy trackables_update on public.trackable_items for update to authenticated using (
  app_private.can_project(project_id,'edit')
  or owner_user_id=(select auth.uid())
  or reviewer_id=(select auth.uid())
  or exists(select 1 from public.group_members gm where gm.group_id=owner_group_id and gm.user_id=(select auth.uid()))
) with check (app_private.can_project(project_id,'view'));
create policy trackables_delete on public.trackable_items for delete to authenticated using (
  app_private.is_platform_admin() or (created_by=(select auth.uid()) and app_private.can_project(project_id,'edit'))
);

create policy progress_logs_read on public.progress_logs for select to authenticated using (
  exists(select 1 from public.trackable_items t where t.id=trackable_item_id)
);
create policy progress_logs_create on public.progress_logs for insert to authenticated with check (
  updated_by=(select auth.uid()) and exists(select 1 from public.trackable_items t where t.id=trackable_item_id)
);
create policy risk_issues_read on public.risk_issues for select to authenticated using (app_private.can_project(project_id,'view'));
create policy risk_issues_write on public.risk_issues for all to authenticated using (app_private.can_project(project_id,'edit')) with check (app_private.can_project(project_id,'edit'));

-- Existing policies now use CEO/ADMIN as the platform-wide boundary.
drop policy if exists profiles_company_read on public.profiles;
create policy profiles_company_read on public.profiles for select to authenticated using (
  id=(select auth.uid()) or app_private.is_platform_admin()
  or exists (
    select 1 from public.user_project_access mine
    join public.user_project_access theirs on theirs.project_id=mine.project_id
    where mine.user_id=(select auth.uid()) and theirs.user_id=profiles.id and mine.can_view
  )
);

drop policy if exists notifications_create on public.notifications;
create policy notifications_create on public.notifications for insert to authenticated with check (
  app_private.current_role() in ('CEO','ADMIN','PROJECT_MANAGER','MANAGER','FINANCE','TECHNICIAN','STAFF')
);

insert into public.app_modules(module_key,title,path,enabled,sort_order) values
  ('project_tasks','Tasks, Activities & KPIs','/tasks',true,12),
  ('project_risks','Risks & Issues','/risks',true,13)
on conflict(module_key) do update set title=excluded.title,path=excluded.path,enabled=true;

-- Seed only missing rows. Never overwrite permissions customized later by a
-- CEO or Admin in Interface & Access Management.
insert into public.user_permissions(user_id,module_key,can_view,can_create,can_edit,can_delete,can_approve)
select p.id,m.module_key,
  case
    when upper(r.name) in ('CEO','ADMIN') then true
    when upper(r.name)='PROJECT_MANAGER' then m.module_key in ('overview','projects','project_budgets','project_dashboard','assets','maintenance','work_orders','lab_calendar','purchase_requests','spare_parts','reports','project_tasks','project_risks')
    when upper(r.name)='MANAGER' then m.module_key in ('overview','projects','project_dashboard','assets','maintenance','work_orders','lab_calendar','purchase_requests','reports','project_tasks','project_risks')
    when upper(r.name)='FINANCE' then m.module_key in ('overview','projects','project_budgets','project_dashboard','purchase_requests','procurement','depreciation','reports')
    when upper(r.name)='TECHNICIAN' then m.module_key in ('overview','projects','project_dashboard','assets','maintenance','work_orders','lab_calendar','purchase_requests','spare_parts','reports','project_tasks','ai_assistant')
    when upper(r.name)='STAFF' then m.module_key in ('overview','projects','project_dashboard','assets','purchase_requests','reports','project_tasks')
    else m.module_key in ('overview','projects','project_dashboard','assets','reports')
  end,
  case
    when upper(r.name) in ('CEO','ADMIN') then true
    when upper(r.name)='PROJECT_MANAGER' then m.module_key in ('project_dashboard','maintenance','work_orders','lab_calendar','purchase_requests','project_tasks','project_risks')
    when upper(r.name)='MANAGER' then m.module_key in ('maintenance','work_orders','lab_calendar','purchase_requests','project_tasks','project_risks')
    when upper(r.name)='FINANCE' then m.module_key in ('project_budgets','purchase_requests','procurement','depreciation')
    when upper(r.name)='TECHNICIAN' then m.module_key in ('maintenance','work_orders','purchase_requests','project_tasks','ai_assistant')
    when upper(r.name)='STAFF' then m.module_key in ('purchase_requests','project_tasks')
    else false end,
  case
    when upper(r.name) in ('CEO','ADMIN') then true
    when upper(r.name)='PROJECT_MANAGER' then m.module_key in ('projects','project_budgets','project_dashboard','assets','maintenance','work_orders','lab_calendar','purchase_requests','project_tasks','project_risks')
    when upper(r.name)='MANAGER' then m.module_key in ('project_dashboard','assets','maintenance','work_orders','lab_calendar','purchase_requests','project_tasks','project_risks')
    when upper(r.name)='FINANCE' then m.module_key in ('project_budgets','purchase_requests','procurement','depreciation')
    when upper(r.name)='TECHNICIAN' then m.module_key in ('assets','maintenance','work_orders','purchase_requests','spare_parts','project_tasks')
    when upper(r.name)='STAFF' then m.module_key in ('purchase_requests','project_tasks')
    else false end,
  upper(r.name) in ('CEO','ADMIN'),
  case
    when upper(r.name) in ('CEO','ADMIN') then true
    when upper(r.name) in ('PROJECT_MANAGER','MANAGER') then m.module_key in ('purchase_requests','project_tasks','project_risks')
    when upper(r.name)='FINANCE' then m.module_key in ('purchase_requests','procurement')
    else false end
from public.profiles p
join public.roles r on r.id=p.role_id
cross join public.app_modules m
on conflict (user_id,module_key) do nothing;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('trackable-attachments','trackable-attachments',false,20971520,array['image/jpeg','image/png','image/webp','application/pdf','text/plain','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create policy trackable_attachments_read on storage.objects for select to authenticated using (
  bucket_id='trackable-attachments' and owner_id=(select auth.uid())::text
);
create policy trackable_attachments_insert on storage.objects for insert to authenticated with check (
  bucket_id='trackable-attachments' and (storage.foldername(name))[1]=(select auth.uid())::text
);

-- Import existing tasks and activities once so the new dashboard retains old data.
insert into public.trackable_items(project_id,type,title,description,owner_type,owner_user_id,status,priority,start_date,due_date,defer_reason,response_note,responded_at,created_by,created_at)
select project_id,'task',title,description,'user',assignee_user_id,
  case status when 'Pending' then 'pending' when 'Accepted' then 'accepted' when 'Deferred' then 'deferred' when 'Completed' then 'completed' when 'Cancelled' then 'cancelled' else 'not_started' end,
  lower(priority),created_at::date,due_date,defer_reason,response_note,responded_at,assigned_by_user_id,created_at
from public.project_tasks pt
where not exists (
  select 1 from public.trackable_items ti
  where ti.project_id=pt.project_id and ti.type='task' and ti.title=pt.title and ti.created_at=pt.created_at
);

insert into public.trackable_items(project_id,type,title,description,status,progress_percent,start_date,due_date,created_at)
select project_id,'activity',title,coalesce(type,'') || case when school is not null and school<>'' then ' · '||school else '' end,
  case when lower(status)='completed' then 'completed' else 'on_track' end,
  case when lower(status)='completed' then 100 else 0 end,activity_date,activity_date,created_at
from public.project_activities pa
where not exists (
  select 1 from public.trackable_items ti
  where ti.project_id=pa.project_id and ti.type='activity' and ti.title=pa.title and ti.created_at=pa.created_at
);

grant select,insert,update,delete on public.project_financials,public.asset_financials,public.groups,public.group_members,public.trackable_items,public.progress_logs,public.risk_issues to authenticated;

commit;
