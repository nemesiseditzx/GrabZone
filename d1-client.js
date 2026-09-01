(() => {
'use strict';

/*
 * GrabZone database/auth facade.
 * The storefront/admin now use Supabase directly instead of Cloudflare D1.
 * The public API shape is intentionally kept as grabzoneD1 so existing UI code
 * does not need to change.
 */
const C=window.GRABZONE_CONFIG||{};
const BASE=String(C.supabaseUrl||'').replace(/\/$/,'');
const ANON=String(C.supabaseAnonKey||'');
const ACCESS_KEY='gz_supabase_access_token';
const REFRESH_KEY='gz_supabase_refresh_token';
const USER_KEY='gz_supabase_user';

const read=k=>{try{return localStorage.getItem(k)||sessionStorage.getItem(k)||''}catch{return''}};
const write=(k,v)=>{try{if(v){localStorage.setItem(k,v);sessionStorage.setItem(k,v)}else{localStorage.removeItem(k);sessionStorage.removeItem(k)}}catch{}};
const userRead=()=>{try{return JSON.parse(read(USER_KEY)||'null')}catch{return null}};
const userWrite=v=>write(USER_KEY,v?JSON.stringify(v):'');

function configured(){return !!(BASE&&ANON)}
function headers(token=''){
  const h={'apikey':ANON,'Content-Type':'application/json','Accept':'application/json'};
  if(token)h.Authorization='Bearer '+token;
  return h;
}
function api(path){return BASE+path}
async function parse(r){
  const b=await r.json().catch(()=>null);
  if(!r.ok){
    const msg=b?.msg||b?.message||b?.error_description||b?.hint||b?.details||b?.error||('Supabase request failed ('+r.status+').');
    const e=new Error(String(msg));e.status=r.status;e.body=b;throw e;
  }
  return b;
}
async function refresh(){
  const rt=read(REFRESH_KEY);
  if(!configured()||!rt)return null;
  try{
    const r=await fetch(api('/auth/v1/token?grant_type=refresh_token'),{
      method:'POST',headers:headers(),body:JSON.stringify({refresh_token:rt})
    });
    const b=await parse(r);
    write(ACCESS_KEY,b.access_token||'');
    if(b.refresh_token)write(REFRESH_KEY,b.refresh_token);
    if(b.user)userWrite(b.user);
    return b;
  }catch{return null}
}
async function requestRaw(url,options={},retry=true){
  const token=read(ACCESS_KEY);
  const h={...headers(token),...(options.headers||{})};
  let r=await fetch(url,{...options,headers:h});
  if(r.status===401&&retry&&read(REFRESH_KEY)){
    const b=await refresh();
    if(b?.access_token){
      r=await fetch(url,{...options,headers:{...headers(b.access_token),...(options.headers||{})}});
    }
  }
  return r;
}
async function request(url,options={},retry=true){
  return parse(await requestRaw(url,options,retry));
}

function filterParts(filters){
  return (filters||[]).map(f=>{
    const col=encodeURIComponent(String(f.column));
    const v=f.value;
    if(f.op==='eq')return col+'=eq.'+encodeURIComponent(String(v));
    if(f.op==='neq')return col+'=neq.'+encodeURIComponent(String(v));
    if(f.op==='gt')return col+'=gt.'+encodeURIComponent(String(v));
    if(f.op==='gte')return col+'=gte.'+encodeURIComponent(String(v));
    if(f.op==='lt')return col+'=lt.'+encodeURIComponent(String(v));
    if(f.op==='lte')return col+'=lte.'+encodeURIComponent(String(v));
    if(f.op==='is')return col+'=is.'+(v===null?'null':'not.null');
    if(f.op==='in'){
      const xs=Array.isArray(v)?v:[];
      return col+'=in.('+xs.map(x=>encodeURIComponent(String(x))).join(',')+')';
    }
    throw new Error('Unsupported filter: '+f.op);
  });
}
function qs(parts){return parts.filter(Boolean).join('&')}

async function tableRequest(s){
  if(!configured())return{data:null,error:{message:'Supabase database service is not configured.'}};
  let url=api('/rest/v1/'+encodeURIComponent(s.table));
  const q=[];
  if(s.action==='select'){
    q.push('select='+encodeURIComponent(s.columns||'*'));
    q.push(...filterParts(s.filters));
    if(s.orders?.length){
      q.push('order='+s.orders.map(o=>encodeURIComponent(String(o.column))+'.'+(o.ascending===false?'desc':'asc')).join(','));
    }
    if(s.limit!==null&&s.limit!==undefined)q.push('limit='+encodeURIComponent(String(s.limit)));
    const r=await requestRaw(url+'?'+qs(q),{method:'GET'});
    try{
      const data=await parse(r);
      if(s.single==='single'){
        if(!Array.isArray(data)||data.length!==1)throw new Error(Array.isArray(data)&&data.length?'Multiple rows returned.':'No rows found.');
        return{data:data[0],error:null};
      }
      if(s.single==='maybe')return{data:Array.isArray(data)?(data[0]||null):null,error:null};
      return{data,error:null,count:Array.isArray(data)?data.length:null};
    }catch(e){return{data:null,error:{message:e.message,status:e.status}}}
  }

  const token=read(ACCESS_KEY);
  const h=headers(token);
  let method='POST',body=null;
  if(s.action==='insert'){method='POST';body=JSON.stringify(s.values)}
  else if(s.action==='upsert'){method='POST';h.Prefer='resolution=merge-duplicates,return=representation';body=JSON.stringify(s.values)}
  else if(s.action==='update'){method='PATCH';h.Prefer='return=representation';body=JSON.stringify(s.values)}
  else if(s.action==='delete'){method='DELETE';h.Prefer='return=representation'}
  else return{data:null,error:{message:'Unsupported database action.'}};

  const q2=[];
  if(s.action==='upsert'&&s.conflict)q2.push('on_conflict='+encodeURIComponent(s.conflict));
  if((s.action==='update'||s.action==='delete')&&s.filters)q2.push(...filterParts(s.filters));
  const r=await requestRaw(url+(q2.length?'?'+qs(q2):''),{method,headers:h,body});
  try{
    const data=await parse(r);
    if(s.action==='delete')return{data:s.returning?data:null,error:null,count:Array.isArray(data)?data.length:null};
    if(s.single==='single')return{data:Array.isArray(data)?data[0]:data,error:null};
    if(s.single==='maybe')return{data:Array.isArray(data)?(data[0]||null):data||null,error:null};
    return{data,error:null,count:Array.isArray(data)?data.length:null};
  }catch(e){return{data:null,error:{message:e.message,status:e.status}}}
}

async function rpcRequest(fn,args={}){
  if(!configured())return{data:null,error:{message:'Supabase database service is not configured.'}};
  try{
    const data=await request(api('/rest/v1/rpc/'+encodeURIComponent(fn)),{
      method:'POST',body:JSON.stringify(args)
    });
    return{data,error:null};
  }catch(e){return{data:null,error:{message:e.message,status:e.status}}}
}

function builder(table){
  const s={table,action:'select',columns:'*',filters:[],orders:[],limit:null,single:null,values:null,returning:false,conflict:null};
  const a={
    select(c='*',o={}){s.columns=c||'*';if(o?.returning)s.returning=true;return a},
    eq(c,v){s.filters.push({column:c,op:'eq',value:v});return a},
    neq(c,v){s.filters.push({column:c,op:'neq',value:v});return a},
    gt(c,v){s.filters.push({column:c,op:'gt',value:v});return a},
    gte(c,v){s.filters.push({column:c,op:'gte',value:v});return a},
    lt(c,v){s.filters.push({column:c,op:'lt',value:v});return a},
    lte(c,v){s.filters.push({column:c,op:'lte',value:v});return a},
    is(c,v){s.filters.push({column:c,op:'is',value:v});return a},
    in(c,v){s.filters.push({column:c,op:'in',value:v});return a},
    order(c,o={}){s.orders.push({column:c,ascending:o?.ascending!==false});return a},
    limit(n){s.limit=Number(n);return a},
    maybeSingle(){s.single='maybe';return execute()},
    single(){s.single='single';return execute()},
    insert(v,o={}){s.action='insert';s.values=v;s.returning=!!o?.returning;return a},
    upsert(v,o={}){s.action='upsert';s.values=v;s.returning=true;s.conflict=o?.onConflict||null;return a},
    update(v){s.action='update';s.values=v;return a},
    delete(){s.action='delete';return a},
    then(res,rej){return execute().then(res,rej)}
  };
  async function execute(){return tableRequest(s)}
  return a;
}

const auth={
  async signInWithPassword({email,password}){
    if(!configured())return{data:{user:null,session:null},error:{message:'Supabase database service is not configured.'}};
    try{
      const b=await request(api('/auth/v1/token?grant_type=password'),{
        method:'POST',body:JSON.stringify({email:String(email||'').trim(),password:String(password||'')})
      },false);
      write(ACCESS_KEY,b.access_token||'');
      write(REFRESH_KEY,b.refresh_token||'');
      userWrite(b.user||null);
      return{data:{user:b.user||null,session:{access_token:b.access_token,refresh_token:b.refresh_token,user:b.user||null,expires_at:b.expires_at||null}},error:null};
    }catch(e){
      write(ACCESS_KEY,'');write(REFRESH_KEY,'');userWrite(null);
      return{data:{user:null,session:null},error:{message:e.message||'Invalid email or password.',status:e.status}};
    }
  },
  async getSession(){
    if(!configured())return{data:{session:null},error:{message:'Supabase database service is not configured.'}};
    let token=read(ACCESS_KEY);
    if(!token&&read(REFRESH_KEY)){const b=await refresh();token=b?.access_token||''}
    if(!token)return{data:{session:null},error:null};
    try{
      const u=await request(api('/auth/v1/user'),{method:'GET'});
      userWrite(u);
      return{data:{session:{access_token:read(ACCESS_KEY),refresh_token:read(REFRESH_KEY),user:u}},error:null};
    }catch(e){
      write(ACCESS_KEY,'');write(REFRESH_KEY,'');userWrite(null);
      return{data:{session:null},error:null};
    }
  },
  async signOut(){
    const token=read(ACCESS_KEY);
    try{if(token)await fetch(api('/auth/v1/logout'),{method:'POST',headers:headers(token)})}catch{}
    write(ACCESS_KEY,'');write(REFRESH_KEY,'');userWrite(null);
    return{error:null};
  }
};

window.grabzoneD1={from:builder,rpc:rpcRequest,auth};
window.getToken=()=>read(ACCESS_KEY);
})();