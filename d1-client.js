(() => {
'use strict';

/* GrabZone D1 client: browser facade for the Cloudflare Worker D1 API + D1 admin auth. */
const C=window.GRABZONE_CONFIG||{};
const BASE=String(C.backendUrl||'').replace(/\/$/,'');
const TOKEN_KEY='gz_d1_admin_token';
const USER_KEY='gz_d1_admin_user';

const read=k=>{try{return localStorage.getItem(k)||sessionStorage.getItem(k)||''}catch{return''}};
const write=(k,v)=>{try{if(v){localStorage.setItem(k,v);sessionStorage.setItem(k,v)}else{localStorage.removeItem(k);sessionStorage.removeItem(k)}}catch{}};
const userRead=()=>{try{return JSON.parse(read(USER_KEY)||'null')}catch{return null}};
const userWrite=v=>write(USER_KEY,v?JSON.stringify(v):'');

async function parse(r){
 const b=await r.json().catch(()=>null);
 if(!r.ok){
   const e=new Error(String(b?.error||b?.message||'GrabZone API request failed.'));
   e.status=r.status;e.body=b;throw e;
 }
 return b;
}
let authRefreshPromise=null;
async function refreshSession(){
 if(authRefreshPromise)return authRefreshPromise;
 authRefreshPromise=(async()=>{
  const current=read(TOKEN_KEY);
  const headers={Accept:'application/json'};
  if(current)headers.Authorization='Bearer '+current;
  try{
   const response=await fetch(BASE+'/api/admin-auth',{
    method:'GET',
    headers,
    credentials:'include',
    cache:'no-store'
   });
   const session=await response.json().catch(()=>null);
   if(response.ok&&session?.authenticated&&session?.session_token){
    write(TOKEN_KEY,session.session_token);
    userWrite(session.user||null);
    return session;
   }
  }catch{}
  write(TOKEN_KEY,'');
  userWrite(null);
  return null;
 })().finally(()=>{authRefreshPromise=null});
 return authRefreshPromise;
}
async function api(path,options={},includeToken=true,retryAuth=true){
 const h={'Content-Type':'application/json','Accept':'application/json',...(options.headers||{})};
 const token=includeToken?read(TOKEN_KEY):'';
 if(token){
  if(!h.Authorization)h.Authorization='Bearer '+token;
  h['X-GrabZone-Token']=token;
 }
 const response=await fetch(BASE+path,{...options,headers:h,credentials:'include',cache:'no-store'});
 if(response.status===401&&includeToken&&retryAuth&&path!=='/api/admin-auth'){
  const session=await refreshSession();
  if(session?.authenticated&&session?.session_token){
   return api(path,options,true,false);
  }
 }
 return parse(response);
}
async function authFetch(url,options={}){
 const make=()=>{
  const h=new Headers(options.headers||{});
  const token=read(TOKEN_KEY);
  if(token&&!h.has('Authorization'))h.set('Authorization','Bearer '+token);
  if(token&&!h.has('X-GrabZone-Token'))h.set('X-GrabZone-Token',token);
  return fetch(url,{...options,headers:h,credentials:'include',cache:'no-store'});
 };
 let response=await make();
 if(response.status===401){
  const session=await refreshSession();
  if(session?.authenticated&&session?.session_token)response=await make();
 }
 return response;
}
async function d1(payload){
 return api('/api/d1',{method:'POST',body:JSON.stringify(payload)});
}

function builder(table){
 const s={table,action:'select',columns:'*',filters:[],orders:[],limit:null,single:null,values:null,returning:false,conflict:null};
 const a={
  select(c='*',o={}){s.columns=c||'*';s.returning=!!o?.returning;return a},
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
 async function execute(){
  try{
   const out=await d1(s);
   return {data:out?.data??null,error:null,count:out?.count??null};
  }catch(e){return {data:null,error:{message:e.message,status:e.status}}}
 }
 return a;
}

const auth={
 async signInWithPassword({email,password}){
  try{
   const b=await api('/api/admin-auth',{method:'POST',body:JSON.stringify({email:String(email||'').trim(),password:String(password||'')})},false);
   if(!b?.ok||!b.session_token)throw new Error(b?.error||'Invalid email or password.');
   write(TOKEN_KEY,b.session_token);userWrite(b.user||null);
   return {data:{user:b.user||null,session:{access_token:b.session_token,user:b.user||null}},error:null};
  }catch(e){
   write(TOKEN_KEY,'');userWrite(null);
   return {data:{user:null,session:null},error:{message:e.message,status:e.status}};
  }
 },
 async getSession(){
  try{
   const b=await api('/api/admin-auth',{method:'GET'},false);
   if(!b?.authenticated||!b.session_token){
    write(TOKEN_KEY,'');userWrite(null);
    return {data:{session:null},error:null};
   }
   write(TOKEN_KEY,b.session_token);userWrite(b.user||null);
   return {data:{session:{access_token:b.session_token,user:b.user||null}},error:null};
  }catch(e){
   write(TOKEN_KEY,'');userWrite(null);
   return {data:{session:null},error:null};
  }
 },
 async signOut(){
  try{await api('/api/admin-auth',{method:'POST',body:JSON.stringify({action:'logout'})},false)}catch{}
  write(TOKEN_KEY,'');userWrite(null);
  return {error:null};
 }
};

window.gzAuthFetch=authFetch;
window.grabzoneD1={from:builder,rpc:async(fn,args={})=>{
 try{return {data:(await d1({type:'rpc',fn,args}))?.data??null,error:null}}
 catch(e){return {data:null,error:{message:e.message,status:e.status}}}
},auth};
window.getToken=()=>read(TOKEN_KEY);
})();