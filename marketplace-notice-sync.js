(()=>{
'use strict';
if(!/^\/marketplace(?:\.html)?\/?$/.test(location.pathname))return;
if(window.__GZ_MARKETPLACE_NOTICE__)return;
window.__GZ_MARKETPLACE_NOTICE__=true;
const esc=v=>String(v??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[m]));
async function sync(){
 const bar=document.querySelector('.mp-notice');
 if(!bar)return false;
 try{
  const r=await fetch('/api/marketplace/notices?ts='+Date.now(),{cache:'no-store',credentials:'include'});
  const b=await r.json().catch(()=>null);
  if(!r.ok)throw Error(b?.error||('Notice request failed: '+r.status));
  const notices=Array.isArray(b?.notices)?b.notices:[];
  const show=b?.show_notice!==false;
  if(!show||!notices.length){bar.style.display='none';return true}
  let style=document.getElementById('gzMarketplaceNoticeStyle');
  if(!style){style=document.createElement('style');style.id='gzMarketplaceNoticeStyle';style.textContent=`.mp-notice{display:flex!important;align-items:center!important;height:40px!important;background:#11151a!important;color:#fff!important;overflow:hidden!important;white-space:nowrap!important}.mp-notice>.gz-mp-label{height:40px!important;display:flex!important;align-items:center!important;justify-content:center!important;flex:0 0 auto!important;padding:0 22px!important;background:#ff650b!important;color:#fff!important;font-size:9px!important;letter-spacing:.12em!important}.gz-mp-viewport{position:relative!important;flex:1 1 auto!important;min-width:0!important;height:40px!important;overflow:hidden!important;white-space:nowrap!important}.gz-mp-moving{position:absolute!important;left:0!important;top:0!important;display:inline-flex!important;align-items:center!important;width:max-content!important;min-width:max-content!important;height:40px!important;white-space:nowrap!important;will-change:transform!important}.gz-mp-item{display:inline-flex!important;align-items:center!important;flex:0 0 auto!important;width:max-content!important;min-width:max-content!important;margin-right:100px!important;padding:0!important;color:#e4e4e4!important;font-size:11px!important;line-height:1!important;white-space:nowrap!important}.gz-mp-item strong{display:inline-block!important;margin-right:12px!important;color:#fff!important;font-size:11px!important;font-weight:900!important;white-space:nowrap!important}.gz-mp-item span{display:inline-block!important;margin:0!important;padding:0!important;color:#e4e4e4!important;font-size:11px!important;white-space:nowrap!important}@media(max-width:700px){.mp-notice{height:40px!important}.mp-notice>.gz-mp-label{height:40px!important;padding:0 17px!important}.gz-mp-viewport,.gz-mp-moving{height:40px!important}.gz-mp-item{margin-right:60px!important;font-size:10px!important}.gz-mp-item strong,.gz-mp-item span{font-size:10px!important}}`;document.head.appendChild(style)}
  bar.style.display='flex';
  bar.innerHTML='<b class="gz-mp-label">NOTICE</b><div class="gz-mp-viewport"><div class="gz-mp-moving">'+notices.map(n=>'<span class="gz-mp-item"><strong>'+esc(n.title)+'</strong><span>'+esc(n.message)+'</span></span>').join('')+'</div></div>';
  const viewport=bar.querySelector('.gz-mp-viewport'),moving=bar.querySelector('.gz-mp-moving');
  if(!viewport||!moving)return true;
  requestAnimationFrame(()=>{const w=viewport.clientWidth,c=moving.scrollWidth;if(!w||!c)return;const sx=w,ex=-c;moving.style.transform=`translate3d(${sx}px,0,0)`;moving.animate([{transform:`translate3d(${sx}px,0,0)`},{transform:`translate3d(${ex}px,0,0)`}],{duration:Math.max(12000,((w+c)/150)*1000),iterations:Infinity,easing:'linear'})});
  return true;
 }catch(e){console.warn('GrabZone marketplace notice:',e);return false}
}
function boot(){let tries=0;const tick=()=>{if(sync()||++tries>120)return;setTimeout(tick,100)};tick();setInterval(sync,30000)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();