-- Ibtechar SmartCare V3_01 demonstration data
-- Run after 202608090001_smartcare_v1.sql, seed.sql and 202608130001_smartcare_v3_01_project_control.sql.
-- Uses the first available project/profile so the core remains project-agnostic.
do $$
declare
  demo_project uuid;
  demo_user uuid;
  demo_group uuid;
begin
  select id into demo_project from public.projects order by created_at,id limit 1;
  if demo_project is null then
    insert into public.projects(name,manager,status) values('SmartCare Demo Project','Project Office','Active') returning id into demo_project;
    insert into public.project_financials(project_id,approved_budget,committed,spent) values(demo_project,250000,45000,28000);
  end if;
  select id into demo_user from public.profiles where active order by created_at,id limit 1;

  if demo_user is not null then
    insert into public.groups(project_id,name,description,created_by)
    values(demo_project,'Demo Delivery Team','Cross-functional project delivery team.',demo_user)
    on conflict(project_id,name) do update set description=excluded.description
    returning id into demo_group;
    insert into public.group_members(group_id,user_id) values(demo_group,demo_user) on conflict do nothing;
  end if;

  insert into public.trackable_items(project_id,type,title,description,owner_type,owner_user_id,status,progress_percent,priority,start_date,due_date,source_key,created_by)
  values(demo_project,'task','Complete preventive maintenance review','Review the maintenance plan and close outstanding observations.',case when demo_user is null then null else 'user' end,demo_user,'pending',20,'high',current_date,current_date+7,'demo:maintenance-review',demo_user)
  on conflict(source_key) do nothing;

  insert into public.trackable_items(project_id,type,title,description,owner_type,owner_group_id,status,progress_percent,priority,start_date,due_date,source_key,created_by)
  values(demo_project,'activity','Stakeholder progress workshop','Monthly progress workshop with the project team.',case when demo_group is null then null else 'group' end,demo_group,'on_track',55,'medium',current_date-14,current_date+14,'demo:progress-workshop',demo_user)
  on conflict(source_key) do nothing;

  insert into public.trackable_items(project_id,type,title,description,owner_type,owner_user_id,reviewer_id,metric_type,target_value,current_value,unit,frequency,status,progress_percent,priority,weight,start_date,due_date,source_key,source_config,created_by)
  values(demo_project,'kpi','Planned maintenance completion','Percentage of scheduled maintenance completed on time.',case when demo_user is null then null else 'user' end,demo_user,demo_user,'percentage',95,72,'%', 'monthly','on_track',76,'high',2,current_date-30,current_date+30,'demo:maintenance-completion','{"event":"maintenance.completed","aggregation":"percentage"}'::jsonb,demo_user)
  on conflict(source_key) do nothing;

  insert into public.trackable_items(project_id,type,title,description,status,progress_percent,priority,start_date,due_date,source_key,created_by)
  values(demo_project,'milestone','Project readiness gate','Executive readiness review and acceptance.','at_risk',65,'critical',current_date-20,current_date+10,'demo:readiness-gate',demo_user)
  on conflict(source_key) do nothing;

  insert into public.risk_issues(project_id,title,description,severity,status,owner_user_id,due_date,created_by)
  select demo_project,'Critical spare-part lead time','Supplier lead time may affect the planned maintenance window.','high','open',demo_user,current_date+10,demo_user
  where not exists(select 1 from public.risk_issues where project_id=demo_project and title='Critical spare-part lead time');

  insert into public.progress_logs(trackable_item_id,updated_by,value,progress_percent,status,note)
  select t.id,demo_user,t.current_value,t.progress_percent,t.status,'V3_01 demonstration progress entry'
  from public.trackable_items t
  where t.source_key like 'demo:%' and not exists(select 1 from public.progress_logs l where l.trackable_item_id=t.id);
end $$;
