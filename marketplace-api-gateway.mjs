import stable from './marketplace-stable-entry.mjs';
import {handleVendorAdminApi} from './vendor-admin-api-compat.mjs';

function normalizeAdminRequest(req){
  const path=new URL(req.url).pathname;
  if(path==='/api/admin-auth')return req;
  if(req.headers.get('Cookie')?.match(/(?:^|;)\s*gz_admin_session=/))return req;
  const auth=req.headers.get('Authorization')||'';
  const token=/^Bearer\s+/i.test(auth)?auth.replace(/^Bearer\s+/i,'').trim():(req.headers.get('X-GrabZone-Token')||'').trim();
  if(!token)return req;
  const h=new Headers(req.headers);
  h.set('Cookie',`gz_admin_session=${encodeURIComponent(token)}`);
  return new Request(req.url,{method:req.method,headers:h,body:['GET','HEAD'].includes(req.method)?undefined:req.body,redirect:'manual'});
}

export default {async fetch(req,env,ctx){
  const normalized=normalizeAdminRequest(req);
  const p=new URL(req.url).pathname;
  if(p==='/api/vendor/admin/products'||p==='/api/vendor/admin/categories'||p==='/api/vendor/admin/store-sections'||p==='/api/vendor/admin/sections'||p==='/api/vendor/admin/store/sections'){
    const r=await handleVendorAdminApi(normalized,env);
    if(r)return r;
  }
  return stable.fetch(normalized,env,ctx);
}};
