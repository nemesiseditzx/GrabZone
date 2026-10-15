/**
 * GrabZone transactional email.
 *
 * Two providers are already configured in this project:
 *   - Resend     (RESEND_API_KEY) — used by the checkout worker
 *   - Gmail API  (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REFRESH_TOKEN /
 *                 GMAIL_FROM_EMAIL) — already used by the vendor finalizer
 *
 * A vendor notification is sent through whichever one is available, in that
 * order, so a project with only one of them configured still works. No
 * credential is ever hardcoded: everything comes from env bindings.
 *
 * Every function returns a result object and never throws, so a mail problem can
 * never break an order.
 */
const esc=(v)=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const money=(v)=>"৳"+Number(v||0).toLocaleString("en-BD",{maximumFractionDigits:2});

/** "Color: Beige · Size: M · SKU: 28002" from variation_options (object or JSON) plus an optional SKU. */
export function variationText(item){
  let opts=item?.variation_options;
  if(typeof opts==="string"){try{opts=JSON.parse(opts)}catch{opts=null}}
  let out="";
  if(opts&&typeof opts==="object")out=Object.entries(opts).map(([k,v])=>`${k}: ${v}`).join(" · ");
  const sku=String(item?.variation_sku||item?.sku||"").trim();
  if(sku)out=out?`${out} · SKU: ${sku}`:`SKU: ${sku}`;
  return out;
}

/** Confirmation time in Bangladesh time; falls back to the raw value if Intl time zones are unavailable. */
export function formatDhakaTime(value){
  if(!value)return "";
  try{
    const d=new Date(value);
    if(Number.isNaN(d.getTime()))return String(value);
    return new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Dhaka",day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit",hour12:true}).format(d)+" (Bangladesh time)";
  }catch{return String(value)}
}

/** Human wording for the real order status; never claims more than the database says. */
export function statusLabel(status){
  const s=String(status||"").trim();
  const lower=s.toLowerCase();
  if(!s)return "New";
  if(lower==="new")return "New — placed, waiting for GrabZone confirmation";
  if(lower==="confirmed")return "Confirmed";
  if(lower==="contacting")return "Confirmed — we are contacting the customer";
  if(lower==="processing")return "Processing";
  if(lower==="shipped")return "Shipped";
  if(lower==="delivered")return "Delivered";
  if(lower==="cancelled"||lower==="canceled")return "Cancelled";
  return s;
}

