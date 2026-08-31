const {d1Query}=require('./d1-server');

module.exports = async function handler(req,res){
  if(req.method!=='POST') return res.status(405).json({error:'Method not allowed'});
  const missing=[]; if(!process.env.GOOGLE_CLIENT_ID) missing.push('GOOGLE_CLIENT_ID'); if(!process.env.GOOGLE_CLIENT_SECRET) missing.push('GOOGLE_CLIENT_SECRET'); if(!process.env.GOOGLE_REFRESH_TOKEN) missing.push('GOOGLE_REFRESH_TOKEN'); if(!process.env.GMAIL_FROM_EMAIL) missing.push('GMAIL_FROM_EMAIL'); if(!process.env.CF_API_TOKEN&&!process.env.CLOUDFLARE_API_TOKEN) missing.push('CF_API_TOKEN'); if(missing.length) return res.status(503).json({error:'Gmail email service is not configured.',missing});
  try{
    const body=req.body||{};
    const orderNumber=String(body.orderNumber||'').trim();
    const type=body.type||'order_created';
    if(!orderNumber) return res.status(400).json({error:'Missing order number.'});
    const headers={'apikey':supabaseSecret,'Content-Type':'application/json'};
    if(process.env.SUPABASE_SERVICE_ROLE_KEY) headers.Authorization='Bearer '+process.env.SUPABASE_SERVICE_ROLE_KEY;
    const orderUrl=supabaseUrl+'/rest/v1/orders?order_number=eq.'+encodeURIComponent(orderNumber)+'&select=*';
    const orderResponse=await fetch(orderUrl,{headers});
    const orderRows=await orderResponse.json().catch(()=>[]);
    if(!orderResponse.ok||!Array.isArray(orderRows)||!orderRows[0]) return res.status(404).json({error:'Order not found.'});
    const order=orderRows[0];
    const itemResponse=await fetch(supabaseUrl+'/rest/v1/order_items?order_id=eq.'+encodeURIComponent(order.id)+'&select=*&order=id.asc',{headers});
    const items=await itemResponse.json().catch(()=>[]);
    if(!itemResponse.ok) return res.status(502).json({error:'Could not load order items.'});    const orderResult=await d1Query('SELECT * FROM orders WHERE order_number=? LIMIT 1',[orderNumber]);
    const order=orderResult.results?.[0];
    if(!order) return res.status(404).json({error:'Order not found.'});
    const itemResult=await d1Query('SELECT * FROM order_items WHERE order_id=? ORDER BY id',[order.id]);
    const items=itemResult.results||[];

