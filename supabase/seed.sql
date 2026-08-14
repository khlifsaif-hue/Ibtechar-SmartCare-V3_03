-- Safe demo/reference data. Auth users are created from the SmartCare User Management screen.
insert into public.app_modules(module_key,title,path,enabled,sort_order) values
('overview','Overview','/',true,10),('assets','Assets','/assets',true,20),
('projects','Project Budgets','/projects',true,30),('project_dashboard','Project Dashboard','/project-dashboard',true,40),
('purchase_requests','Purchase Requests','/purchase-requests',true,50),('procurement','Procurement','/procurement',true,60),
('inventory','Spare Parts','/inventory',true,70),('depreciation','Depreciation','/depreciation',true,80),
('imports','Bulk Upload','/imports',true,90),('maintenance','Maintenance','/maintenance',true,100),
('work_orders','Work Orders','/work-orders',true,110),('ai_assistant','AI Assistant','/ai-assistant',true,120),
('integrations','Integrations','/integrations',true,130),('reports','Reports','/reports',true,140),
('users','User Management','/users',true,150),('project_tasks','Project Tasks','/tasks',true,155),
('locations','Locations','/locations',true,160),('access_control','Interface & Access','/access-control',true,170)
on conflict(module_key) do update set title=excluded.title,path=excluded.path,sort_order=excluded.sort_order;

insert into public.projects(name,manager,approved_budget,status) values
('Ibtechar','Technical Services',420000,'Active'),
('Sanea','Programs Office',650000,'Active'),
('Studio 5','Studio Operations',540000,'Active'),
('DIC','Projects Office',300000,'Active')
on conflict(name) do update set manager=excluded.manager;

insert into public.budget_branches(project_id,name)
select p.id,b.name from public.projects p cross join (values('Marketing'),('Equipment'),('Consumables'),('Call-off')) b(name)
on conflict(project_id,name) do nothing;

insert into public.locations(name,project_id,active) values
('STUDIO 5',null,true),('IBTECHAR_OFFICE',null,true),('IBTECHAR_STORE',null,true),
('MCIT',null,true),('TEEN_HUT',null,true)
on conflict(name) do update set active=true;

insert into public.assets(id,project_id,name,manufacturer,model,serial_number,category,location,installed_on,warranty_until,status,tone,health,uptime,metric_label,metric,maintenance_label,maintenance,data_source,connectivity,last_seen,owner,acquisition_cost,residual_value,useful_life_years,purchase_date,insured,open_box,damage_percent)
select '3DP-00123',p.id,'Bambu Lab 3D Printer','Bambu Lab','X1 Carbon','BBL-PILOT-00123','FDM 3D Printer','IBTECHAR_OFFICE','2025-09-12','2027-09-11','Healthy','healthy',92,98.2,'Utilization','72%','Next maintenance','In 18 days','Supabase seed','Online',now(),'Additive Manufacturing Team',8200,820,4,'2025-09-12',true,false,0 from public.projects p where p.name='Ibtechar'
on conflict(id) do nothing;

insert into public.assets(id,project_id,name,manufacturer,model,serial_number,category,location,installed_on,warranty_until,status,tone,health,uptime,metric_label,metric,maintenance_label,maintenance,data_source,connectivity,last_seen,owner,acquisition_cost,residual_value,useful_life_years,purchase_date,insured,open_box,damage_percent)
select 'CNC-00078',p.id,'Monolab SR20 CNC','Monolab','SR20','MONO-SR20-00078','CNC Router','IBTECHAR_STORE','2024-08-20','2026-08-19','Maintenance due','due',71,88.5,'Spindle hours','1,240 h','Lubrication service','Overdue','Supabase seed','Local gateway',now(),'Digital Fabrication Team',95000,9500,8,'2024-08-20',true,false,4 from public.projects p where p.name='Sanea'
on conflict(id) do nothing;

insert into public.assets(id,project_id,name,manufacturer,model,serial_number,category,location,installed_on,warranty_until,status,tone,health,uptime,metric_label,metric,maintenance_label,maintenance,data_source,connectivity,last_seen,owner,acquisition_cost,residual_value,useful_life_years,purchase_date,insured,open_box,damage_percent)
select 'LAS-00055',p.id,'Thunder Laser Bolt','Thunder Laser','Bolt','THB-00055','RF CO₂ Laser Engraver','STUDIO 5','2025-01-10','2027-01-09','Warning','warning',63,84.1,'Airflow','Below baseline','Extraction inspection','Required','Supabase seed','Edge monitor',now(),'Studio 5 Operations',68000,6800,7,'2025-01-10',true,true,8 from public.projects p where p.name='Studio 5'
on conflict(id) do nothing;