/** The branded, mobile-friendly "new order" message for one vendor. */
export function buildVendorOrderEmail({vendorName,orderNumber,placedAt,orderStatus,items,subtotal,discount=0,shipping,total,panelUrl,customerName}){
  const rows=(items||[]).map(x=>{
    const name=esc(x.product_name||x.name||"Product");
    const variant=esc(variationText(x));
    return `<tr><td style="padding:12px 10px;border-bottom:1px solid #eee">`
      +`<div style="font-weight:bold;color:#111">${name}</div>`
      +(variant?`<div style="color:#666;font-size:12px;margin-top:3px">${variant}</div>`:"")
      +`</td><td style="padding:12px 10px;text-align:center;border-bottom:1px solid #eee">${Math.max(1,Number(x.quantity||1))}</td>`
      +`<td style="padding:12px 10px;text-align:right;border-bottom:1px solid #eee;white-space:nowrap">${money(x.line_total??Number(x.unit_price||0)*Number(x.quantity||1))}</td></tr>`;
  }).join("");
  const subject=`New Order Received — ${orderNumber||"GrabZone order"}`;
  const link=panelUrl||"https://grabzone.tech/vendor-dashboard#orders";
  const html=`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>`
   +`<body style="margin:0;background:#f5f6f8;font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;-webkit-text-size-adjust:100%">`
   +`<div style="display:none;font-size:1px;color:#f5f6f8">A new order is waiting for you in your GrabZone vendor panel.</div>`
   +`<div style="max-width:620px;margin:22px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 6px 22px rgba(0,0,0,.06)">`
   +`<div style="padding:26px 22px;background:#111;color:#fff">`
   +`<div style="font-size:12px;letter-spacing:2px;color:#ffb36b;font-weight:bold">GRABZONE · VENDOR NOTIFICATION</div>`
   +`<h1 style="margin:12px 0 6px;font-size:24px;line-height:1.25">New Order Received</h1>`
   +`<div style="color:#d6d6d6;font-size:14px">${esc(vendorName||"Vendor")}${customerName?` · Customer: ${esc(customerName)}`:""}</div></div>`
   +`<div style="padding:22px">`
   +`<p style="margin:0 0 16px;font-size:15px;line-height:1.6">A customer order has been placed for your store and is now waiting in your vendor panel. Please review and process it.</p>`
   +`<table style="width:100%;border-collapse:collapse;background:#fafafa;border-radius:12px;margin:0 0 18px"><tbody>`
   +`<tr><td style="padding:11px 14px;color:#666;font-size:13px">Order ID</td><td style="padding:11px 14px;text-align:right;font-weight:bold">${esc(orderNumber||"")}</td></tr>`
   +`<tr><td style="padding:11px 14px;color:#666;font-size:13px;border-top:1px solid #eee">Placed</td><td style="padding:11px 14px;text-align:right;border-top:1px solid #eee">${esc(formatDhakaTime(placedAt))}</td></tr>`
   +`<tr><td style="padding:11px 14px;color:#666;font-size:13px;border-top:1px solid #eee">Order status</td><td style="padding:11px 14px;text-align:right;border-top:1px solid #eee">${esc(statusLabel(orderStatus))}</td></tr>`
   +`<tr><td style="padding:11px 14px;color:#666;font-size:13px;border-top:1px solid #eee">Payment</td><td style="padding:11px 14px;text-align:right;border-top:1px solid #eee">Cash on Delivery</td></tr>`
   +`<tr><td style="padding:11px 14px;color:#666;font-size:13px;border-top:1px solid #eee">Your action</td><td style="padding:11px 14px;text-align:right;border-top:1px solid #eee">Process this order in your panel</td></tr>`
   +`</tbody></table>`
   +`<h2 style="margin:0 0 8px;font-size:15px;color:#111">Your items in this order</h2>`
   +`<table style="width:100%;border-collapse:collapse;font-size:14px"><thead><tr>`
   +`<th align="left" style="padding:10px;border-bottom:2px solid #e6e6e6;font-size:12px;color:#666;text-transform:uppercase;letter-spacing:.06em">Product</th>`
   +`<th style="padding:10px;border-bottom:2px solid #e6e6e6;font-size:12px;color:#666;text-transform:uppercase;letter-spacing:.06em">Qty</th>`
   +`<th align="right" style="padding:10px;border-bottom:2px solid #e6e6e6;font-size:12px;color:#666;text-transform:uppercase;letter-spacing:.06em">Amount</th>`
   +`</tr></thead><tbody>${rows}</tbody></table>`
   +`<div style="margin-top:16px;text-align:right;line-height:2;font-size:14px">`
   +`<div>Subtotal: <b>${money(subtotal)}</b></div>`
   +`${Number(discount||0)>0?`<div style="color:#b23b00">Store coupon: <b>-${money(discount)}</b></div>`:""}`
   +`<div>Delivery charge: <b>${money(shipping)}</b></div>`
   +`<div style="font-size:18px;margin-top:4px">Total for your store: <b style="color:#e2570b">${money(total)}</b></div></div>`
   +`<p style="margin:26px 0 18px;text-align:center"><a href="${esc(link)}" style="display:inline-block;background:#ff6b00;color:#fff;text-decoration:none;padding:14px 24px;border-radius:10px;font-weight:bold;font-size:15px">Open in Vendor Panel</a></p>`
   +`<p style="margin:0 0 8px;font-size:13px;color:#555;line-height:1.7">Please process this order: sign in to your vendor panel, check the items, then update the order status or create the shipment. The customer is waiting for confirmation.</p>`
   +`<p style="margin:0;font-size:12px;color:#888;line-height:1.7">This notification is for the vendor account that owns the items above and contains only your part of the order. Payment is Cash on Delivery — settlement follows the GrabZone vendor terms. If the button does not work, copy this address into your browser: <span style="color:#555">${esc(link)}</span></p>`
   +`</div></div></body></html>`;
  const text=["GrabZone — New Order Received","",`Vendor: ${vendorName||""}`,`Order ID: ${orderNumber||""}`]
    .concat(placedAt?[`Placed: ${formatDhakaTime(placedAt)}`]:[])
    .concat([`Order status: ${statusLabel(orderStatus)}`,"Payment: Cash on Delivery","Your action: process this order in your panel","","Items:"])
    .concat((items||[]).map(x=>{const v=variationText(x);return `- ${x.product_name||x.name||"Product"}${v?` (${v})`:""} × ${Math.max(1,Number(x.quantity||1))} — ${money(x.line_total??Number(x.unit_price||0)*Number(x.quantity||1))}`}))
    .concat(["",`Subtotal: ${money(subtotal)}`,`Delivery charge: ${money(shipping)}`,`Total for your store: ${money(total)}`,"",`Open your vendor panel: ${link}`,"","Please process this order from your vendor panel.","This notification contains only your part of the order."])
    .join("\n");
  return {subject,html,text};
}

