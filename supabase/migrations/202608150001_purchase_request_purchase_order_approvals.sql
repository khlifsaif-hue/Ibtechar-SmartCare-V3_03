-- SmartCare V3_03: controlled Purchase Request -> Purchase Order -> Asset workflow.
-- Run this migration in Supabase BEFORE deploying the corresponding application code.
begin;

alter table public.purchase_requests
  add column if not exists approved_by uuid references public.profiles(id) on delete set null,
  add column if not exists approved_at timestamptz;

alter table public.purchase_orders
  add column if not exists purchase_request_id text,
  add column if not exists approved_by uuid references public.profiles(id) on delete set null,
  add column if not exists approved_at timestamptz;

-- Preserve links already represented by purchase_requests.purchase_order_id.
update public.purchase_orders po
set purchase_request_id = pr.id
from public.purchase_requests pr
where pr.purchase_order_id = po.id
  and po.purchase_request_id is null;

alter table public.purchase_orders
  drop constraint if exists purchase_orders_purchase_request_id_fkey;

alter table public.purchase_orders
  add constraint purchase_orders_purchase_request_id_fkey
  foreign key (purchase_request_id)
  references public.purchase_requests(id)
  on delete set null;

create unique index if not exists purchase_orders_purchase_request_id_unique
  on public.purchase_orders(purchase_request_id)
  where purchase_request_id is not null;

create index if not exists purchase_orders_approved_by_idx
  on public.purchase_orders(approved_by);

create index if not exists purchase_requests_approved_by_idx
  on public.purchase_requests(approved_by);

commit;
