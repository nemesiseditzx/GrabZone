import stable from './marketplace-stable-entry.mjs';
import {handleVendorAdminApi} from './vendor-admin-api-compat.mjs';

export default {async fetch(req,env,ctx){
  const p=new URL(req.url).pathname;
  if(p==='/api/vendor/admin/products'||p==='/api/vendor/admin/categories'||p==='/api/vendor/admin/store-sections'||p==='/api/vendor/admin/sections'||p==='/api/vendor/admin/store/sections'){
    const r=await handleVendorAdminApi(req,env);
    if(r)return r;
  }
  return stable.fetch(req,env,ctx);
}};
