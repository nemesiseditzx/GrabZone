(()=>{
  const originalFetch=window.fetch.bind(window);
  const token=()=>{try{return window.getToken?.()||localStorage.getItem('gz_d1_admin_token')||sessionStorage.getItem('gz_d1_admin_token')||''}catch{return''}};
  window.fetch=(input,init={})=>{
    let url='';
    try{url=typeof input==='string'?input:input?.url||''}catch{}
    let isApi=false;
    try{isApi=new URL(url,location.href).pathname.startsWith('/api/')}catch{}
    if(!isApi)return originalFetch(input,init);
    const t=token();
    if(!t)return originalFetch(input,init);
    const headers=new Headers(init.headers||(input instanceof Request?input.headers:undefined));
    if(!headers.has('Authorization'))headers.set('Authorization','Bearer '+t);
    if(!headers.has('X-GrabZone-Token'))headers.set('X-GrabZone-Token',t);
    return originalFetch(input,{...init,headers,credentials:init.credentials||'include'});
  };
})();
