import gateway from './marketplace-api-gateway.mjs';

const MAX_BYTES=1024*1024;
const json=(x,s=200)=>new Response(JSON.stringify(x),{status:s,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store, must-revalidate'}});
const UPLOAD_AUTH_FIX=`<script data-gz-vendor-upload-auth-fix>(()=>{if(window.__gzVendorUploadAuthFix)return;window.__gzVendorUploadAuthFix=1;const originalFetch=window.fetch.bind(window);const getToken=()=>{try{return window.getToken?.()||localStorage.getItem('gz_d1_admin_token')||sessionStorage.getItem('gz_d1_admin_token')||''}catch{return''}};const authHeaders=()=>{const t=getToken(),h=new Headers();if(t){h.set('Authorization','Bearer '+t);h.set('X-GrabZone-Token',t)}return h};window.fetch=async(input,init={})=>{let path='';try{path=new URL(typeof input==='string'?input:input?.url||'',location.href).pathname}catch{}if(path!=='/api/vendor/upload')return originalFetch(input,init);try{const h=authHeaders();await originalFetch('/api/admin-auth',{method:'GET',headers:h,credentials:'include',cache:'no-store'}).catch(()=>{});const headers=new Headers(init.headers||(input instanceof Request?input.headers:undefined));const t=getToken();if(t){if(!headers.has('Authorization'))headers.set('Authorization','Bearer '+t);if(!headers.has('X-GrabZone-Token'))headers.set('X-GrabZone-Token',t)}return originalFetch(input,{...init,credentials:init.credentials||'include',headers})}catch{return originalFetch(input,{...init,credentials:init.credentials||'include'})}}})();</script>`;

async function one(env,sql,p=[]){return (await env.DB.prepare(sql).bind(...p).all()).results?.[0]||null}
async function all(env,sql,p=[]){return (await env.DB.prepare(sql).bind(...p).all()).results||[]}
function norm(v){return String(v??'').normalize('NFKC').toLowerCase().replace(/[^a-z0-9]+/g,'')}

async function directVendorData(req,env,ctx){
  const u=new URL(req.url);
  if(u.pathname!=='/api/vendor/admin/vendor-data'||req.method!=='GET')return null;
  const auth=await gateway.fetch(new Request(new URL('/api/admin-auth',req.url),{method:'GET',headers:new Headers(req.headers)}),env,ctx);
  const authBody=await auth.clone().json().catch(()=>({}));
  if(!auth.ok||!authBody.authenticated)return json({error:'Unauthorized'},401);
  const raw=String(u.searchParams.get('vendor_id')||u.searchParams.get('vendor')||'').trim();
  if(!raw||raw==='null'||raw==='undefined')return json({error:'Vendor required'},400);
  let v=await one(env,'SELECT * FROM vendors WHERE lower(trim(id))=lower(trim(?)) OR lower(trim(slug))=lower(trim(?)) LIMIT 1',[raw,raw]);
  if(!v){
    const target=norm(raw);
    const rows=await all(env,'SELECT * FROM vendors ORDER BY rowid DESC LIMIT 1000');
    const matches=rows.filter(x=>['id','slug','brand_name','business_name','name','email','business_email','order_notification_email','support_email'].some(k=>norm(x[k])===target));
    if(matches.length===1)v=matches[0];
    if(!v){
      const base=target.replace(/\d+$/,'');
      if(base){const candidates=rows.filter(x=>['slug','brand_name','business_name','name'].some(k=>{const n=norm(x[k]);return n===base||n.startsWith(base)}));if(candidates.length===1)v=candidates[0]}
    }
  }
  if(!v)return json({error:'Vendor not found'},404);
  const products=await all(env,'SELECT * FROM products WHERE vendor_id=? ORDER BY COALESCE(updated_at,created_at) DESC',[v.id]);
  let orders=[];
  try{orders=await all(env,'SELECT vo.*,o.order_number,o.public_tracking_id FROM vendor_orders vo LEFT JOIN orders o ON o.id=vo.order_id WHERE vo.vendor_id=? ORDER BY vo.created_at DESC LIMIT 100',[v.id])}catch{}
  return json({vendor:v,products,orders});
}

export default{fetch:async(req,env,ctx)=>{try{
  const p=new URL(req.url).pathname;
  if(p==='/api/vendor/upload'&&req.method==='POST'){
    const form=await req.clone().formData().catch(()=>null);
    const file=form?.get('file');
    if(file instanceof File&&file.size>MAX_BYTES)return json({error:'Image must be 1 MB or smaller.'},413);
  }
  const direct=await directVendorData(req,env,ctx);
  if(direct)return direct;
  const response=await gateway.fetch(req,env,ctx);
  if(response.ok&&(p==='/marketplace-vendor-control-v2'||p==='/marketplace-vendor-control-v2.html'||p==='/vendor-admin'||p==='/vendor-admin.html')){
    const type=response.headers.get('content-type')||'';
    if(type.includes('text/html')){const body=await response.text();const html=body.replace(/<head[^>]*>/i,m=>m+'\n'+UPLOAD_AUTH_FIX);const h=new Headers(response.headers);h.delete('Content-Length');h.set('Cache-Control','no-store, no-cache, must-revalidate, max-age=0');h.set('Pragma','no-cache');return new Response(html,{status:response.status,statusText:response.statusText,headers:h})}
  }
  return response;
}catch(err){return json({error:err?.message||'Vendor preview failed'},500)}}};
