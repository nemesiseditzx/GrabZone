module.exports = async function handler(req,res){
  if(req.method!=='POST') return res.status(405).json({error:'Method not allowed'});
  const key=process.env.RESEND_API_KEY;
  const from=process.env.ORDER_EMAIL_FROM;
  if(!key||!from) return res.status(503).json({error:'Email service is not configured.'});
  try{
    const body=req.body||{};
    const order=body.order||{};
    const orderNumber=body.orderNumber||'';
    const type=body.type||'order_created';
    const customerEmail=String(order.email||'').trim();
    if(!customerEmail||!orderNumber) return res.status(400).json({error:'Missing order email or order number.'});
    const items=Array.isArray(order.items)?order.items:[];
    const currency='৳';
    const money=n=>currency+Number(n||0).toLocaleString('en-BD');
    const rows=items.map(i=>`<tr><td style="padding:10px 0;border-bottom:1px solid #eee">${escapeHtml(i.product_name||'Product')}</td><td style="padding:10px 0;border-bottom:1px solid #eee;text-align:center">${Number(i.quantity||1)}</td><td style="padding:10px 0;border-bottom:1px solid #eee;text-align:right">${money(Number(i.unit_price||0)*Number(i.quantity||1))}</td></tr>`).join('');
    const status=order.status||'New';
    const subject=type==='status_updated'?`GrabZone order ${orderNumber} — ${status}`:`GrabZone order received — ${orderNumber}`;
    const title=type==='status_updated'?`Your order status: ${status}`:'Your order has been received';
    const intro=type==='status_updated'
      ? statusMessage(status)
      : 'Thank you for shopping with GrabZone. Your order has been received successfully. Our team will call you to verify the details before processing it.';
    const html=`<!doctype html><html><body style="margin:0;background:#f5f7f6;font-family:Arial,sans-serif;color:#111"><div style="max-width:650px;margin:30px auto;background:#fff;border:1px solid #e4e8e6;border-radius:18px;padding:28px"><div style="font-weight:900;letter-spacing:.08em;font-size:18px">GRABZONE</div><h1 style="font-size:28px;margin:24px 0 8px">${escapeHtml(title)}</h1><p style="color:#626a67;line-height:1.6">${escapeHtml(intro)}</p><div style="background:#effaf5;border-radius:14px;padding:16px;margin:20px 0"><div style="font-size:11px;color:#6d7471;letter-spacing:.12em;font-weight:800">ORDER NUMBER</div><div style="font-size:30px;font-weight:900;color:#079b6c;margin-top:4px">${escapeHtml(orderNumber)}</div></div><table style="width:100%;border-collapse:collapse"><thead><tr><th style="text-align:left;padding:10px 0">Product</th><th style="text-align:center;padding:10px 0">Qty</th><th style="text-align:right;padding:10px 0">Amount</th></tr></thead><tbody>${rows}</tbody></table><div style="margin-top:18px;border-top:1px solid #eee;padding-top:12px"><div style="display:flex;justify-content:space-between;padding:5px 0"><span>Subtotal</span><b>${money(order.subtotal)}</b></div><div style="display:flex;justify-content:space-between;padding:5px 0"><span>Shipping</span><b>${money(order.shipping_charge)}</b></div><div style="display:flex;justify-content:space-between;padding:10px 0;font-size:18px"><span>Total</span><b>${money(order.total)}</b></div></div><div style="margin-top:20px;background:#f7f8f7;border-radius:12px;padding:14px;font-size:13px;line-height:1.6"><b>Payment:</b> Cash on Delivery<br><b>Delivery:</b> ${escapeHtml(order.address||'')}<br>${escapeHtml(order.district||'')}, ${escapeHtml(order.division||'')}</div><p style="margin-top:24px;color:#777;font-size:12px">This email was sent automatically by GrabZone. If you need help, please contact our team.</p></div></body></html>`;
    const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{'Authorization':`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({from,to:[customerEmail],subject,html})});
    const data=await response.json().catch(()=>({}));
    if(!response.ok) return res.status(response.status).json({error:data?.message||'Email provider rejected the request.'});
    return res.status(200).json({ok:true,id:data?.id||null});
  }catch(e){console.error(e);return res.status(500).json({error:e.message||'Email send failed.'})}
}
function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function statusMessage(s){
  return ({
    Contacting:'Our team is contacting you to verify your order details.',
    Confirmed:'Your order has been confirmed by the GrabZone team.',
    Processing:'Your order is now being prepared for delivery.',
    Shipped:'Your order has been shipped and is on the way.',
    Delivered:'Your order has been marked as delivered. Thank you for shopping with GrabZone!',
    Cancelled:'Your order has been cancelled. Please contact GrabZone if you need assistance.'
  })[s]||'Your GrabZone order status has been updated.'
}