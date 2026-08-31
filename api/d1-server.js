'use strict';

function d1Config(){
  const account=process.env.R2_ACCOUNT_ID||process.env.CF_ACCOUNT_ID;
  const database=process.env.D1_DATABASE_ID||'ffaa2c49-c89e-439f-9a71-89144b07dfce';
  const token=process.env.CF_API_TOKEN||process.env.CLOUDFLARE_API_TOKEN;
  if(!account||!database||!token)throw new Error('D1 is not configured.');
  return {account,database,token};
}
async function d1Query(sql,params=[]){
  const {account,database,token}=d1Config();
  const r=await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/d1/database/${database}/query`,{
    method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},
    body:JSON.stringify({sql,params})
  });
  const b=await r.json().catch(()=>({}));
  if(!r.ok||b.success===false)throw new Error(b?.errors?.map(x=>x.message).join('; ')||`D1 query failed (${r.status})`);
  return b.result?.[0]||{results:[],meta:{}};
}
async function verifySupabaseBearer(req){
  const auth=String(req.headers.authorization||'');
  if(!auth.startsWith('Bearer '))return false;
  const url=process.env.SUPABASE_URL;
  const key=process.env.SUPABASE_ANON_KEY;
  if(!url||!key)return false;
  const r=await fetch(url.replace(/\/$/,'')+'/auth/v1/user',{headers:{apikey:key,Authorization:auth}});
  return r.ok;
}
module.exports={d1Query,verifySupabaseBearer};