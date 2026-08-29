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

-- GRABZONE AUTOMATED ORDERS
create sequence if not exists public.order_number_seq start with 1;
create table if not exists public.orders (
 id uuid primary key default gen_random_uuid(),
 order_no bigint not null default nextval('public.order_number_seq'),
 order_number text generated always as ('GZ-' || lpad(order_no::text,4,'0')) stored,
 customer_name text not null, email text not null, phone text not null,
 division text not null, district text not null, upazila text, address text not null,
 referral_code text, payment_method text not null default 'Cash on Delivery',
 shipping_charge numeric not null default 130, subtotal numeric not null default 0,
 total numeric not null default 0, status text not null default 'New',
 admin_note text, created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint orders_status_check check(status in ('New','Contacting','Confirmed','Processing','Shipped','Delivered','Cancelled'))
);
alter sequence public.order_number_seq owned by public.orders.order_no;
create table if not exists public.order_items (
 id uuid primary key default gen_random_uuid(),
 order_id uuid not null references public.orders(id) on delete cascade,
 product_id uuid, product_name text not null, image_url text,
 quantity integer not null check(quantity>0), unit_price numeric not null default 0,
 line_total numeric not null default 0
);
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
drop policy if exists "authenticated manage orders" on public.orders;
create policy "authenticated manage orders" on public.orders for all to authenticated using(true) with check(true);
drop policy if exists "authenticated manage order items" on public.order_items;
create policy "authenticated manage order items" on public.order_items for all to authenticated using(true) with check(true);
revoke all on public.orders from anon, authenticated;
revoke all on public.order_items from anon, authenticated;
grant select,insert,update,delete on public.orders to authenticated;
grant select,insert,update,delete on public.order_items to authenticated;
grant usage,select on sequence public.order_number_seq to authenticated;
create unique index if not exists orders_order_number_uidx on public.orders(order_number);
-- GrabZone referral system
alter table public.orders
  add column if not exists referral_discount numeric not null default 0;

-- Customer order tracking fields
alter table public.orders
  add column if not exists tracking_number text,
  add column if not exists tracking_url text,
  add column if not exists tracking_provider text;
create index if not exists orders_tracking_number_idx on public.orders(tracking_number);

-- Private customer tracking ID.
-- This is intentionally random and separate from the sequential internal order number.
alter table public.orders
  add column if not exists public_tracking_id text;

update public.orders
set public_tracking_id = 'GZ-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 16))
where public_tracking_id is null or trim(public_tracking_id) = '';

