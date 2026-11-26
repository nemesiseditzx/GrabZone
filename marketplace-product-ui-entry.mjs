import base from './marketplace-image-final-entry.mjs';

const UI='<script src="/vendor-control-product-editor.js?v=20260920-v11" data-gz-vendor-product-editor></script>';
const STOREFRONT_MOBILE_CSS='<link rel="stylesheet" href="/grabzone-storefront-mobile.css?v=20261126-mobile1">';
const PANEL_MOBILE_CSS='<link rel="stylesheet" href="/grabzone-mobile-panel-fixes.css?v=20261126-panel1">';

export default {async fetch(req,env,ctx){
  const r=await base.fetch(req,env,ctx);
  const type=r.headers.get('content-type')||'';
  if(!r.ok||!type.toLowerCase().includes('text/html'))return r;
  const path=new URL(req.url).pathname;
  const storefrontPage=path==='/'||path==='/index.html';
  const panelPage=/^\/(?:admin(?:\.html)?|marketplace-vendor-control-v2(?:\.html)?|vendor-admin(?:\.html)?)$/i.test(path);
  const vendorPage=/^\/marketplace-vendor-control-v2(?:\.html)?$/i.test(path);
  const additions=[storefrontPage?STOREFRONT_MOBILE_CSS:'',panelPage?PANEL_MOBILE_CSS:'',vendorPage?UI:''].filter(Boolean).join('\n');
  const html=await r.text();
  const out=/<head[^>]*>/i.test(html)?html.replace(/<head[^>]*>/i,m=>m+'\n'+additions):additions+html;
  const h=new Headers(r.headers);
  h.delete('Content-Length');
  h.set('Cache-Control','no-store,must-revalidate');
  return new Response(out,{status:r.status,statusText:r.statusText,headers:h});
}};
