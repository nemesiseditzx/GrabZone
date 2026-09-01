const crypto=require('crypto');
const {d1Query}=require('./d1-server');
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
  const raw=String(req.headers.cookie||'');
  const tokenPart=raw.split(';').map(x=>x.trim()).find(x=>x.startsWith('gz_admin_session='));
  const token=tokenPart?decodeURIComponent(tokenPart.slice('gz_admin_session='.length)):'';
  if(!token)throw Object.assign(new Error('Admin authentication required.'),{status:401});
  const tokenHash=crypto.createHash('sha256').update(token).digest('hex');
  const r=await d1Query(`SELECT u.id,u.email
    FROM admin_sessions s
    JOIN admin_users u ON u.id=s.admin_user_id
    WHERE s.token_hash=? AND s.expires_at>?
    LIMIT 1`,[tokenHash,new Date().toISOString()]);
  if(!r.results?.[0])throw Object.assign(new Error('Admin authentication failed.'),{status:401});
  return true;
}

async function loadOrder(orderId){
  const orderResult=await d1Query('SELECT * FROM orders WHERE id=? LIMIT 1',[orderId]);
  const order=orderResult.results?.[0];
  if(!order)throw new Error('Order not found.');
  const itemResult=await d1Query('SELECT * FROM order_items WHERE order_id=? ORDER BY id',[orderId]);
  const items=itemResult.results||[];
  const productIds=[...new Set(items.map(x=>x.product_id).filter(Boolean))];
  const productMap=new Map();
  for(const id of productIds){
    const p=(await d1Query('SELECT id,name,business_koro_product_id FROM products WHERE id=? LIMIT 1',[id])).results?.[0];
    if(p)productMap.set(id,p);
  }
  return {order,items:items.map(x=>({...x,business_koro_product_id:productMap.get(x.product_id)?.business_koro_product_id||null}))};
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
    const existing=(await d1Query('SELECT admin_note FROM orders WHERE id=? LIMIT 1',[orderId])).results?.[0];
    const previous=String(existing?.admin_note||'');
    const trackingMarker='[[GRABZONE_TRACKING]]';
    const trackingPart=previous.includes(trackingMarker)?' '+previous.slice(previous.indexOf(trackingMarker)):'';
    const baseNote=previous.includes(trackingMarker)?previous.slice(0,previous.indexOf(trackingMarker)).trim():previous;
    const note=[baseNote,'Business Koro submitted: '+(ids.join(', ')||'submitted')].filter(Boolean).join(' — ')+trackingPart;
    await d1Query('UPDATE orders SET business_koro_sent_at=?,business_koro_order_ids=?,admin_note=?,updated_at=? WHERE id=?',[new Date().toISOString(),JSON.stringify(ids),note,new Date().toISOString(),orderId]);
  }catch(error){console.error('Could not save Business Koro submission metadata:',error);}
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