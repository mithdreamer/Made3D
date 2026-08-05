alter table public.color_master enable row level security;

drop policy if exists "color_master_admin_select"
on public.color_master;

drop policy if exists "color_master_admin_update"
on public.color_master;

drop policy if exists "color_master_specific_admin_update"
on public.color_master;

create policy "color_master_admin_select"
on public.color_master
for select
to authenticated
using (
  coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
);

create policy "color_master_admin_update"
on public.color_master
for update
to authenticated
using (
  coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
)
with check (
  coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
);