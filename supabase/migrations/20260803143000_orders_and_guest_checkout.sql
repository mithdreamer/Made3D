create table if not exists public.orders (
  id text primary key,
  order_number text not null unique,
  customer jsonb not null,
  items jsonb not null,
  subtotal numeric(12,2) not null default 0,
  shipping numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  status text not null default 'new',
  payment_method text not null default '',
  payment_status text not null default 'pending',
  payment_provider text not null default 'manual',
  transaction_id text not null default '',
  cargo_company text not null default '',
  tracking_number text not null default '',
  tracking_url text not null default '',
  shipment_status text not null default 'pending',
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orders_items_is_array check (jsonb_typeof(items) = 'array'),
  constraint orders_customer_is_object check (jsonb_typeof(customer) = 'object'),
  constraint orders_total_nonnegative check (subtotal >= 0 and shipping >= 0 and total >= 0)
);

create index if not exists orders_created_at_idx on public.orders (created_at desc);
alter table public.orders enable row level security;

drop policy if exists "orders_guest_insert" on public.orders;
drop policy if exists "orders_admin_select" on public.orders;
drop policy if exists "orders_admin_update" on public.orders;

create policy "orders_guest_insert"
on public.orders for insert
to anon, authenticated
with check (
  status = 'new'
  and payment_status = 'pending'
  and payment_provider = 'manual'
  and jsonb_array_length(items) > 0
);

create policy "orders_admin_select"
on public.orders for select
to authenticated
using (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin');

create policy "orders_admin_update"
on public.orders for update
to authenticated
using (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin')
with check (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin');

revoke all on table public.orders from anon, authenticated;
grant insert on table public.orders to anon;
grant insert, select, update on table public.orders to authenticated;
