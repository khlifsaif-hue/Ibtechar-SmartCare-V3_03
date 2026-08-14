-- Ibtechar SmartCare V3_02 — repair the dedicated Risks & Issues route.
-- Safe to run against an existing V3_01 database.
begin;

update public.app_modules
set title = 'Risks & Issues',
    path = '/risks',
    enabled = true,
    sort_order = 13
where module_key = 'project_risks';

commit;
