import base from './marketplace-image-final-entry.mjs';

const UPLOAD_AUTH_FIX=`<script data-gz-vendor-upload-auth-fix>(()=>{if(window.__gzVendorUploadAuthFix)return;window.__gzVendorUploadAuthFix=1;const originalFetch=window.fetch.bind(window);const getToken=()=>{try{return window.getToken?.()||localStorage.getItem('gz_d1_admin_token')||sessionStorage.getItem('gz_d1_admin_token')||''}catch{return''}};const authHeaders=()=>{const t=getToken(),h=new Headers();if(t){h.set('Authorization','Bearer '+t);h.set('X-GrabZone-Token',t)}return h};window.fetch=async(input,init={})=>{let path='';try{path=new URL(typeof input==='string'?input:input?.url||'',location.href).pathname}catch{}if(path!=='/api/vendor/upload')return originalFetch(input,init);try{const h=authHeaders();await originalFetch('/api/admin-auth',{method:'GET',headers:h,credentials:'include',cache:'no-store'}).catch(()=>{});const headers=new Headers(init.headers||(input instanceof Request?input.headers:undefined));const t=getToken();if(t){if(!headers.has('Authorization'))headers.set('Authorization','Bearer '+t);if(!headers.has('X-GrabZone-Token'))headers.set('X-GrabZone-Token',t)}return originalFetch(input,{...init,credentials:init.credentials||'include',headers})}catch{return originalFetch(input,{...init,credentials:init.credentials||'include'})}}})();</script>`;
const VENDOR_PRODUCT_EDITOR='<script src="/vendor-control-product-editor.js?v=20261124-single-worker" data-gz-vendor-product-editor></script>';
const FAVICON='<link rel="icon" type="image/svg+xml" href="/favicon.svg?v=20261001-favicon-final"><link rel="apple-touch-icon" href="/favicon.svg?v=20261001">';
const MOBILE_PANEL_CSS='<link rel="stylesheet" href="/grabzone-mobile-panel-fixes.css?v=20261124-mobile1">';
const STOREFRONT_MOBILE_CSS='<link rel="stylesheet" href="/grabzone-storefront-mobile.css?v=20261124-store2">';

export default {async fetch(req,env,ctx){
  const r=await base.fetch(req,env,ctx);
  const type=r.headers.get('content-type')||'';
  if(!r.ok||!type.toLowerCase().includes('text/html'))return r;
  const path=new URL(req.url).pathname;
  const vendorPanel=/^\/(?:marketplace-vendor-control-v2(?:\.html)?|vendor-admin(?:\.html)?)$/i.test(path);
  const adminPanel=/^\/(?:admin(?:\.html)?|vendor-admin(?:\.html)?)$/i.test(path);
  const storefrontPage=path==='/'||path==='/index.html';
  const extra=[FAVICON,(storefrontPage)?STOREFRONT_MOBILE_CSS:'',(vendorPanel||adminPanel)?MOBILE_PANEL_CSS:'',vendorPanel?UPLOAD_AUTH_FIX:'',vendorPanel?VENDOR_PRODUCT_EDITOR:''].filter(Boolean).join('\n');
  const body=await r.text();
  const out=/<head[^>]*>/i.test(body)?body.replace(/<head[^>]*>/i,m=>m+'\n'+extra):extra+body;
  const h=new Headers(r.headers);h.delete('Content-Length');h.set('Cache-Control','no-store,must-revalidate');
  return new Response(out,{status:r.status,statusText:r.statusText,headers:h});
}};
