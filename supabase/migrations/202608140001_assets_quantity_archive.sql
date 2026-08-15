begin;

alter table public.assets
  add column if not exists quantity integer not null default 1,
  add column if not exists notes text not null default '',
  add column if not exists source_link text not null default '',
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references auth.users(id) on delete set null;

alter table public.assets
  drop constraint if exists assets_quantity_positive;

alter table public.assets
  add constraint assets_quantity_positive check (quantity > 0);

create index if not exists assets_active_project_idx
  on public.assets(project_id)
  where deleted_at is null;

create index if not exists assets_deleted_by_idx
  on public.assets(deleted_by)
  where deleted_by is not null;

comment on column public.assets.quantity is 'Number of identical units represented by this asset record.';
comment on column public.assets.deleted_at is 'Soft-delete timestamp. Archived assets retain their maintenance history.';

commit;
