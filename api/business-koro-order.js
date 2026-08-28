const BASE_URL='https://api.businesskoro.com/api/v1/storefront';

function normalize(value){
  return String(value||'').toLowerCase().normalize('NFKC')
    .replace(/[\u200B-\u200D\uFEFF]/g,'')
    .replace(/[^a-z0-9\u0980-\u09ff]+/g,' ')
    .trim().replace(/\s+/g,' ');
}
async function readJson(response){
  const text=await response.text();
  try{return text?JSON.parse(text):{}}
  catch{return {raw:text}}
}
async function requireAdmin(req){
  const auth=String(req.headers.authorization||'');
  if(!auth.startsWith('Bearer '))throw Object.assign(new Error('Admin authentication required.'),{status:401});
  const url=process.env.SUPABASE_URL;
  const key=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key)throw new Error('Supabase server credentials are not configured.');
  const response=await fetch(url+'/auth/v1/user',{
    headers:{apikey:key,Authorization:auth}
  });
  if(!response.ok)throw Object.assign(new Error('Admin authentication failed.'),{status:401});
  return response.json();
}

async function supabaseRequest(path,options={}){
  const url=process.env.SUPABASE_URL;
  const key=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key)throw new Error('Supabase server credentials are not configured.');
  return fetch(url+'/rest/v1/'+path,{
    ...options,
    headers:{
      apikey:key,Authorization:'Bearer '+key,
      'Content-Type':'application/json',
      Prefer:'return=representation',
      ...(options.headers||{})
    }
  });
}
async function loadOrder(orderId){
  const orderRes=await supabaseRequest('orders?id=eq.'+encodeURIComponent(orderId)+'&select=*');
  const orders=await readJson(orderRes);
  if(!orderRes.ok||!Array.isArray(orders)||!orders[0])throw new Error('Order not found.');
  const order=orders[0];
  const itemRes=await supabaseRequest('order_items?order_id=eq.'+encodeURIComponent(orderId)+'&select=*');
  const items=await readJson(itemRes);
  if(!itemRes.ok||!Array.isArray(items))throw new Error('Order items could not be loaded.');

  const productIds=[...new Set(items.map(x=>x.product_id).filter(Boolean))];
  const productMap=new Map();
  for(const id of productIds){
    const pRes=await supabaseRequest('products?id=eq.'+encodeURIComponent(id)+'&select=id,name,business_koro_product_id');
    const ps=await readJson(pRes);
    if(pRes.ok&&Array.isArray(ps)&&ps[0])productMap.set(id,ps[0]);
  }
  return {
    order,
    items:items.map(x=>({
      ...x,
      business_koro_product_id:productMap.get(x.product_id)?.business_koro_product_id||null
    }))
  };
}
async function getBusinessProducts(apiKey){
  const response=await fetch(BASE_URL+'/products',{
    method:'GET',headers:{'x-api-key':apiKey,Accept:'application/json'}
  });
  const data=await readJson(response);
  if(!response.ok)throw new Error(data?.message||data?.error||'Could not load Business Koro products.');
  return Array.isArray(data?.data)?data.data:[];
}
function resolveProductId(item,products){
  if(item?.business_koro_product_id)return item.business_koro_product_id;
  if(item?.productId)return item.productId;
  const wanted=normalize(item?.productName);
  const exact=products.filter(p=>normalize(p?.name)===wanted);
  if(exact.length===1)return exact[0].id;
  if(exact.length>1)throw new Error('Multiple Business Koro products match "'+item.productName+'".');
  return null;
}
async function sendOne(apiKey,orderNumber,customer,item,productId){
  const body={
    productId,
    customerName:customer.name,
    customerPhone:customer.phone,
    customerAddress:customer.address,
    customerDivision:customer.division,
    customerDistrict:customer.district,
    customerArea:customer.area||'',
    sellingPrice:Number(item.sellingPrice),
    deliveryChargePaidByCustomer:true,
    customerNote:[orderNumber,customer.note].filter(Boolean).join(' — ')
  };
  const response=await fetch(BASE_URL+'/orders',{
    method:'POST',
    headers:{'x-api-key':apiKey,'Content-Type':'application/json',Accept:'application/json'},
    body:JSON.stringify(body)
  });
  const data=await readJson(response);
  if(!response.ok)throw new Error(data?.message||data?.error||('Business Koro rejected product "'+item.productName+'".'));
  return data;
}
async function markSent(orderId,supplierIds){
  const ids=supplierIds.filter(Boolean);
  try{
    await supabaseRequest('orders?id=eq.'+encodeURIComponent(orderId),{
      method:'PATCH',
      body:JSON.stringify({
        business_koro_sent_at:new Date().toISOString(),
        business_koro_order_ids:ids,
        admin_note:'Business Koro submitted: '+(ids.join(', ')||'submitted')
      })
    });
  }catch(error){
    console.error('Could not save Business Koro submission metadata:',error);
    try{
      await supabaseRequest('orders?id=eq.'+encodeURIComponent(orderId),{
        method:'PATCH',
        body:JSON.stringify({admin_note:'Business Koro submitted: '+(ids.join(', ')||'submitted')})
      });
    }catch{}
  }
}
module.exports=async function handler(req,res){
  if(req.method!=='POST')return res.status(405).json({error:'Method not allowed.'});
  const apiKey=process.env.BUSINESS_KORO_API_KEY;
  if(!apiKey)return res.status(503).json({error:'Business Koro integration is not configured yet. Add BUSINESS_KORO_API_KEY in Vercel.'});

  try{
    await requireAdmin(req);
    const body=req.body||{};
    let order=body.orderId?null:null;
    let items=Array.isArray(body.items)?body.items.filter(Boolean):[];
    let customer=body.customer||{};
    let orderNumber=body.orderNumber||null;

    if(body.orderId){
      const loaded=await loadOrder(body.orderId);
      order=loaded.order;items=loaded.items.map(x=>({
        productId:x.business_koro_product_id||null,
        business_koro_product_id:x.business_koro_product_id||null,
        productName:x.product_name,
        quantity:Number(x.quantity||1),
        sellingPrice:Number(x.unit_price||0)
      }));
      customer={
        name:order.customer_name,phone:order.phone,address:order.address,
        division:order.division,district:order.district,area:order.upazila||'',
        note:[order.referral_code?('Referral: '+order.referral_code):'',order.admin_note||''].filter(Boolean).join(' — ')
      };
      orderNumber=order.order_number;
    }

    if(!orderNumber)return res.status(400).json({error:'Order number is required.'});
    if(!items.length)return res.status(400).json({error:'No products were provided.'});
    if(!customer.name||!customer.phone||!customer.address||!customer.division||!customer.district){
      return res.status(400).json({error:'Customer delivery information is incomplete.'});
    }

    if(body.orderId&&order?.business_koro_sent_at&&!body.force){
      return res.status(409).json({error:'This order has already been sent to Business Koro. Send again only if you intentionally want a duplicate.'});
    }

    const products=await getBusinessProducts(apiKey);
    const results=[];
    for(const item of items){
      const quantity=Math.max(1,Number(item.quantity||1));
      const productId=resolveProductId(item,products);
      if(!productId){
        throw new Error('Business Koro product not found for "'+item.productName+'". Make the GrabZone product name match Business Koro, or save its Business Koro product ID.');
      }
      for(let unit=0;unit<quantity;unit++){
        const result=await sendOne(apiKey,orderNumber,customer,item,productId);
        results.push({
          productId,productName:item.productName,unit:unit+1,
          supplierOrderId:result?.id||result?.orderId||result?.order_id||null
        });
      }
    }
    if(body.orderId)await markSent(body.orderId,results.map(x=>x.supplierOrderId));
    return res.status(200).json({
      success:true,orderNumber,submitted:results.length,
      orders:results
    });
  }catch(error){
    console.error('Business Koro order error:',error);
    return res.status(error?.status||502).json({error:error?.message||'Business Koro submission failed.'});
  }
};