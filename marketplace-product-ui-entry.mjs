import base from './marketplace-image-final-entry.mjs';

const UI=`<script src="/vendor-control-product-editor.js?v=20260920-v10" data-gz-vendor-product-editor></script>`;

export default {async fetch(req,env,ctx){const r=await base.fetch(req,env,ctx);const type=r.headers.get('content-type')||'';if(!r.ok||!type.toLowerCase().includes('text/html'))return r;const html=await r.text();const path=new URL(req.url).pathname;const extra=/^\/marketplace-vendor-control-v2(?:\.html)?$/i.test(path)?UI:'';const out=/<head[^>]*>/i.test(html)?html.replace(/<head[^>]*>/i,m=>m+'\n'+extra):extra+html;const h=new Headers(r.headers);h.delete('Content-Length');h.set('Cache-Control','no-store,must-revalidate');return new Response(out,{status:r.status,statusText:r.statusText,headers:h})}};