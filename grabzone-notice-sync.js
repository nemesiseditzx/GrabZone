(()=>{
'use strict';
if(window.__GZ_NOTICE_SYNC__)return;
window.__GZ_NOTICE_SYNC__=true;
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
async function getNotices(){
  const r=await fetch('/api/marketplace/brands?notice_sync=1',{cache:'no-store',credentials:'include'});
  if(!r.ok)throw Error('Notice request failed: '+r.status);
  const d=await r.json();
  return Array.isArray(d.notices)?d.notices:[];
}
function animate(track,moving){
  try{window.__grabzoneNoticeAnimation?.cancel()}catch{}
  const start=track.clientWidth;
  const width=moving.scrollWidth;
  const end=-width;
  const distance=start-end;
  const speed=window.innerWidth<=600?130:165;
  const duration=Math.max(3000,(distance/speed)*1000);
  moving.style.transform=`translate3d(${start}px,0,0)`;
  const a=moving.animate([{transform:`translate3d(${start}px,0,0)`},{transform:`translate3d(${end}px,0,0)`}],{duration,iterations:1,easing:'linear',fill:'forwards'});
  window.__grabzoneNoticeAnimation=a;
  a.onfinish=()=>{if(window.__grabzoneNoticeAnimation===a)animate(track,moving)};
}
function renderMain(notices){
  const track=document.getElementById('noticeTrack');
  if(!track)return false;
  track.style.overflow='hidden';
  track.innerHTML=notices.length?`<div id="gzNoticeMoving">${notices.map(n=>`<span class="gzNoticeItem"><b>${esc(n.title)}</b><span class="gzNoticeMessage">${esc(n.message)}</span></span>`).join('')}</div>`:'';
  if(!notices.length)return true;
  const moving=track.querySelector('#gzNoticeMoving');
  moving.style.display='inline-flex';moving.style.alignItems='center';moving.style.width='max-content';moving.style.whiteSpace='nowrap';
  requestAnimationFrame(()=>animate(track,moving));
  return true;
}
function renderMarketplace(notices){
  const bar=document.querySelector('.mp-notice');
  if(!bar)return false;
  if(!notices.length){bar.style.display='none';return true;}
  bar.style.display='flex';
  bar.innerHTML=`<b>NOTICE</b><div class="gzMpNoticeViewport"><div class="gzMpNoticeMoving">${notices.map(n=>`<span class="gzNoticeItem"><b>${esc(n.title)}</b><span class="gzNoticeMessage">${esc(n.message)}</span></span>`).join('')}</div></div>`;
  const viewport=bar.querySelector('.gzMpNoticeViewport'),moving=bar.querySelector('.gzMpNoticeMoving');
  viewport.style.cssText='min-width:0;flex:1;height:100%;overflow:hidden;position:relative;display:flex;align-items:center';
  moving.style.cssText='position:absolute;left:0;top:0;height:100%;display:inline-flex;align-items:center;width:max-content;white-space:nowrap;gap:34px';
  requestAnimationFrame(()=>animate(viewport,moving));
  return true;
}
async function sync(){
  try{
    const notices=await getNotices();
    renderMain(notices);
    renderMarketplace(notices);
  }catch(e){console.warn('GrabZone notice sync:',e)}
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