/** Base64url of a UTF-8 string without Buffer (Workers runtime). */
function b64url(str){
  const bytes=new TextEncoder().encode(str);
  let bin="";
  for(const b of bytes)bin+=String.fromCharCode(b);
  return btoa(bin).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
}

/** Send through the Gmail API using the refresh token this project already stores. */
async function sendViaGmail(env,{to,subject,html,text}){
  const have=env.GOOGLE_CLIENT_ID&&env.GOOGLE_CLIENT_SECRET&&env.GOOGLE_REFRESH_TOKEN;
  if(!have)return {ok:false,skipped:"no-gmail-credentials"};
  try{
    const tokenRes=await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({client_id:String(env.GOOGLE_CLIENT_ID),client_secret:String(env.GOOGLE_CLIENT_SECRET),refresh_token:String(env.GOOGLE_REFRESH_TOKEN),grant_type:"refresh_token"})});
    const token=await tokenRes.json().catch(()=>({}));
    if(!tokenRes.ok||!token.access_token)return {ok:false,provider:"gmail",status:tokenRes.status,error:"Gmail token request failed",definitive:true};
    const boundary="gzb_"+Math.random().toString(36).slice(2);
    const raw=["From: GrabZone Vendors <"+String(env.GMAIL_FROM_EMAIL||"support@grabzone.tech")+">","To: "+to,"Subject: "+subject,"MIME-Version: 1.0",`Content-Type: multipart/alternative; boundary="${boundary}"`,"","--"+boundary,"Content-Type: text/plain; charset=UTF-8","",text,"","--"+boundary,"Content-Type: text/html; charset=UTF-8","",html,"","--"+boundary+"--",""].join("\r\n");
    const res=await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send",{method:"POST",headers:{Authorization:"Bearer "+token.access_token,"Content-Type":"application/json"},body:JSON.stringify({raw:b64url(raw)})});
    if(!res.ok){const detail=(await res.text()).slice(0,400);return {ok:false,provider:"gmail",status:res.status,error:detail,definitive:true}}
    const data=await res.json().catch(()=>({}));
    return {ok:true,provider:"gmail",status:res.status,id:data.id||null};
  }catch(err){
    return {ok:false,provider:"gmail",error:String(err?.message||err),definitive:false};
  }
}

/** True when the project's Gmail API credentials are all present. */
export function gmailConfigured(env){
  return !!(env.GOOGLE_CLIENT_ID&&env.GOOGLE_CLIENT_SECRET&&env.GOOGLE_REFRESH_TOKEN);
}

/**
 * Shared transactional provider router.
 * Provider order can be overridden with EMAIL_PROVIDER_ORDER or
 * EMAIL_PROVIDER_ORDER_TRANSACTIONAL (comma-separated provider IDs).
 * A network error or HTTP 5xx is ambiguous and stops failover to avoid duplicates.
 */
