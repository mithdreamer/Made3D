-- Made3D product_images metadata and RLS migration
-- Review existing policies before running in production.
--
-- Optional preflight audit before applying:
-- select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
-- from pg_policies
-- where schemaname = 'public'
--   and tablename = 'product_images'
-- order by policyname;

create extension if not exists pgcrypto;

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.product_images
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists storage_provider text not null default 'cloudflare_r2',
  add column if not exists bucket_name text not null default 'made3d-media',
  add column if not exists object_key text,
  add column if not exists public_url text,
  add column if not exists original_file_name text,
  add column if not exists mime_type text,
  add column if not exists size_bytes bigint,
  add column if not exists alt_text text,
  add column if not exists sort_order integer not null default 0,
  add column if not exists is_primary boolean not null default false;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'product_images'
      and column_name = 'is_cover'
  ) then
    execute 'update public.product_images set is_primary = is_cover where is_primary is distinct from is_cover';
  end if;
end
$$;

update public.product_images
set
  storage_provider = coalesce(nullif(storage_provider, ''), 'cloudflare_r2'),
  bucket_name = coalesce(nullif(bucket_name, ''), 'made3d-media'),
  sort_order = coalesce(sort_order, 0),
  is_primary = coalesce(is_primary, false),
  updated_at = coalesce(updated_at, now())
where storage_provider is null
  or bucket_name is null
  or sort_order is null
  or is_primary is null
  or updated_at is null;

with ranked_primary_images as (
  select
    id,
    row_number() over (
      partition by product_id
      order by coalesce(sort_order, 0) asc, coalesce(created_at, 'epoch'::timestamptz) asc, id asc
    ) as primary_rank
  from public.product_images
  where is_primary = true
),
duplicate_primary_images as (
  select id
  from ranked_primary_images
  where primary_rank > 1
)
update public.product_images pi
set
  is_primary = false,
  updated_at = now()
from duplicate_primary_images dpi
where pi.id = dpi.id;

do $$
begin
  if to_regclass('public.product_images_one_primary_per_product_idx') is null
    and to_regclass('public.ux_product_images_one_primary') is null
  then
    execute $index$
      create unique index product_images_one_primary_per_product_idx
      on public.product_images (product_id)
      where is_primary = true
    $index$;
  end if;
end
$$;

create unique index if not exists product_images_object_key_unique_idx
  on public.product_images (object_key)
  where object_key is not null and object_key <> '';

do $$
begin
  if to_regclass('public.product_images_product_sort_idx') is null
    and to_regclass('public.ix_product_images_product_sort') is null
  then
    execute $index$
      create index product_images_product_sort_idx
      on public.product_images (product_id, sort_order, created_at)
    $index$;
  end if;
end
$$;

alter table public.product_images enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'product_images'
      and policyname = 'product_images_public_select_active_product_or_admin'
  ) then
    execute $policy$
      create policy product_images_public_select_active_product_or_admin
      on public.product_images
      for select
      to anon, authenticated
      using (
        exists (
          select 1
          from public.products p
          where p.id = product_images.product_id
            and p.is_active = true
        )
        or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
      )
    $policy$;
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'product_images'
      and policyname = 'product_images_admin_insert'
  ) then
    execute $policy$
      create policy product_images_admin_insert
      on public.product_images
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
      and tablename = 'product_images'
      and policyname = 'product_images_admin_update'
  ) then
    execute $policy$
      create policy product_images_admin_update
      on public.product_images
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
      and tablename = 'product_images'
      and policyname = 'product_images_admin_delete'
  ) then
    execute $policy$
      create policy product_images_admin_delete
      on public.product_images
      for delete
      to authenticated
      using (
        coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
      )
    $policy$;
  end if;
end
$$;
