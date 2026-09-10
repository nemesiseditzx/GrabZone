import app from './admin-vendor-capabilities-wrapper.mjs';

const LOADER_SCRIPT = '<script src="/grabzone-global-loader.js" data-grabzone-global-loader></script>';
const CART_BRIDGE_SCRIPT = '<script src="/grabzone-cart-quantity-bridge.js" data-grabzone-cart-bridge></script>';
const MARKETPLACE_THEME = '<link rel="stylesheet" href="/marketplace-theme.css" data-grabzone-marketplace-theme>';

const json = (data,status=200) => new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}});

async function publicBrands(request,env){
  const url=new URL(request.url);
  if(url.pathname!=='/api/marketplace/brands'||request.method!=='GET'||!env?.DB)return null;
  try{
    const result=await env.DB.prepare(`
      SELECT id,slug,brand_name,business_name,logo_url,banner_url,description,featured
      FROM vendors
      WHERE LOWER(COALESCE(status,'Active')) NOT IN ('suspended','inactive','disabled','deleted','blocked')
      ORDER BY featured DESC, COALESCE(brand_name,business_name,slug) COLLATE NOCASE
    `).all();
    const brands=(result.results||[]).map(v=>({...v,brand_name:v.brand_name||v.business_name||v.slug}));
    return json({brands});
  }catch(error){
    return json({brands:[],error:'Unable to load brands'},500);
  }
}

async function injectGlobalLoader(request,response){
  if(!response.ok)return response;
  const type=response.headers.get('content-type')||'';
  if(!type.toLowerCase().includes('text/html'))return response;

  const body=await response.text();
  const scripts=[];
  if(!body.includes('data-grabzone-global-loader'))scripts.push(LOADER_SCRIPT);
  if(!body.includes('data-grabzone-cart-bridge'))scripts.push(CART_BRIDGE_SCRIPT);
  const pathname=new URL(request.url).pathname;
  if((pathname==='/marketplace'||pathname==='/marketplace.html')&&!body.includes('data-grabzone-marketplace-theme'))scripts.push(MARKETPLACE_THEME);
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
    const brandResponse=await publicBrands(request,env);
    if(brandResponse)return brandResponse;
    const response=await app.fetch(request,env,ctx);
    return injectGlobalLoader(request,response);
  }
};
