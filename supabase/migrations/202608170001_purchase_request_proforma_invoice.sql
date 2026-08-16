-- Require/retain supplier Proforma Invoice metadata for high-value purchase requests.
alter table public.purchase_requests
  add column if not exists proforma_invoice_path text,
  add column if not exists proforma_invoice_name text;

comment on column public.purchase_requests.proforma_invoice_path is
  'Private Storage path in purchase-order-pdfs bucket for the supplier Proforma Invoice.';
comment on column public.purchase_requests.proforma_invoice_name is
  'Original uploaded Proforma Invoice filename.';
