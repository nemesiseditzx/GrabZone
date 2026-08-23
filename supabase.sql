create extension if not exists pgcrypto;
create table if not exists public.products (
 id uuid primary key default gen_random_uuid(),
 name text not null, category text not null, price numeric not null default 0,
 old_price numeric, image_url text not null, tag text, description text,
 published boolean not null default true, created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table if not exists public.notices (
 id uuid primary key default gen_random_uuid(), title text not null, message text not null,
 active boolean not null default true, sort_order integer not null default 0,
 created_at timestamptz not null default now()
);
alter table public.products enable row level security;
alter table public.notices enable row level security;
drop policy if exists "public read published products" on public.products;
create policy "public read published products" on public.products for select using (published=true);
drop policy if exists "public read active notices" on public.notices;
create policy "public read active notices" on public.notices for select using (active=true);
insert into storage.buckets(id,name,public) values('product-images','product-images',true) on conflict(id) do nothing;
drop policy if exists "public read product images" on storage.objects;
create policy "public read product images" on storage.objects for select using(bucket_id='product-images');
drop policy if exists "authenticated upload product images" on storage.objects;
create policy "authenticated upload product images" on storage.objects for insert to authenticated with check(bucket_id='product-images');
drop policy if exists "authenticated update product images" on storage.objects;
create policy "authenticated update product images" on storage.objects for update to authenticated using(bucket_id='product-images') with check(bucket_id='product-images');
drop policy if exists "authenticated delete product images" on storage.objects;
create policy "authenticated delete product images" on storage.objects for delete to authenticated using(bucket_id='product-images');
drop policy if exists "authenticated manage products" on public.products;
create policy "authenticated manage products" on public.products for all to authenticated using(true) with check(true);
drop policy if exists "authenticated manage notices" on public.notices;
create policy "authenticated manage notices" on public.notices for all to authenticated using(true) with check(true);