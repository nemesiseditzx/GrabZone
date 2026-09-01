(() => {
  'use strict';

  const publicRpc = new Set(['validate_referral_code','create_public_order','track_public_order']);
  const adminTokenKey='grabzone_admin_session_token';
  const getAdminToken=()=>{try{return sessionStorage.getItem(adminTokenKey)||'';}catch{return ''}};

  function cleanColumns(columns) {
    return String(columns || '*').trim() || '*';
  }

  class D1Query {
    constructor(client, table) {
      this.client = client; this.table = table; this.action = 'select';
      this.columns = '*'; this.filters = []; this.orders = [];
      this.limitValue = null; this.values = null; this.returning = false;
      this.conflict = null; this.singleMode = null;
    }
    select(columns='*') { this.columns = cleanColumns(columns); this.returning = true; return this; }
    insert(values) { this.action='insert'; this.values=Array.isArray(values)?values:[values]; return this; }
    upsert(values, options={}) { this.action='upsert'; this.values=Array.isArray(values)?values:[values]; this.conflict=options.onConflict||null; return this; }
    update(values) { this.action='update'; this.values=values||{}; return this; }
    delete() { this.action='delete'; return this; }
    eq(column,value) { this.filters.push({column,op:'eq',value}); return this; }
    neq(column,value) { this.filters.push({column,op:'neq',value}); return this; }
    gt(column,value) { this.filters.push({column,op:'gt',value}); return this; }
    gte(column,value) { this.filters.push({column,op:'gte',value}); return this; }
    lt(column,value) { this.filters.push({column,op:'lt',value}); return this; }
    lte(column,value) { this.filters.push({column,op:'lte',value}); return this; }
    is(column,value) { this.filters.push({column,op:'is',value}); return this; }
    in(column,value) { this.filters.push({column,op:'in',value}); return this; }
    order(column, options={}) { this.orders.push({column,ascending:options.ascending!==false}); return this; }
    limit(value) { this.limitValue=Math.max(0,Number(value)||0); return this; }
    single() { this.singleMode='single'; return this; }
    maybeSingle() { this.singleMode='maybe'; return this; }
    then(resolve,reject) { return this.execute().then(resolve,reject); }
    catch(reject) { return this.execute().catch(reject); }
    finally(fn) { return this.execute().finally(fn); }
    async execute() {
      try {
        const data = await this.client.__d1Request({
          type:'table', table:this.table, action:this.action, columns:this.columns,
          filters:this.filters, orders:this.orders, limit:this.limitValue,
          values:this.values, returning:this.returning, conflict:this.conflict, single:this.singleMode
        });
        return data;
      } catch (error) {
        return {data:null,error:{message:error.message||String(error)}};
      }
    }
  }

  function createAdminAuth(){
    const authKey='grabzone_admin_auth';
    async function getSession(){
      try{
        const headers={};
        const token=getAdminToken();
        if(token)headers.Authorization='Bearer '+token;
        const response=await fetch('/api/admin-auth',{method:'GET',credentials:'same-origin',headers});
        const body=await response.json().catch(()=>({}));
        if(body.session_token)try{sessionStorage.setItem(adminTokenKey,body.session_token)}catch{}
        if(!response.ok||!body.authenticated)return {data:{session:null}};
        return {
          data:{
            session:{
              access_token:'cookie',
              user:body.user,
              expires_at:null
            }
          }
        };
      }catch(e){
        return {data:{session:null}};
      }
    }

    return {
      async signInWithPassword({email,password}){
        const response=await fetch('/api/admin-auth',{
          method:'POST',
          credentials:'same-origin',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({action:'login',email,password})
        });
        const body=await response.json().catch(()=>({}));
        if(!response.ok)return {data:{user:null,session:null},error:{message:body.error||'Authentication failed.'}};
        localStorage.setItem(authKey,'1');
        if(body.session_token)sessionStorage.setItem(adminTokenKey,body.session_token);
        return {
          data:{
            user:body.user||null,
            session:{access_token:'',user:body.user||null,expires_at:null}
          },
          error:null
        };
      },

      async signOut(){
        try{
          await fetch('/api/admin-auth',{
            method:'POST',
            credentials:'same-origin',
            headers:{'Content-Type':'application/json'},
            body:JSON.stringify({action:'logout'})
          });
        }finally{
          localStorage.removeItem(authKey);
          sessionStorage.removeItem(adminTokenKey);
        }
        return {error:null};
      },

      async getSession(){ return getSession(); },

      onAuthStateChange(callback){
        return {data:{subscription:{unsubscribe(){}}}};
      }
    };
  }

  function createWrappedClient(url, anonKey, options) {
    const client = {
      auth: createAdminAuth(),
      __d1Request: async payload => {
        const response = await fetch('/api/d1', {
          method:'POST',
          credentials:'include',
          cache:'no-store',
          headers:{'Content-Type':'application/json',...(getAdminToken()?{Authorization:'Bearer '+getAdminToken()}: {})},
          body:JSON.stringify(payload)
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.error || `Database request failed (${response.status})`);
        return {data:body.data??null,error:null,count:body.count??null};
      },
      from(table) { return new D1Query(client, table); },
      rpc(fn,args={}) {
        return client.__d1Request({type:'rpc',fn,args});
      }
    };
    return client;
  }

  // D1-backed compatibility client. No Supabase network access is used.
  window.supabase = {createClient:createWrappedClient};
})();