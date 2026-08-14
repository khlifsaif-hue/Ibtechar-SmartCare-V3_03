begin;

-- Finance needs row-level UPDATE access, while the trigger below limits that
-- access to the approved_budget column. Admin retains full project access.
drop policy if exists projects_manage on public.projects;
drop policy if exists projects_finance_update on public.projects;
drop policy if exists projects_insert_admin_manager on public.projects;
drop policy if exists projects_update_authorized on public.projects;
drop policy if exists projects_delete_admin_manager on public.projects;

create policy projects_insert_admin_manager
on public.projects
for insert
to authenticated
with check (app_private.is_admin_or_manager());

create policy projects_update_authorized
on public.projects
for update
to authenticated
using (app_private.current_role() in ('ADMIN','MANAGER','FINANCE'))
with check (app_private.current_role() in ('ADMIN','MANAGER','FINANCE'));

create policy projects_delete_admin_manager
on public.projects
for delete
to authenticated
using (app_private.is_admin_or_manager());

create or replace function app_private.enforce_project_budget_editor()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  actor_role text := app_private.current_role();
begin
  if old.approved_budget is distinct from new.approved_budget
     and actor_role not in ('ADMIN','FINANCE') then
    raise exception 'Only Admin and Finance can edit an approved project budget';
  end if;

  if actor_role = 'FINANCE' and (
    old.name is distinct from new.name or
    old.manager is distinct from new.manager or
    old.committed is distinct from new.committed or
    old.spent is distinct from new.spent or
    old.status is distinct from new.status or
    old.image_path is distinct from new.image_path
  ) then
    raise exception 'Finance may update only the approved project budget';
  end if;

  return new;
end;
$$;

revoke all on function app_private.enforce_project_budget_editor() from public, anon, authenticated;

drop trigger if exists projects_enforce_budget_editor on public.projects;
create trigger projects_enforce_budget_editor
before update on public.projects
for each row execute function app_private.enforce_project_budget_editor();

commit;