export function configuredEmailProviderOrder(env={}, category="transactional"){
  const raw=env["EMAIL_PROVIDER_ORDER_"+String(category).toUpperCase()]||env.EMAIL_PROVIDER_ORDER||"resend,brevo,mailtrap,gmail";
  const allowed=new Set(["resend","brevo","mailtrap","gmail"]);
  const order=String(raw).split(",").map(x=>x.trim().toLowerCase()).filter((x,i,a)=>allowed.has(x)&&a.indexOf(x)===i);
  return order.length?order:["resend","brevo","mailtrap","gmail"];
}
async function sendViaBrevo(env,{to,subject,html,text,fromName="GrabZone"}){
  if(!env.BREVO_API_KEY)return {ok:false,skipped:"no-brevo-credentials",provider:"brevo"};
  const from=String(env.BREVO_FROM_EMAIL||env.ORDER_EMAIL_FROM||"").trim();
  if(!from)return {ok:false,skipped:"no-brevo-sender",provider:"brevo"};
  try{
    const res=await fetch("https://api.brevo.com/v3/smtp/email",{method:"POST",headers:{"api-key":String(env.BREVO_API_KEY),"Content-Type":"application/json","Accept":"application/json"},body:JSON.stringify({sender:{name:fromName,email:from},to:[{email:to}],subject,htmlContent:html,textContent:text})});
    const data=await res.json().catch(()=>({}));
    if(res.ok)return {ok:true,provider:"brevo",status:res.status,id:data.messageId||null};
    return {ok:false,provider:"brevo",status:res.status,error:"Brevo rejected the email request",definitive:res.status!==408&&res.status!==425&&res.status<500};
  }catch(err){return {ok:false,provider:"brevo",error:String(err?.message||err),definitive:false};}
}
async function sendViaMailtrap(env,{to,subject,html,text,fromName="GrabZone"}){
  const key=env.MAILTRAP_API_TOKEN||env.MAILTRAP_API_KEY;
  if(!key)return {ok:false,skipped:"no-mailtrap-credentials",provider:"mailtrap"};
  const from=String(env.MAILTRAP_FROM_EMAIL||"").trim();
  if(!from)return {ok:false,skipped:"no-mailtrap-production-sender",provider:"mailtrap"};
  try{
    const res=await fetch("https://send.api.mailtrap.io/api/send",{method:"POST",headers:{"Authorization":"Bearer "+String(key),"Content-Type":"application/json"},body:JSON.stringify({from:{email:from,name:fromName},to:[{email:to}],subject,html,text})});
    const data=await res.json().catch(()=>({}));
    if(res.ok)return {ok:true,provider:"mailtrap",status:res.status,id:data.message_ids?.[0]||data.message_id||null};
    return {ok:false,provider:"mailtrap",status:res.status,error:"Mailtrap rejected the email request",definitive:res.status!==408&&res.status!==425&&res.status<500};
  }catch(err){return {ok:false,provider:"mailtrap",error:String(err?.message||err),definitive:false};}
}
async function sendViaResend(env,{to,subject,html,text,fromName="GrabZone"}){
  if(!env.RESEND_API_KEY)return {ok:false,skipped:"no-resend-credentials",provider:"resend"};
  const from=String(env.ORDER_EMAIL_FROM||"support@grabzone.tech").trim();
  try{
    const res=await fetch("https://api.resend.com/emails",{method:"POST",headers:{"Authorization":"Bearer "+String(env.RESEND_API_KEY),"Content-Type":"application/json"},body:JSON.stringify({from:fromName+" <"+from+">",to:[to],subject,html,text})});
    const data=await res.json().catch(()=>({}));
    if(res.ok)return {ok:true,provider:"resend",status:res.status,id:data.id||null};
    return {ok:false,provider:"resend",status:res.status,error:"Resend rejected the email request",definitive:res.status!==408&&res.status!==425&&res.status<500};
  }catch(err){return {ok:false,provider:"resend",error:String(err?.message||err),definitive:false};}
}
export async function sendEmailWithFallback(env,message,{category="transactional",gmailSender=sendViaGmail}={}){
  const to=String(message?.to||"").trim();
  if(!to||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to))return {skipped:"no-recipient",attempts:[]};
  const senders={resend:sendViaResend,brevo:sendViaBrevo,mailtrap:sendViaMailtrap,gmail:gmailSender};
  const attempts=[];
  for(const provider of configuredEmailProviderOrder(env,category)){
    const result=await senders[provider](env,{...message,to});
    if(result.skipped){attempts.push({provider,outcome:"not-configured"});continue;}
    const outcome=result.ok?"accepted":result.definitive?"rejected":"ambiguous";
    attempts.push({provider,status:result.status??null,outcome});
    if(result.ok)return {...result,attempts};
    if(!result.definitive)return {...result,attempts};
  }
  return {ok:false,skipped:attempts.length?"all-providers-failed":"no-provider",definitive:true,attempts};
}

