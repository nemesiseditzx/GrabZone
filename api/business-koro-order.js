const BASE_URL='https://api.businesskoro.com/api/v1/storefront';

function normalize(value){
  return String(value||'')
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[\u200B-\u200D\uFEFF]/g,'')
    .replace(/[^a-z0-9\u0980-\u09ff]+/g,' ')
    .trim()
    .replace(/\s+/g,' ');
}

async function readJson(response){
  const text=await response.text();
  try{return text?JSON.parse(text):{}}
  catch{return {raw:text}}
}

async function getBusinessProducts(apiKey){
  const response=await fetch(BASE_URL+'/products',{
    method:'GET',
    headers:{'x-api-key':apiKey,Accept:'application/json'}
  });
  const data=await readJson(response);
  if(!response.ok) throw new Error(data?.message||data?.error||'Could not load Business Koro products.');
  return Array.isArray(data?.data)?data.data:[];
}

function resolveProductId(item,products){
  if(item?.productId)return item.productId;
  const wanted=normalize(item?.productName);
  if(!wanted)return null;
  const exact=products.filter(p=>normalize(p?.name)===wanted);
  if(exact.length===1)return exact[0].id;
  if(exact.length>1)throw new Error('Multiple Business Koro products match "'+item.productName+'". Add the correct product ID before selling it.');
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
    headers:{
      'x-api-key':apiKey,
      'Content-Type':'application/json',
      Accept:'application/json'
    },
    body:JSON.stringify(body)
  });
  const data=await readJson(response);
  if(!response.ok) throw new Error(data?.message||data?.error||('Business Koro rejected product "'+item.productName+'".'));
  return data;
}

async function markOrder(orderId, supplierIds){
  const url=process.env.SUPABASE_URL;
  const key=process.env.SUPABASE_SECRET_KEY;
  if(!url||!key||!orderId)return;

  const note='Business Koro submitted: '+supplierIds.filter(Boolean).join(', ');
  try{
    await fetch(url+'/rest/v1/orders?id=eq.'+encodeURIComponent(orderId),{
      method:'PATCH',
      headers:{
        apikey:key,
        'Content-Type':'application/json',
        Prefer:'return=minimal'
      },
      body:JSON.stringify({admin_note:note,updated_at:new Date().toISOString()})
    });
  }catch(error){
    console.error('Could not save Business Koro supplier IDs:',error);
  }
}

module.exports=async function handler(req,res){
  if(req.method!=='POST')return res.status(405).json({error:'Method not allowed.'});

  const apiKey=process.env.BUSINESS_KORO_API_KEY;
  if(!apiKey)return res.status(503).json({error:'Business Koro integration is not configured yet. Add BUSINESS_KORO_API_KEY in Vercel.'});

  try{
    const body=req.body||{};
    const items=Array.isArray(body.items)?body.items.filter(Boolean):[];
    if(!items.length)return res.status(400).json({error:'No products were provided.'});

    const customer=body.customer||{};
    if(!customer.name||!customer.phone||!customer.address||!customer.division||!customer.district){
      return res.status(400).json({error:'Customer delivery information is incomplete.'});
    }

    const products=await getBusinessProducts(apiKey);
    const results=[];

    for(const item of items){
      const quantity=Math.max(1,Number(item.quantity||1));
      const productId=resolveProductId(item,products);
      if(!productId){
        throw new Error('Business Koro product not found for "'+item.productName+'". The website product name must exactly match Business Koro, or the item must provide its Business Koro product ID.');
      }

      // Business Koro's documented order endpoint accepts one product per request.
      // For quantity > 1, submit one supplier order per unit so we never invent an
      // undocumented quantity field.
      for(let unit=0;unit<quantity;unit++){
        const result=await sendOne(apiKey,body.orderNumber,customer,item,productId);
        results.push({
          productId,
          productName:item.productName,
          unit:unit+1,
          supplierOrderId:result?.id||result?.orderId||result?.order_id||null,
          response:result
        });
      }
    }

    await markOrder(body.orderId,results.map(x=>x.supplierOrderId));

    return res.status(200).json({
      success:true,
      orderNumber:body.orderNumber||null,
      submitted:results.length,
      orders:results.map(x=>({
        productId:x.productId,
        productName:x.productName,
        unit:x.unit,
        supplierOrderId:x.supplierOrderId
      }))
    });
  }catch(error){
    console.error('Business Koro order error:',error);
    return res.status(502).json({error:error?.message||'Business Koro submission failed.'});
  }
};