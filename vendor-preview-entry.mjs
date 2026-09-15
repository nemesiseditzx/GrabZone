import gateway from './marketplace-api-gateway.mjs';

const MAX_BYTES=1024*1024;
const json=(x,s=200)=>new Response(JSON.stringify(x),{status:s,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}});

export default{fetch:async(req,env,ctx)=>{try{
  const p=new URL(req.url).pathname;
  if(p==='/api/vendor/upload'&&req.method==='POST'){
    const form=await req.clone().formData().catch(()=>null);
    const file=form?.get('file');
    if(file instanceof File&&file.size>MAX_BYTES)return json({error:'Image must be 1 MB or smaller.'},413);
  }
  return gateway.fetch(req,env,ctx);
}catch(err){return json({error:err?.message||'Vendor preview failed'},500)}}};
