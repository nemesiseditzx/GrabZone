import base from './marketplace-image-final-entry.mjs';

const MOBILE_LAYOUT_CSS='<link rel="stylesheet" href="/grabzone-storefront-mobile.css?v=20261126-mobile1">';
const MOBILE_PANEL_CSS='<link rel="stylesheet" href="/grabzone-mobile-panel-fixes.css?v=20261126-panel1">';

const UI=`<script src="/vendor-control-product-editor.js?v=20260920-v11" data-gz-vendor-product-editor></script>`;

export default {async fetch(req,env,ctx){const r=await base.fetch(req,env,ctx);const type=r.headers.get('content-type')||'';if(!r.ok||!type.toLowerCase().includes('text/html'))return r;const html=await r.text();
  const path=new URL(req.url).pathname;
  const mobileCss=(path==='/'||path==='/index.html')?MOBILE_LAYOUT_CSS:'';
  const panelCss=/^\\/(?:admin(?:\\.html)?|marketplace-vendor-control-v2(?:\\.html)?|vendor-admin(?:\\.html)?)$/i.test(path)?MOBILE_PANEL_CSS:'';
  const additions=[mobileCss,panelCss].filter(Boolean).join('\\n');
  const withMobileCss=/<head[^>]*>/i.test(html)?html.replace(/<head[^>]*>/i,m=>m+'\\n'+additions):additions+html;const path=new URL(req.url).pathname;const extra=/^\/marketplace-vendor-control-v2(?:\.html)?$/i.test(path)?UI:'';const out=/<head[^>]*>/i.test(html)?html.replace(/<head[^>]*>/i,m=>m+'\n'+extra):extra+html;const h=new Headers(r.headers);h.delete('Content-Length');h.set('Cache-Control','no-store,must-revalidate');return new Response(out,{status:r.status,statusText:r.statusText,headers:h})}};