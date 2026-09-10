import app from './admin-vendor-capabilities-wrapper.mjs';

const LOADER_SCRIPT = '<script src="/grabzone-global-loader.js" data-grabzone-global-loader></script>';

async function injectGlobalLoader(request,response){
  if(!response.ok)return response;
  const type=response.headers.get('content-type')||'';
  if(!type.toLowerCase().includes('text/html'))return response;

  const body=await response.text();
  if(body.includes('data-grabzone-global-loader'))return response;

  const marker=/<head[^>]*>/i;
  const enhanced=marker.test(body)
    ? body.replace(marker,function(match){return match+'\n'+LOADER_SCRIPT;})
    : LOADER_SCRIPT+body;

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