alter table public.orders
  alter column public_tracking_id
  set default ('GZ-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 16)));

alter table public.orders
  alter column public_tracking_id set not null;

create unique index if not exists orders_public_tracking_id_uidx
  on public.orders(public_tracking_id);

create table if not exists public.referral_codes (
  id uuid primary key default gen_random_uuid(),
  admin_name text not null,
  admin_phone text,
  admin_email text,
  code text not null unique,
  benefit_type text not null default 'fixed'
    check (benefit_type in ('fixed','percentage')),
  benefit_value numeric not null default 0
    check (benefit_value >= 0),
  min_order_amount numeric not null default 0
    check (min_order_amount >= 0),
  max_discount_amount numeric
    check (max_discount_amount is null or max_discount_amount >= 0),
  usage_limit integer
    check (usage_limit is null or usage_limit >= 0),
  used_count integer not null default 0
    check (used_count >= 0),
  starts_at timestamptz,
  expires_at timestamptz,
  active boolean not null default true,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.referral_codes enable row level security;
drop policy if exists "authenticated manage referral codes" on public.referral_codes;
create policy "authenticated manage referral codes"
on public.referral_codes for all to authenticated
using (true) with check (true);

revoke all on public.referral_codes from anon;
grant select, insert, update, delete on public.referral_codes to authenticated;

-- Public order creation
-- Delivery: Dhaka division = ৳70; all other divisions = ৳130.
-- Referral discounts are controlled from referral_codes.

create or replace function public.create_public_order(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  new_order public.orders;
  item jsonb;
  product_row public.products;
  qty integer;
  calculated_subtotal numeric := 0;
  fixed_shipping numeric;
  item_total numeric;
  order_id uuid;
  ref public.referral_codes;
  calculated_discount numeric := 0;
  normalized_division text;
  normalized_referral text;
begin
  if coalesce(trim(payload->>'customer_name'),'') = ''
     or coalesce(trim(payload->>'email'),'') = ''
     or coalesce(trim(payload->>'phone'),'') = ''
     or coalesce(trim(payload->>'division'),'') = ''
     or coalesce(trim(payload->>'district'),'') = ''
     or coalesce(trim(payload->>'upazila'),'') = ''
     or coalesce(trim(payload->>'address'),'') = ''
  then
    raise exception 'Please complete all required fields.';
  end if;

  if trim(payload->>'phone') !~ '^01[3-9][0-9]{8}$' then
    raise exception 'Please enter a valid 11-digit Bangladesh mobile number (01XXXXXXXXX).';
  end if;

  if jsonb_typeof(payload->'items') <> 'array'
     or jsonb_array_length(payload->'items') < 1
  then
    raise exception 'Your order is empty.';
  end if;

  normalized_division := lower(trim(payload->>'division'));
  normalized_referral := upper(trim(coalesce(payload->>'referral_code','')));

  fixed_shipping := case
    when normalized_division in ('dhaka','ঢাকা') then 70
    else 130
  end;

  insert into public.orders (
    customer_name, email, phone, division, district, upazila, address,
    referral_code, referral_discount, payment_method, shipping_charge, status
  )
  values (
    trim(payload->>'customer_name'),
    lower(trim(payload->>'email')),
    trim(payload->>'phone'),
    trim(payload->>'division'),
    trim(payload->>'district'),
    trim(payload->>'upazila'),
    trim(payload->>'address'),
    nullif(normalized_referral,''),
    0,
    'Cash on Delivery',
    fixed_shipping,
    'New'
  )
  returning * into new_order;

  order_id := new_order.id;

  for item in select * from jsonb_array_elements(payload->'items') loop
    select * into product_row
    from public.products
    where id = nullif(item->>'product_id','')::uuid
      and published = true;

    if not found then
      raise exception 'One of the selected products is no longer available.';
    end if;

    qty := greatest(1, coalesce((item->>'quantity')::integer, 1));
    item_total := product_row.price * qty;
    calculated_subtotal := calculated_subtotal + item_total;

    insert into public.order_items (
      order_id, product_id, product_name, image_url,
      quantity, unit_price, line_total
    )
    values (
      order_id, product_row.id, product_row.name, product_row.image_url,
      qty, product_row.price, item_total
    );
  end loop;

  if normalized_referral <> '' then
    select * into ref
    from public.referral_codes
    where upper(code) = normalized_referral
      and active = true
    limit 1;

    if not found then
      raise exception 'Invalid or inactive referral code.';
    end if;

    if ref.starts_at is not null and now() < ref.starts_at then
      raise exception 'This referral code is not active yet.';
    end if;

    if ref.expires_at is not null and now() > ref.expires_at then
      raise exception 'This referral code has expired.';
    end if;

    if ref.usage_limit is not null and ref.used_count >= ref.usage_limit then
      raise exception 'This referral code has reached its usage limit.';
    end if;

    if calculated_subtotal < ref.min_order_amount then
      raise exception 'Minimum order amount for this referral code is ৳% ', ref.min_order_amount;
    end if;

    calculated_discount := case
      when ref.benefit_type = 'percentage'
        then round(calculated_subtotal * ref.benefit_value / 100, 2)
      else ref.benefit_value
    end;

    if ref.max_discount_amount is not null then
      calculated_discount := least(calculated_discount, ref.max_discount_amount);
    end if;

    calculated_discount := greatest(0, least(calculated_discount, calculated_subtotal));

    update public.referral_codes
    set used_count = used_count + 1,
        updated_at = now()
    where id = ref.id;
  end if;

  update public.orders
  set subtotal = calculated_subtotal,
      referral_discount = calculated_discount,
      total = greatest(0, calculated_subtotal + fixed_shipping - calculated_discount),
      updated_at = now()
  where id = order_id
  returning * into new_order;

  return jsonb_build_object(
    'id', new_order.id,
    'order_number', new_order.order_number,
    'public_tracking_id', new_order.public_tracking_id,
    'subtotal', new_order.subtotal,
    'shipping_charge', new_order.shipping_charge,
    'referral_discount', new_order.referral_discount,
    'total', new_order.total,
    'status', new_order.status
  );
end;
$$;

revoke all on function public.create_public_order(jsonb) from public;
grant execute on function public.create_public_order(jsonb) to anon, authenticated;


-- Public customer order tracking
-- Customers must use the random public_tracking_id. The sequential internal
-- order number is deliberately not accepted by this public function.
drop function if exists public.track_public_order(text);

create or replace function public.track_public_order(p_tracking_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  o public.orders;
  items jsonb := '[]'::jsonb;
begin
  select * into o
  from public.orders
  where upper(trim(public_tracking_id)) = upper(trim(p_tracking_id))
  limit 1;

  if not found then
    raise exception 'Order not found. Please check your private Tracking ID.';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'name', oi.product_name,
    'quantity', oi.quantity,
    'price', oi.unit_price
  ) order by oi.id), '[]'::jsonb)
  into items
  from public.order_items oi
  where oi.order_id = o.id;

  return jsonb_build_object(
    'trackingId', o.public_tracking_id,
    'orderNumber', o.order_number,
    'status', o.status,
    'createdAt', o.created_at,
    'updatedAt', o.updated_at,
    'tracking', jsonb_build_object(
      'number', coalesce(o.tracking_number, ''),
      'courier', coalesce(o.tracking_provider, ''),
      'url', coalesce(o.tracking_url, '')
    ),
    'items', items
  );
end;
$$;

revoke all on function public.track_public_order(text) from public;
grant execute on function public.track_public_order(text) to anon, authenticated;

-- Refresh PostgREST schema cache so the public tracking RPC is immediately visible.
notify pgrst, 'reload schema';
