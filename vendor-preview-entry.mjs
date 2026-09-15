import gateway from './marketplace-api-gateway.mjs';

const MAX_BYTES=1024*1024;
const json=(x,s=200)=>new Response(JSON.stringify(x),{status:s,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}});
const UPLOAD_AUTH_FIX=`<script data-gz-vendor-upload-auth-fix>(()=>{if(window.__gzVendorUploadAuthFix)return;window.__gzVendorUploadAuthFix=1;const originalFetch=window.fetch.bind(window);const getToken=()=>{try{return window.getToken?.()||localStorage.getItem('gz_d1_admin_token')||sessionStorage.getItem('gz_d1_admin_token')||''}catch{return''}};const authHeaders=()=>{const t=getToken(),h=new Headers();if(t){h.set('Authorization','Bearer '+t);h.set('X-GrabZone-Token',t)}return h};window.fetch=async(input,init={})=>{let path='';try{path=new URL(typeof input==='string'?input:input?.url||'',location.href).pathname}catch{}if(path!=='/api/vendor/upload')return originalFetch(input,init);try{const h=authHeaders();await originalFetch('/api/admin-auth',{method:'GET',headers:h,credentials:'include',cache:'no-store'}).catch(()=>{});const headers=new Headers(init.headers||(input instanceof Request?input.headers:undefined));const t=getToken();if(t){if(!headers.has('Authorization'))headers.set('Authorization','Bearer '+t);if(!headers.has('X-GrabZone-Token'))headers.set('X-GrabZone-Token',t)}return originalFetch(input,{...init,credentials:init.credentials||'include',headers})}catch{return originalFetch(input,{...init,credentials:init.credentials||'include'})}}})();</script>`;

export default{fetch:async(req,env,ctx)=>{try{
  const p=new URL(req.url).pathname;
  if(p==='/api/vendor/upload'&&req.method==='POST'){
    const form=await req.clone().formData().catch(()=>null);
    const file=form?.get('file');
    if(file instanceof File&&file.size>MAX_BYTES)return json({error:'Image must be 1 MB or smaller.'},413);
  }
  const response=await gateway.fetch(req,env,ctx);
  if(response.ok&&(p==='/marketplace-vendor-control-v2'||p==='/marketplace-vendor-control-v2.html'||p==='/vendor-admin'||p==='/vendor-admin.html')){
    const type=response.headers.get('content-type')||'';
    if(type.includes('text/html')){const body=await response.text();const html=body.replace(/<head[^>]*>/i,m=>m+'\n'+UPLOAD_AUTH_FIX);const h=new Headers(response.headers);h.delete('Content-Length');h.set('Cache-Control','no-store, no-cache, must-revalidate, max-age=0');h.set('Pragma','no-cache');return new Response(html,{status:response.status,statusText:response.statusText,headers:h})}
  }
  return response;
}catch(err){return json({error:err?.message||'Vendor preview failed'},500)}}};
