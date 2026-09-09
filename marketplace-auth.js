(()=>{
  const originalFetch=window.fetch.bind(window);
  const token=()=>{try{return window.getToken?.()||localStorage.getItem('gz_d1_admin_token')||sessionStorage.getItem('gz_d1_admin_token')||''}catch{return''}};
  const sameOriginAuth=async()=>{
    try{
      const t=token();
      const headers={Accept:'application/json'};
      if(t)headers.Authorization='Bearer '+t;
      if(t)headers['X-GrabZone-Token']=t;
      const r=await originalFetch('/api/admin-auth',{method:'GET',headers,credentials:'include',cache:'no-store'});
      const d=await r.json().catch(()=>null);
      if(d?.authenticated&&d?.session_token){
        try{localStorage.setItem('gz_d1_admin_token',d.session_token);sessionStorage.setItem('gz_d1_admin_token',d.session_token)}catch{}
        return true;
      }
    }catch{}
    return false;
  };
  const ready=sameOriginAuth();
  window.marketplaceAdminReady=ready;
  window.fetch=async(input,init={})=>{
    let url='';
    try{url=typeof input==='string'?input:input?.url||''}catch{}
    let path='';
    try{path=new URL(url,location.href).pathname}catch{}
    const isApi=path.startsWith('/api/');
    if(!isApi)return originalFetch(input,init);
    if(path!=='/api/admin-auth')await ready;
    const t=token();
    if(!t)return originalFetch(input,{...init,credentials:init.credentials||'include'});
    const headers=new Headers(init.headers||(input instanceof Request?input.headers:undefined));
    if(!headers.has('Authorization'))headers.set('Authorization','Bearer '+t);
    if(!headers.has('X-GrabZone-Token'))headers.set('X-GrabZone-Token',t);
    return originalFetch(input,{...init,headers,credentials:init.credentials||'include',cache:'no-store'});
  };
})();
