-- Made3D Admin Authentication Migration - RLS policy draft
-- Do not run blindly. First run the audit query below and compare existing
-- policy names/logic in Supabase Dashboard > SQL Editor.
--
-- Admin check used by these policies:
-- auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'

-- 1) Existing policy audit
select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('categories', 'products', 'product_images', 'orders', 'order_items')
order by tablename, policyname;

-- 2) categories policies
do $$
begin
  if to_regclass('public.categories') is not null then
    execute 'alter table public.categories enable row level security';

    if not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = 'categories'
        and policyname = 'categories_public_select_active_or_admin'
    ) then
      execute $policy$
        create policy categories_public_select_active_or_admin
        on public.categories
        for select
        to anon, authenticated
        using (
          is_active = true
          or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
        )
      $policy$;
    end if;

    if not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = 'categories'
        and policyname = 'categories_admin_insert'
    ) then
      execute $policy$
        create policy categories_admin_insert
        on public.categories
        for insert
        to authenticated
        with check (
          coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
        )
      $policy$;
    end if;

    if not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = 'categories'
        and policyname = 'categories_admin_update'
    ) then
      execute $policy$
        create policy categories_admin_update
        on public.categories
        for update
        to authenticated
        using (
          coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
        )
        with check (
          coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
        )
      $policy$;
    end if;

    if not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = 'categories'
        and policyname = 'categories_admin_delete'
    ) then
      execute $policy$
        create policy categories_admin_delete
        on public.categories
        for delete
        to authenticated
        using (
          coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
        )
      $policy$;
    end if;
  end if;
end
$$;

-- 3) products policies
do $$
begin
  if to_regclass('public.products') is not null then
    execute 'alter table public.products enable row level security';

    if not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = 'products'
        and policyname = 'products_public_select_active_or_admin'
    ) then
      execute $policy$
        create policy products_public_select_active_or_admin
        on public.products
        for select
        to anon, authenticated
        using (
          is_active = true
          or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
        )
      $policy$;
    end if;

    if not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = 'products'
        and policyname = 'products_admin_insert'
    ) then
      execute $policy$
        create policy products_admin_insert
        on public.products
        for insert
        to authenticated
        with check (
          coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
        )
      $policy$;
    end if;

    if not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = 'products'
        and policyname = 'products_admin_update'
    ) then
      execute $policy$
        create policy products_admin_update
        on public.products
        for update
        to authenticated
        using (
          coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
        )
        with check (
          coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
        )
      $policy$;
    end if;

    if not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = 'products'
        and policyname = 'products_admin_delete'
    ) then
      execute $policy$
        create policy products_admin_delete
        on public.products
        for delete
        to authenticated
        using (
          coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
        )
      $policy$;
    end if;
  end if;
end
$$;

-- 4) Tables reviewed but not changed by this draft
-- product_images: current admin code stores image URLs on products and does not
-- write a product_images table. Add admin write policies only after confirming
-- the table schema and public read requirements.
-- orders/order_items: current admin code reads/writes orders in localStorage,
-- not Supabase. Add admin policies when order persistence moves to Supabase.
