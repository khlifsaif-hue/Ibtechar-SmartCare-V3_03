-- Ibtechar SmartCare V3_03 — Demo Day lifecycle fixes only
begin;

alter table public.purchase_orders
  add column if not exists received_at date,
  add column if not exists received_condition text,
  add column if not exists received_by uuid references public.profiles(id) on delete set null,
  add column if not exists received_manufacturer text,
  add column if not exists received_model text,
  add column if not exists received_serial_number text,
  add column if not exists received_warranty_until date;

alter table public.assets
  add column if not exists purchase_order_id text references public.purchase_orders(id) on delete set null;
create index if not exists assets_purchase_order_idx on public.assets(purchase_order_id);

alter table public.work_orders
  add column if not exists diagnostic_session_id bigint references public.diagnostic_sessions(id) on delete set null,
  add column if not exists completed_at timestamptz,
  add column if not exists completion_work text,
  add column if not exists resolution text,
  add column if not exists completion_technician text,
  add column if not exists completion_part_note text;
create index if not exists work_orders_diagnostic_session_idx on public.work_orders(diagnostic_session_id);

commit;
