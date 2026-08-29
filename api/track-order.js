const TRACK_MARKER='[[GRABZONE_TRACKING]]';
const STATUSES=['New','Contacting','Confirmed','Processing','Shipped','Delivered','Cancelled'];

function json(res){return res.json().catch(()=>({}));}
async function supabase(path,options={}){
  const url=process.env.SUPABASE_URL;
  const key=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key)throw new Error('Tracking service is not configured.');
  return fetch(url+'/rest/v1/'+path,{...options,headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json',...(options.headers||{})}});
}
function parseTracking(note){
  const text=String(note||'');
  const line=text.split(TRACK_MARKER)[1];
  if(!line)return {trackingNumber:'',courier:'',trackingUrl:''};
  try{return {...{trackingNumber:'',courier:'',trackingUrl:''},...JSON.parse(line.split('[[/GRABZONE_TRACKING]]')[0])};}
  catch{return {trackingNumber:'',courier:'',trackingUrl:''};}
}
module.exports=async function handler(req,res){
  if(req.method!=='GET')return res.status(405).json({error:'Method not allowed.'});
  const orderNumber=String(req.query?.orderId||req.query?.orderNumber||'').trim();
  if(!orderNumber)return res.status(400).json({error:'Order ID is required.'});
  try{
    const r=await supabase('orders?order_number=eq.'+encodeURIComponent(orderNumber)+'&select=order_number,status,created_at,updated_at,admin_note');
    const rows=await json(r);
    if(!r.ok||!Array.isArray(rows)||!rows[0])return res.status(404).json({error:'Order not found. Please check your Order ID.'});
    const o=rows[0], t=parseTracking(o.admin_note);
    const ir=await supabase('order_items?order_id=eq.'+encodeURIComponent(await getOrderId(orderNumber))+'&select=product_name,quantity,unit_price');
    const items=await json(ir);
    return res.status(200).json({
      success:true,
      order:{orderNumber:o.order_number,status:o.status,createdAt:o.created_at,updatedAt:o.updated_at,
        tracking:{number:t.trackingNumber,courier:t.courier,url:t.trackingUrl},
        items:Array.isArray(items)?items.map(x=>({name:x.product_name,quantity:Number(x.quantity||1),price:Number(x.unit_price||0)})):[]}
    });
  }catch(e){console.error(e);return res.status(500).json({error:e.message||'Could not load order.'});}
};
async function getOrderId(orderNumber){
  const r=await supabase('orders?order_number=eq.'+encodeURIComponent(orderNumber)+'&select=id');
  const rows=await json(r);
  if(!r.ok||!rows[0])throw new Error('Order not found.');
  return rows[0].id;
}
