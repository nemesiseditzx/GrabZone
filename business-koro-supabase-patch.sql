-- GRABZONE Business Koro + delivery-rate patch
-- Run this once in Supabase Dashboard -> SQL Editor.

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
  fixed_shipping numeric := case
    when lower(trim(coalesce(payload->>'district',''))) in ('dhaka','ঢাকা') then 70
    else 130
  end;
  item_total numeric;
  order_id uuid;
begin
  if coalesce(trim(payload->>'customer_name'),'')=''
     or coalesce(trim(payload->>'email'),'')=''
     or coalesce(trim(payload->>'phone'),'')=''
     or coalesce(trim(payload->>'division'),'')=''
     or coalesce(trim(payload->>'district'),'')=''
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
    referral_code,payment_method,shipping_charge,status
  )
  values(
    trim(payload->>'customer_name'),
    lower(trim(payload->>'email')),
    trim(payload->>'phone'),
    trim(payload->>'division'),
    trim(payload->>'district'),
    nullif(trim(payload->>'upazila'),''),
    trim(payload->>'address'),
    nullif(trim(payload->>'referral_code'),''),
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

  update public.orders
  set subtotal=calculated_subtotal,
      total=calculated_subtotal+fixed_shipping,
      updated_at=now()
  where id=order_id
  returning * into new_order;

  return jsonb_build_object(
    'id',new_order.id,
    'order_number',new_order.order_number,
    'subtotal',new_order.subtotal,
    'shipping_charge',new_order.shipping_charge,
    'total',new_order.total,
    'status',new_order.status
  );
end;
$$;

revoke all on function public.create_public_order(jsonb) from public;
grant execute on function public.create_public_order(jsonb) to anon,authenticated;
