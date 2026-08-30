module.exports = async function handler(req,res){
  if(req.method!=='POST') return res.status(405).json({error:'Method not allowed'});
  const supabaseUrl=process.env.SUPABASE_URL;
  const supabaseSecret=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
  const missing=[]; if(!process.env.GOOGLE_CLIENT_ID) missing.push('GOOGLE_CLIENT_ID'); if(!process.env.GOOGLE_CLIENT_SECRET) missing.push('GOOGLE_CLIENT_SECRET'); if(!process.env.GOOGLE_REFRESH_TOKEN) missing.push('GOOGLE_REFRESH_TOKEN'); if(!process.env.GMAIL_FROM_EMAIL) missing.push('GMAIL_FROM_EMAIL'); if(!supabaseUrl) missing.push('SUPABASE_URL'); if(!supabaseSecret) missing.push('SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY'); if(missing.length) return res.status(503).json({error:'Gmail email service is not configured.',missing});
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
    if(!itemResponse.ok) return res.status(502).json({error:'Could not load order items.'});
    const customerEmail=String(order.email||'').trim();
    if(!customerEmail) return res.status(400).json({error:'Order has no customer email.'});
    const currency='৳';
    const money=n=>currency+Number(n||0).toLocaleString('en-BD');
    const rows=(Array.isArray(items)?items:[]).map(i=>'<tr><td style="padding:10px 0;border-bottom:1px solid #eee">'+escapeHtml(i.product_name||'Product')+'</td><td style="padding:10px 0;border-bottom:1px solid #eee;text-align:center">'+Number(i.quantity||1)+'</td><td style="padding:10px 0;border-bottom:1px solid #eee;text-align:right">'+money(Number(i.line_total||Number(i.unit_price||0)*Number(i.quantity||1)))+'</td></tr>').join('');
    const status=order.status||'New';
    const subject=type==='status_updated'?'GrabZone order '+order.order_number+' — '+status:'GrabZone order received — '+order.order_number;
    const title=type==='status_updated'?'Your order status: '+status:'Your order has been received';
    const intro=type==='status_updated'?statusMessage(status):'Thank you for shopping with GrabZone. Your order has been received successfully. Our team will call you to verify the details before processing it.';
    const html='<!doctype html><html><body style="margin:0;background:#f5f7f6;font-family:Arial,sans-serif;color:#111"><div style="max-width:650px;margin:30px auto;background:#fff;border:1px solid #e4e8e6;border-radius:18px;padding:28px"><div style="font-weight:900;letter-spacing:.08em;font-size:18px">GRABZONE</div><h1 style="font-size:28px;margin:24px 0 8px">'+escapeHtml(title)+'</h1><p style="color:#626a67;line-height:1.6">'+escapeHtml(intro)+'</p><div style="background:#effaf5;border-radius:14px;padding:16px;margin:20px 0"><div style="font-size:11px;color:#6d7471;letter-spacing:.12em;font-weight:800">ORDER NUMBER</div><div style="font-size:24px;font-weight:900;color:#079b6c;margin-top:4px">'+escapeHtml(order.order_number)+'</div><div style="font-size:11px;color:#6d7471;letter-spacing:.12em;font-weight:800;margin-top:14px">PRIVATE TRACKING ID</div><div style="font-size:20px;font-weight:900;color:#111;margin-top:4px">'+escapeHtml(order.public_tracking_id||'')+'</div><div style="font-size:12px;color:#626a67;margin-top:8px">Use this Private Tracking ID on the GrabZone Track Your Order page.</div></div><table style="width:100%;border-collapse:collapse"><thead><tr><th style="text-align:left;padding:10px 0">Product</th><th style="text-align:center;padding:10px 0">Qty</th><th style="text-align:right;padding:10px 0">Amount</th></tr></thead><tbody>'+rows+'</tbody></table><div style="margin-top:18px;border-top:1px solid #eee;padding-top:12px"><div style="display:flex;justify-content:space-between;padding:5px 0"><span>Subtotal</span><b>'+money(order.subtotal)+'</b></div><div style="display:flex;justify-content:space-between;padding:5px 0"><span>Shipping</span><b>'+money(order.shipping_charge)+'</b></div><div style="display:flex;justify-content:space-between;padding:10px 0;font-size:18px"><span>Total</span><b>'+money(order.total)+'</b></div></div><div style="margin-top:20px;background:#f7f8f7;border-radius:12px;padding:14px;font-size:13px;line-height:1.6"><b>Payment:</b> Cash on Delivery<br><b>Delivery:</b> '+escapeHtml(order.address||'')+'<br>'+escapeHtml(order.upazila||'')+', '+escapeHtml(order.district||'')+', '+escapeHtml(order.division||'')+'</div><p style="margin-top:24px;color:#777;font-size:12px">This email was sent automatically by GrabZone. If you need help, please contact our team.</p></div></body></html>';
    const accessToken=await getGmailAccessToken();
    const raw=buildRawEmail(process.env.GMAIL_FROM_EMAIL||'grabzonesupport@gmail.com',customerEmail,subject,html);
    const response=await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send',{
      method:'POST',
      headers:{'Authorization':'Bearer '+accessToken,'Content-Type':'application/json'},
      body:JSON.stringify({raw})
    });
    const data=await response.json().catch(()=>({}));
    if(!response.ok) return res.status(response.status).json({error:data?.error?.message||data?.message||'Gmail rejected the request.'});
    return res.status(200).json({ok:true,id:data?.id||null});
  }catch(e){console.error(e);return res.status(500).json({error:e.message||'Email send failed.'})}
};
function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function statusMessage(s){return ({Contacting:'Our team is contacting you to verify your order details.',Confirmed:'Your order has been confirmed by the GrabZone team.',Processing:'Your order is now being prepared for delivery.',Shipped:'Your order has been shipped and is on the way.',Delivered:'Your order has been marked as delivered. Thank you for shopping with GrabZone!',Cancelled:'Your order has been cancelled. Please contact GrabZone if you need assistance.'})[s]||'Your GrabZone order status has been updated.'}

async function getGmailAccessToken(){
  const body=new URLSearchParams({
    client_id:process.env.GOOGLE_CLIENT_ID,
    client_secret:process.env.GOOGLE_CLIENT_SECRET,
    refresh_token:process.env.GOOGLE_REFRESH_TOKEN,
    grant_type:'refresh_token'
  });
  const r=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body});
  const data=await r.json().catch(()=>({}));
  if(!r.ok||!data.access_token) throw new Error(data.error_description||data.error||'Could not authenticate with Google Gmail.');
  return data.access_token;
}

function encodeMimeHeader(value){
  return /[^\\x00-\\x7F]/.test(String(value||'')) ? '=?UTF-8?B?'+Buffer.from(String(value),'utf8').toString('base64')+'?=' : String(value||'');
}
function buildRawEmail(from,to,subject,html){
  const message=[
    'From: GrabZone <'+from+'>',
    'To: '+to,
    'Subject: '+encodeMimeHeader(subject),
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8',
    '',html
  ].join('\r\n');
  return Buffer.from(message,'utf8').toString('base64url');
}
