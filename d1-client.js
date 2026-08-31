(() => {
  'use strict';

  const nativeSupabase = window.supabase;
  if (!nativeSupabase || typeof nativeSupabase.createClient !== 'function') return;

  const nativeCreateClient = nativeSupabase.createClient.bind(nativeSupabase);
  const publicRpc = new Set(['validate_referral_code','create_public_order','track_public_order']);

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

  function createWrappedClient(url, anonKey, options) {
    const authClient = nativeCreateClient(url, anonKey, options);
    const client = {
      auth: authClient.auth,
      __d1Request: async payload => {
        const session = await authClient.auth.getSession().catch(() => ({data:{session:null}}));
        const token = session?.data?.session?.access_token || '';
        const response = await fetch('/api/d1', {
          method:'POST',
          headers:{'Content-Type':'application/json', ...(token ? {Authorization:`Bearer ${token}`} : {})},
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

  window.supabase = {...nativeSupabase, createClient:createWrappedClient};
})();