/**
 * New-order notification for one vendor.
 *
 * Provider order defaults to Resend, Brevo, Mailtrap, then the existing Gmail API
 * integration; EMAIL_PROVIDER_ORDER_TRANSACTIONAL can override that order.
 * Definitive rejection can fall through to the next configured provider.
 * Network-level failures and HTTP 5xx responses are ambiguous and stop immediate
 * failover because the first provider may already have accepted the message.
 *
 * payload: {to,vendorName,orderNumber,placedAt,orderStatus,items,subtotal,shipping,total,panelUrl,customerName}
 * result : {ok:true,provider,status,id,attempts} | {skipped:"..."} | {ok:false,provider,status,error,definitive,attempts}
 */
export async function sendVendorOrderEmail(env,payload={}){
  const to=String(payload.to||"").trim();
  if(!to||!to.includes("@"))return {skipped:"no-recipient"};
  const {subject,html,text}=buildVendorOrderEmail(payload);
  return sendEmailWithFallback(env,{to,subject,html,text,fromName:"GrabZone Vendors"},{category:"transactional"});
}

export async function sendCustomerOrderConfirmation(env,{to,customerName,orderNumber,items,subtotal,shipping,total,tracking}){
  if(!to)return {skipped:true};
  const rows=(items||[]).map(x=>`<tr><td style="padding:10px;border-bottom:1px solid #eee">${esc(x.product_name||"Product")}</td><td style="padding:10px;text-align:center;border-bottom:1px solid #eee">${Math.max(1,Number(x.quantity||1))}</td><td style="padding:10px;text-align:right;border-bottom:1px solid #eee">${money(x.line_total??Number(x.unit_price||0)*Number(x.quantity||1))}</td></tr>`).join("");
  const trackingUrl="https://grabzone.tech/track-order.html?tracking="+encodeURIComponent(tracking||"");
  const html=`<!doctype html><html><body style="margin:0;background:#f6f7f9;font-family:Arial,sans-serif;color:#171717"><div style="max-width:620px;margin:24px auto;background:#fff;border-radius:16px;overflow:hidden"><div style="padding:26px;background:#111;color:#fff"><div style="font-size:12px;letter-spacing:2px;color:#ffb36b;font-weight:bold">GRABZONE · ORDER CONFIRMATION</div><h1 style="margin:12px 0 4px;font-size:25px">Thanks for your order!</h1><div style="color:#ddd">Hi ${esc(customerName||"there")}, we've received your order.</div></div><div style="padding:24px"><p><strong>Order number:</strong> ${esc(orderNumber||"")}</p><table style="width:100%;border-collapse:collapse"><thead><tr><th align="left" style="padding:10px;border-bottom:2px solid #ddd">Item</th><th style="padding:10px;border-bottom:2px solid #ddd">Qty</th><th align="right" style="padding:10px;border-bottom:2px solid #ddd">Amount</th></tr></thead><tbody>${rows}</tbody></table><div style="margin-top:18px;text-align:right;line-height:1.9"><div>Subtotal: ${money(subtotal)}</div><div>Delivery: ${money(shipping)}</div><div style="font-size:19px;font-weight:bold">Total: ${money(total)}</div></div><p style="margin:26px 0"><a href="${trackingUrl}" style="display:inline-block;background:#ff6b00;color:#fff;text-decoration:none;padding:13px 20px;border-radius:9px;font-weight:bold">Track your order</a></p><p style="color:#666;font-size:13px">Payment method: Cash on Delivery. We'll contact you to confirm your order.</p><div style="margin-top:24px;padding-top:16px;border-top:1px solid #eee;text-align:center;font-size:12px;color:#777;line-height:1.7">Need help? Contact GrabZone Support: <a href="mailto:support@grabzone.tech" style="color:#e2570b;font-weight:700">support@grabzone.tech</a><br>Follow us: <a href="https://t.me/grabzoneofficial" style="color:#e2570b;font-weight:700">Telegram</a> · <a href="https://www.facebook.com/grabzoneofficial/" style="color:#e2570b;font-weight:700">Facebook</a> · <a href="https://www.instagram.com/grabzoneofficial/" style="color:#e2570b;font-weight:700">Instagram</a></div></div></div></body></html>`;
  const text=`GrabZone order received — ${orderNumber||""}. Total: ${money(total)}. Track your order: ${trackingUrl}`;
  return sendEmailWithFallback(env,{to:String(to).trim(),subject:`GrabZone order received — ${orderNumber||""}`.trim(),html,text,fromName:"GrabZone Orders"},{category:"transactional"});
}
