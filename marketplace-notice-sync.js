(()=>{
'use strict';
if(!/^\/marketplace(?:\.html)?\/?$/.test(location.pathname))return;
if(window.__GZ_MARKETPLACE_NOTICE__)return;
window.__GZ_MARKETPLACE_NOTICE__=true;
const esc=v=>String(v??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m]));
let animation=null,lastSignature='';
async function d1(table,columns,filters=[],orders=[],single=null){
 const r=await fetch('/api/d1',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},credentials:'include',cache:'no-store',body:JSON.stringify({type:'table',table,action:'select',columns,filters,orders,single})});
 const b=await r.json().catch(()=>null);if(!r.ok)throw Error(String(b?.error||b?.message||('D1 request failed: '+r.status)));return b?.data??null;
}
async function state(){
 const [notices,settings]=await Promise.all([
  d1('notices','id,title,message,active,sort_order,created_at',[{column:'active',op:'eq',value:true}],[{column:'sort_order',ascending:true},{column:'created_at',ascending:true}]),
  d1('site_settings','show_notice',[{column:'id',op:'eq',value:1}],[], 'maybe')
 ]);
 return {notices:Array.isArray(notices)?notices:[],show:settings?.show_notice!==false};
}
function render(s){
 const bar=document.querySelector('.mp-notice');if(!bar)return false;
 const notices=s.notices||[],sig=JSON.stringify({show:s.show,notices});if(sig===lastSignature)return true;lastSignature=sig;
 try{animation?.cancel()}catch{}animation=null;
 if(s.show===false||!notices.length){bar.style.display='none';return true}
 let st=document.getElementById('gzMarketplaceNoticeStyle');if(!st){st=document.createElement('style');st.id='gzMarketplaceNoticeStyle';st.textContent='.mp-notice{display:flex!important;align-items:center!important;overflow:hidden!important;white-space:nowrap!important}.gz-mp-viewport{position:relative!important;flex:1 1 auto!important;min-width:0!important;height:100%!important;overflow:hidden!important;white-space:nowrap!important}.gz-mp-moving{position:absolute!important;left:0!important;top:0!important;display:inline-flex!important;align-items:center!important;width:max-content!important;min-width:max-content!important;height:100%!important;white-space:nowrap!important;will-change:transform!important}.gz-mp-item{display:inline-flex!important;align-items:center!important;flex:0 0 auto!important;width:max-content!important;min-width:max-content!important;margin-right:100px!important;color:#e4e4e4!important;font-size:11px!important;white-space:nowrap!important}.gz-mp-item strong{margin-right:12px!important;color:#fff!important;font-weight:900!important}@media(max-width:700px){.gz-mp-item{margin-right:60px!important;font-size:10px!important}.gz-mp-item strong{font-size:10px!important}}';document.head.appendChild(st)}
 bar.style.display='flex';bar.innerHTML='<b class="gz-mp-label">NOTICE</b><div class="gz-mp-viewport"><div class="gz-mp-moving">'+notices.map(n=>'<span class="gz-mp-item"><strong>'+esc(n.title)+'</strong><span>'+esc(n.message)+'</span></span>').join('')+'</div></div>';
 const v=bar.querySelector('.gz-mp-viewport'),m=bar.querySelector('.gz-mp-moving');if(!v||!m)return true;
 requestAnimationFrame(()=>requestAnimationFrame(()=>{const w=v.getBoundingClientRect().width,c=m.getBoundingClientRect().width;if(!w||!c)return;const sx=w,ex=-c,d=Math.max(3000,((sx-ex)/(innerWidth<=700?130:165))*1000);m.style.transform=`translate3d(${sx}px,0,0)`;animation=m.animate([{transform:`translate3d(${sx}px,0,0)`},{transform:`translate3d(${ex}px,0,0)`}],{duration:d,iterations:Infinity,easing:'linear'})}));
 return true;
}
async function sync(){try{return render(await state())}catch(e){console.warn('GrabZone shared notice sync:',e);return false}}
function boot(){let tries=0;const tick=()=>{if(sync()||++tries>120)return;setTimeout(tick,100)};tick();setTimeout(sync,1200);setInterval(sync,30000)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();