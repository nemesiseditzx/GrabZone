import app from './admin-vendor-capabilities-wrapper.mjs';

const LOADER_SCRIPT='<script src="/grabzone-global-loader.js" data-grabzone-global-loader></script>';
const CART_BRIDGE_SCRIPT='<script src="/grabzone-cart-quantity-bridge.js" data-grabzone-cart-bridge></script>';
const MARKETPLACE_UI='<script defer src="/marketplace-reference-ui.js?v=20260911-final3" data-grabzone-marketplace-reference-ui></script>';
const HOME_UI='<link rel="stylesheet" href="/marketplace-home-brand-premium.css?v=20260911-ref1"><script src="/grabzone-home-reference-marketplace.js?v=20260915-fullwidth2" data-grabzone-home-reference-marketplace></script><script src="/grabzone-home-layout-finalizer.js?v=20260912-final1" data-grabzone-home-layout-finalizer></script>';
const GLOBAL_RESPONSIVE='<link rel="stylesheet" href="/grabzone-site-responsive.css?v=20260912-final2" data-grabzone-site-responsive>';
const VISUAL_POLISH='<link rel="stylesheet" href="/grabzone-visual-polish.css?v=20260912-final1" data-grabzone-visual-polish>';
const FINAL_VISUAL='<link rel="stylesheet" href="/grabzone-final-visual-fix.css?v=20260912-final2" data-grabzone-final-visual-fix>';

async function inject(response,request){
  if(!response.ok)return response;
  const type=response.headers.get('content-type')||'';
  if(!type.toLowerCase().includes('text/html'))return response;
  const body=await response.text();
  const path=new URL(request.url).pathname;
  const scripts=[];
  if(!body.includes('data-grabzone-global-loader'))scripts.push(LOADER_SCRIPT);
  if(path==='/checkout.html'&&!body.includes('data-grabzone-cart-bridge'))scripts.push(CART_BRIDGE_SCRIPT);
  if((path==='/marketplace'||path==='/marketplace.html')&&!body.includes('data-grabzone-marketplace-reference-ui'))scripts.push(MARKETPLACE_UI);
  if(path==='/'||path==='/index.html')scripts.push(HOME_UI);
  const privatePath=/^\/(?:admin|vendor-admin|marketplace-admin-orders|marketplace-vendor-control)(?:\.html)?$/i.test(path);
  if(!privatePath&&!body.includes('data-grabzone-site-responsive'))scripts.push(GLOBAL_RESPONSIVE);
  if(!privatePath&&!body.includes('data-grabzone-visual-polish'))scripts.push(VISUAL_POLISH);
  if(!privatePath&&!body.includes('data-grabzone-final-visual-fix'))scripts.push(FINAL_VISUAL);
  const enhanced=/<head[^>]*>/i.test(body)?body.replace(/<head[^>]*>/i,m=>m+'\n'+scripts.join('\n')):scripts.join('\n')+body;
  const h=new Headers(response.headers);
  h.set('Cache-Control','no-store, must-revalidate');
  h.delete('Content-Length');
  return new Response(enhanced,{status:response.status,statusText:response.statusText,headers:h});
}

export default{async fetch(request,env,ctx){
  return inject(await app.fetch(request,env,ctx),request);
}};
