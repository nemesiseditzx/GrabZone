-- GRABZONE BUSINESS KORO + REFERRAL + DELIVERY MIGRATION
-- Run this once in Supabase Dashboard -> SQL Editor.

alter table public.products
  add column if not exists business_koro_product_id text;

alter table public.orders
  add column if not exists discount_amount numeric not null default 0,
  add column if not exists referral_admin_name text,
  add column if not exists business_koro_sent_at timestamptz,
  add column if not exists business_koro_order_ids text[];

create table if not exists public.referral_codes (
  id uuid primary key default gen_random_uuid(),
  admin_name text not null,
  admin_phone text,
  admin_email text,
  code text not null unique,
  benefit_type text not null default 'fixed',
  benefit_value numeric not null default 0,
  min_order_amount numeric not null default 0,
  max_discount_amount numeric,
  usage_limit integer,
  used_count integer not null default 0,
  starts_at timestamptz,
  expires_at timestamptz,
  active boolean not null default true,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint referral_benefit_type_check check (benefit_type in ('fixed','percentage')),
  constraint referral_value_check check (benefit_value >= 0),
  constraint referral_min_order_check check (min_order_amount >= 0),
  constraint referral_max_discount_check check (max_discount_amount is null or max_discount_amount >= 0),
  constraint referral_usage_check check (usage_limit is null or usage_limit >= 0)
);

create unique index if not exists referral_codes_upper_code_idx
  on public.referral_codes (upper(code));

alter table public.referral_codes enable row level security;
drop policy if exists "authenticated manage referral codes" on public.referral_codes;
create policy "authenticated manage referral codes"
  on public.referral_codes for all to authenticated
  using(true) with check(true);

create or replace function public.validate_referral_code(p_code text, p_subtotal numeric)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare r public.referral_codes;
       discount numeric := 0;
       base numeric := greatest(0,coalesce(p_subtotal,0));
begin
  if nullif(trim(p_code),'') is null then
    return jsonb_build_object('valid',false,'discount',0,'message','');
  end if;

  select * into r
  from public.referral_codes
  where upper(code)=upper(trim(p_code))
    and active=true
    and (starts_at is null or starts_at <= now())
    and (expires_at is null or expires_at >= now())
  limit 1;

  if not found then
    return jsonb_build_object('valid',false,'discount',0,'message','Invalid or inactive referral code.');
  end if;

  if r.usage_limit is not null and r.used_count >= r.usage_limit then
    return jsonb_build_object('valid',false,'discount',0,'message','This referral code has reached its usage limit.');
  end if;

  if base < r.min_order_amount then
    return jsonb_build_object(
      'valid',false,'discount',0,
      'message','Minimum order amount for this code is ৳'||to_char(r.min_order_amount,'FM999999990.00')
    );
  end if;

  if r.benefit_type='percentage' then
    discount := round(base*r.benefit_value/100,2);
  else
    discount := r.benefit_value;
  end if;

  if r.max_discount_amount is not null then
    discount := least(discount,r.max_discount_amount);
  end if;

  discount := greatest(0,least(discount,base));

  return jsonb_build_object(
    'valid',true,
    'discount',discount,
    'code',upper(r.code),
    'label',case
      when r.benefit_type='percentage' then r.benefit_value||'% off'
      else '৳'||r.benefit_value||' off'
    end
  );
end;
$$;

revoke all on function public.validate_referral_code(text,numeric) from public;
grant execute on function public.validate_referral_code(text,numeric) to anon,authenticated;

drop function if exists public.create_public_order(jsonb);

create or replace function public.create_public_order(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  new_order public.orders;
  item jsonb;
  product_row public.products;
  referral public.referral_codes;
  qty integer;
  calculated_subtotal numeric := 0;
  fixed_shipping numeric := case
    when lower(trim(coalesce(payload->>'district','')))='dhaka' then 70
    else 130
  end;
  discount numeric := 0;
  item_total numeric;
  order_id uuid;
  referral_code_value text := nullif(upper(trim(payload->>'referral_code')),'');
begin
  if coalesce(trim(payload->>'customer_name'),'')=''
     or coalesce(trim(payload->>'email'),'')=''
     or coalesce(trim(payload->>'phone'),'')=''
     or coalesce(trim(payload->>'division'),'')=''
     or coalesce(trim(payload->>'district'),'')=''
     or coalesce(trim(payload->>'upazila'),'')=''
     or coalesce(trim(payload->>'address'),'')=''
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

  insert into public.orders(
    customer_name,email,phone,division,district,upazila,address,
    referral_code,payment_method,shipping_charge,status,discount_amount
  )
  values(
    trim(payload->>'customer_name'),
    lower(trim(payload->>'email')),
    trim(payload->>'phone'),
    trim(payload->>'division'),
    trim(payload->>'district'),
    nullif(trim(payload->>'upazila'),''),
    trim(payload->>'address'),
    referral_code_value,
    'Cash on Delivery',
    fixed_shipping,
    'New',
    0
  )
  returning * into new_order;

  order_id := new_order.id;

  for item in select * from jsonb_array_elements(payload->'items') loop
    select * into product_row
    from public.products
    where id=nullif(item->>'product_id','')::uuid
      and published=true;

    if not found then
      raise exception 'One of the selected products is no longer available.';
    end if;

    qty := greatest(1,coalesce((item->>'quantity')::integer,1));
    item_total := product_row.price*qty;
    calculated_subtotal := calculated_subtotal+item_total;

    insert into public.order_items(
      order_id,product_id,product_name,image_url,quantity,unit_price,line_total
    )
    values(
      order_id,product_row.id,product_row.name,product_row.image_url,
      qty,product_row.price,item_total
    );
  end loop;

  if referral_code_value is not null then
    select * into referral
    from public.referral_codes
    where upper(code)=referral_code_value
      and active=true
      and (starts_at is null or starts_at <= now())
      and (expires_at is null or expires_at >= now())
    for update;

    if not found then
      raise exception 'Invalid or inactive referral code.';
    end if;

    if referral.usage_limit is not null and referral.used_count >= referral.usage_limit then
      raise exception 'This referral code has reached its usage limit.';
    end if;

    if calculated_subtotal < referral.min_order_amount then
      raise exception 'This referral code requires a higher order amount.';
    end if;

    if referral.benefit_type='percentage' then
      discount := round(calculated_subtotal*referral.benefit_value/100,2);
    else
      discount := referral.benefit_value;
    end if;

    if referral.max_discount_amount is not null then
      discount := least(discount,referral.max_discount_amount);
    end if;

    discount := greatest(0,least(discount,calculated_subtotal));

    update public.referral_codes
    set used_count=used_count+1,updated_at=now()
    where id=referral.id;
  end if;

  update public.orders
  set subtotal=calculated_subtotal,
      discount_amount=discount,
      referral_admin_name=case when referral.id is not null then referral.admin_name else null end,
      total=greatest(0,calculated_subtotal+fixed_shipping-discount),
      updated_at=now()
  where id=order_id
  returning * into new_order;

  return jsonb_build_object(
    'id',new_order.id,
    'order_number',new_order.order_number,
    'subtotal',new_order.subtotal,
    'shipping_charge',new_order.shipping_charge,
    'discount_amount',new_order.discount_amount,
    'total',new_order.total,
    'referral_code',new_order.referral_code,
    'status',new_order.status
  );
end;
$$;

revoke all on function public.create_public_order(jsonb) from public;
grant execute on function public.create_public_order(jsonb) to anon,authenticated;

grant select,insert,update,delete on public.referral_codes to authenticated;
