(()=>{
'use strict';
if(window.__GZ_NOTICE_SYNC__)return;
window.__GZ_NOTICE_SYNC__=true;
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
async function getState(){
  const r=await fetch('/api/marketplace/notices?ts='+Date.now(),{cache:'no-store',credentials:'include'});
  const b=await r.json().catch(()=>null);
  if(!r.ok)throw Error(String(b?.error||b?.message||('Notice request failed: '+r.status)));
  return {notices:Array.isArray(b?.notices)?b.notices:[],show:b?.show_notice!==false};
}
function stopAnimation(){try{window.__grabzoneNoticeAnimation?.cancel()}catch{}window.__grabzoneNoticeAnimation=null}
function animate(track,moving){
  stopAnimation();
  const start=track.clientWidth,width=moving.scrollWidth,end=-width,distance=start-end,speed=window.innerWidth<=600?130:165,duration=Math.max(3000,(distance/speed)*1000);
  moving.style.transform=`translate3d(${start}px,0,0)`;
  const a=moving.animate([{transform:`translate3d(${start}px,0,0)`},{transform:`translate3d(${end}px,0,0)`}],{duration,iterations:1,easing:'linear',fill:'forwards'});
  window.__grabzoneNoticeAnimation=a;
  a.onfinish=()=>{if(window.__grabzoneNoticeAnimation===a)animate(track,moving)};
}
function renderMain(notices,show){
  const track=document.getElementById('noticeTrack');
  const section=document.getElementById('noticeSection');
  if(!track)return false;
  if(!show||!notices.length){stopAnimation();track.innerHTML='';if(section)section.style.display='none';return true}
  if(section)section.style.display='flex';
  track.style.overflow='hidden';
  track.innerHTML=`<div id="gzNoticeMoving">${notices.map(n=>`<span class="gzNoticeItem"><b>${esc(n.title)}</b><span class="gzNoticeMessage">${esc(n.message)}</span></span>`).join('')}</div>`;
  const moving=track.querySelector('#gzNoticeMoving');
  moving.style.cssText='display:inline-flex;align-items:center;width:max-content;white-space:nowrap';
  requestAnimationFrame(()=>animate(track,moving));
  return true;
}
function renderMarketplace(notices,show){
  const bar=document.querySelector('.mp-notice');
  if(!bar)return false;
  if(!show||!notices.length){stopAnimation();bar.style.display='none';return true}
  bar.style.display='flex';
  bar.innerHTML=`<b>NOTICE</b><div class="gzMpNoticeViewport"><div class="gzMpNoticeMoving">${notices.map(n=>`<span class="gzNoticeItem"><b>${esc(n.title)}</b><span class="gzNoticeMessage">${esc(n.message)}</span></span>`).join('')}</div></div>`;
  const viewport=bar.querySelector('.gzMpNoticeViewport'),moving=bar.querySelector('.gzMpNoticeMoving');
  viewport.style.cssText='min-width:0;flex:1;height:100%;overflow:hidden;position:relative;display:flex;align-items:center';
  moving.style.cssText='position:absolute;left:0;top:0;height:100%;display:inline-flex;align-items:center;width:max-content;white-space:nowrap;gap:34px';
  requestAnimationFrame(()=>animate(viewport,moving));
  return true;
}
async function sync(){
  try{const state=await getState();renderMain(state.notices,state.show);renderMarketplace(state.notices,state.show)}catch(e){console.warn('GrabZone notice sync:',e)}
}
function boot(){
  sync();
  setInterval(sync,30000);
  new MutationObserver(()=>{
    if(document.querySelector('.mp-notice')&&!document.querySelector('.gzMpNoticeViewport'))sync();
  }).observe(document.documentElement,{childList:true,subtree:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();