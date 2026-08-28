-- GRABZONE REFERRAL + LOCATION + DELIVERY SYSTEM
-- Run once in Supabase SQL Editor.

alter table public.orders
  add column if not exists referral_discount numeric not null default 0;

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
using(true) with check(true);

revoke all on public.referral_codes from anon;
grant select,insert,update,delete on public.referral_codes to authenticated;

create or replace function public.validate_referral_code(
  p_code text,
  p_subtotal numeric
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  r public.referral_codes;
  discount numeric := 0;
  now_ts timestamptz := now();
begin
  select * into r
  from public.referral_codes
  where upper(code)=upper(trim(p_code))
    and active=true
  limit 1;

  if not found then
    return jsonb_build_object('valid',false,'message','Invalid or inactive referral code.');
  end if;

  if r.starts_at is not null and now_ts < r.starts_at then
    return jsonb_build_object('valid',false,'message','This referral code is not active yet.');
  end if;

  if r.expires_at is not null and now_ts > r.expires_at then
    return jsonb_build_object('valid',false,'message','This referral code has expired.');
  end if;

  if r.usage_limit is not null and r.used_count >= r.usage_limit then
    return jsonb_build_object('valid',false,'message','This referral code has reached its usage limit.');
  end if;

  if coalesce(p_subtotal,0) < r.min_order_amount then
    return jsonb_build_object(
      'valid',false,
      'message','Minimum order amount for this code is ৳'||r.min_order_amount::text||'.'
    );
  end if;

  if r.benefit_type='percentage' then
    discount := round(coalesce(p_subtotal,0) * r.benefit_value / 100, 2);
  else
    discount := r.benefit_value;
  end if;

  if r.max_discount_amount is not null then
    discount := least(discount,r.max_discount_amount);
  end if;

  discount := greatest(0,least(discount,coalesce(p_subtotal,0)));

  return jsonb_build_object(
    'valid',true,
    'code',upper(r.code),
    'discount',discount,
    'label',
      case
        when r.benefit_type='percentage'
          then r.benefit_value::text||'% off'
        else
          then '৳'||r.benefit_value::text||' off'
      end,
    'admin_name',r.admin_name
  );
end;
$$;

revoke all on function public.validate_referral_code(text,numeric) from public;
grant execute on function public.validate_referral_code(text,numeric) to anon,authenticated;

-- Replace the public order function so the referral benefit is actually applied
-- and the delivery rule is:
-- Dhaka division + one of the configured Dhaka metro thanas = ৳70
-- everything else = ৳130.
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
  qty integer;
  calculated_subtotal numeric := 0;
  fixed_shipping numeric;
  item_total numeric;
  order_id uuid;
  ref public.referral_codes;
  calculated_discount numeric := 0;
  metro text[] := array[
    'Adabor','Dhaka Airport','Badda','Banani','Bangshal','Bhashantek',
    'Dhaka Cantonment','Dhaka Chackbazar','Dakshin Khan','Darus-Salam','Demra',
    'Dhanmondi','Gandaria','Gulshan','Hatirjheel','Hazaribagh','Jatrabari',
    'Kadamtoli','Kafrul','Kalabagan','Kamrangirchar','Khilkhet','Khilgaon',
    'Kotwali','Lalbagh','Mirpur Model','Mohammadpur','Motijheel','Mugda',
    'Dhaka New Market','Pallabi','Paltan Model','Ramna Model','Rampura',
    'Rupnagar','Sabujbag','Shah Ali','Shahbag','Shahjahanpur',
    'Sher-e-Bangla Nagar','Shyampur','Sutrapur','Tejgaon','Tejgaon Industrial',
    'Turag','Uttar Khan','Vatara','Uttara East','Uttara West','Wari'
  ];
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

  fixed_shipping := case
    when lower(trim(payload->>'division'))='dhaka'
      and trim(payload->>'upazila') = any(metro)
    then 70
    else 130
  end;

  insert into public.orders(
    customer_name,email,phone,division,district,upazila,address,
    referral_code,referral_discount,payment_method,shipping_charge,status
  )
  values(
    trim(payload->>'customer_name'),
    lower(trim(payload->>'email')),
    trim(payload->>'phone'),
    trim(payload->>'division'),
    trim(payload->>'district'),
    trim(payload->>'upazila'),
    trim(payload->>'address'),
    nullif(upper(trim(payload->>'referral_code')),''),
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

    qty := greatest(1,coalesce((item->>'quantity')::integer,1));
    item_total := product_row.price * qty;
    calculated_subtotal := calculated_subtotal + item_total;

    insert into public.order_items(
      order_id,product_id,product_name,image_url,quantity,unit_price,line_total
    )
    values(
      order_id,product_row.id,product_row.name,product_row.image_url,
      qty,product_row.price,item_total
    );
  end loop;

  if nullif(upper(trim(payload->>'referral_code')),'') is not null then
    select * into ref
    from public.referral_codes
    where upper(code)=upper(trim(payload->>'referral_code'))
      and active=true
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
      raise exception 'Minimum order amount for this referral code is ৳% ',ref.min_order_amount;
    end if;

    calculated_discount := case
      when ref.benefit_type='percentage'
        then round(calculated_subtotal*ref.benefit_value/100,2)
      else ref.benefit_value
    end;

    if ref.max_discount_amount is not null then
      calculated_discount := least(calculated_discount,ref.max_discount_amount);
    end if;

    calculated_discount := greatest(0,least(calculated_discount,calculated_subtotal));

    update public.referral_codes
    set used_count=used_count+1,updated_at=now()
    where id=ref.id;
  end if;

  update public.orders
  set subtotal=calculated_subtotal,
      referral_discount=calculated_discount,
      total=greatest(0,calculated_subtotal+fixed_shipping-calculated_discount),
      updated_at=now()
  where id=order_id
  returning * into new_order;

  return jsonb_build_object(
    'id',new_order.id,
    'order_number',new_order.order_number,
    'subtotal',new_order.subtotal,
    'shipping_charge',new_order.shipping_charge,
    'referral_discount',new_order.referral_discount,
    'total',new_order.total,
    'status',new_order.status
  );
end;
$$;

revoke all on function public.create_public_order(jsonb) from public;
grant execute on function public.create_public_order(jsonb) to anon,authenticated;
