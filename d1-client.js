 const a={select(c='*',o={}){s.columns=c||'*';if(s.action!=='select'||o?.returning)s.returning=true;return a},eq(c,v){s.filters.push({column:c,op:'eq',value:v});return a},neq(c,v){s.filters.push({column:c,op:'neq',value:v});return a},gt(c,v){s.filters.push({column:c,op:'gt',value:v});return a},gte(c,v){s.filters.push({column:c,op:'gte',value:v});return a},lt(c,v){s.filters.push({column:c,op:'lt',value:v});return a},lte(c,v){s.filters.push({column:c,op:'lte',value:v});return a},is(c,v){s.filters.push({column:c,op:'is',value:v});return a},in(c,v){s.filters.push({column:c,op:'in',value:v});return a},order(c,o={}){s.orders.push({column:c,ascending:o?.ascending!==false});return a},limit(n){s.limit=Number(n);return a},maybeSingle(){s.single='maybe';return execute()},single(){s.single='single';return execute()},insert(v,o={}){s.action='insert';s.values=v;s.returning=!!o?.returning;return a},upsert(v,o={}){s.action='upsert';s.values=v;s.returning=true;s.conflict=o?.onConflict||null;return a},update(v){s.action='update';s.values=v;return a},delete(){s.action='delete';return a},then(res,rej){return execute().then(res,rej)}};
 async function execute(){return request({type:'table',table:s.table,action:s.action,columns:s.columns,filters:s.filters,orders:s.orders,limit:s.limit,single:s.single,values:s.values,returning:s.returning,conflict:s.conflict})}
 return a
}
window.grabzoneD1={from:builder,rpc:(fn,args={})=>request({type:'rpc',fn,args}),auth:{
 async signInWithPassword({email,password}){try{const r=await fetch(apiPath('/api/admin-auth'),{method:'POST',headers:{'Content-Type':'application/json'},credentials:'omit',cache:'no-store',headers:{'Content-Type':'application/json','Cache-Control':'no-cache'},body:JSON.stringify({action:'login',email,password})}),b=await r.json().catch(()=>({}));if(!r.ok||!b.ok)return{data:{user:null,session:null},error:{message:b.error||'Invalid email or password.',status:r.status}};setToken(b.session_token||'');return{data:{user:b.user||null,session:b.session_token?{access_token:b.session_token,user:b.user||null,expires_at:b.expires_at}:null},error:null}}catch(e){return{data:{user:null,session:null},error:{message:e.message||'Authentication failed.'}}}},
 async getSession(){
 try{
  const existing=getToken();
  const headers={'Cache-Control':'no-cache'}; if(existing)headers.Authorization='Bearer '+existing;
  const r=await fetch(apiPath('/api/admin-auth'),{method:'GET',credentials:'omit',cache:'no-store',headers});
  const b=await r.json().catch(()=>({}));
  const bridge=(r.ok&&b.authenticated&&b.session_token)?b.session_token:existing;
  if(bridge){
   setToken(bridge);
   return{data:{session:{access_token:bridge,user:b.user||null,expires_at:b.expires_at||null}},error:null};
  }
  return{data:{session:null},error:null};
 }catch(e){
  const existing=getToken();
  if(existing)return{data:{session:{access_token:existing,user:null,expires_at:null}},error:null};
  return{data:{session:null},error:{message:e.message||'Authentication check failed.'}};
 }
},