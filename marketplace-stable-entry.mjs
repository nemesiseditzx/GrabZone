import app from './admin-vendor-capabilities-wrapper.mjs';

const LOADER_SCRIPT = '<script src="/grabzone-global-loader.js" data-grabzone-global-loader></script>';
const CART_BRIDGE_SCRIPT = '<script src="/grabzone-cart-quantity-bridge.js" data-grabzone-cart-bridge></script>';

async function injectGlobalLoader(request,response){
  if(!response.ok)return response;
  const type=response.headers.get('content-type')||'';
  if(!type.toLowerCase().includes('text/html'))return response;

  const body=await response.text();
  const scripts=[];
  if(!body.includes('data-grabzone-global-loader'))scripts.push(LOADER_SCRIPT);
  if(!body.includes('data-grabzone-cart-bridge'))scripts.push(CART_BRIDGE_SCRIPT);
  if(!scripts.length)return response;

  const injection=scripts.join('\n');
  const marker=/<head[^>]*>/i;
  const enhanced=marker.test(body)
    ? body.replace(marker,function(match){return match+'\n'+injection;})
    : injection+body;

  const headers=new Headers(response.headers);
  headers.set('Cache-Control','no-store, must-revalidate');
  headers.delete('Content-Length');
  return new Response(enhanced,{status:response.status,statusText:response.statusText,headers});
}

export default {
  async fetch(request,env,ctx){
    const response=await app.fetch(request,env,ctx);
    return injectGlobalLoader(request,response);
  }
};
