(()=>{
  const originalFetch=window.fetch.bind(window);
  const token=()=>{try{return window.getToken?.()||localStorage.getItem('gz_d1_admin_token')||sessionStorage.getItem('gz_d1_admin_token')||''}catch{return''}};
  const ready=(async()=>{try{if(window.grabzoneD1?.auth?.getSession){const r=await window.grabzoneD1.auth.getSession();if(!r?.data?.session){location.href='/admin.html';return false}}return true}catch{return true}})();
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
    if(!t)return originalFetch(input,init);
    const headers=new Headers(init.headers||(input instanceof Request?input.headers:undefined));
    if(!headers.has('Authorization'))headers.set('Authorization','Bearer '+t);
    if(!headers.has('X-GrabZone-Token'))headers.set('X-GrabZone-Token',t);
    return originalFetch(input,{...init,headers,credentials:init.credentials||'include'});
  };
})();
