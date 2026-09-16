(()=>{
'use strict';
if(window.__GZ_NOTICE_SYNC__)return;
window.__GZ_NOTICE_SYNC__=true;
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const STYLE=`
/* Shared Admin notice system: one data source, one visual system. */
#noticeSection{overflow:hidden!important}
#noticeSection #noticeTrack{position:relative!important;display:block!important;overflow:hidden!important;min-width:0!important;height:100%!important;white-space:nowrap!important}
#noticeSection #gzNoticeMoving,.mp-notice .gzMpNoticeMoving{position:absolute!important;left:0!important;top:50%!important;display:inline-flex!important;align-items:center!important;width:max-content!important;min-width:max-content!important;height:auto!important;margin:0!important;padding:0!important;white-space:nowrap!important;gap:0!important;line-height:1!important;will-change:transform!important}
.gzNoticeItem{display:inline-flex!important;align-items:center!important;flex:0 0 auto!important;width:max-content!important;min-width:max-content!important;margin:0 90px 0 0!important;padding:0!important;white-space:nowrap!important;font-size:13px!important;font-weight:500!important;line-height:1!important;color:#fff!important}
.gzNoticeItem>b{display:inline!important;height:auto!important;width:auto!important;min-width:0!important;margin:0 14px 0 0!important;padding:0!important;background:transparent!important;color:inherit!important;font-size:inherit!important;font-weight:900!important;letter-spacing:0!important;line-height:1!important}
.gzNoticeMessage{display:inline!important;height:auto!important;width:auto!important;min-width:0!important;margin:0!important;padding:0!important;background:transparent!important;color:inherit!important;font-size:inherit!important;font-weight:500!important;line-height:1!important;white-space:nowrap!important}
.mp-notice{display:flex!important;align-items:center!important;overflow:hidden!important}
.mp-notice>.gzMpNoticeViewport{position:relative!important;flex:1 1 auto!important;min-width:0!important;height:100%!important;overflow:hidden!important;display:block!important}
.mp-notice>.gzMpNoticeViewport>.gzMpNoticeMoving{top:50%!important;align-items:center!important}
.mp-notice>.gzMpNoticeViewport .gzNoticeItem{color:#e4e4e4!important;margin-right:70px!important;font-size:12px!important}
.mp-notice>.gzMpNoticeViewport .gzNoticeItem>b{background:transparent!important;color:#fff!important;height:auto!important;padding:0!important;margin-right:12px!important;font-size:12px!important}
.mp-notice>.gzMpNoticeViewport .gzNoticeMessage{padding:0!important;color:#e4e4e4!important;font-size:12px!important}
.mp-notice> b:first-child{height:100%!important;display:flex!important;align-items:center!important;justify-content:center!important;flex:0 0 auto!important;background:#ff650b!important;color:#fff!important;padding:0 28px!important;font-size:10px!important;letter-spacing:.12em!important;line-height:1!important}
@keyframes gzSharedNoticeMarquee{from{transform:translate3d(100vw,-50%,0)}to{transform:translate3d(calc(-100% - 100vw),-50%,0)}}
`;
function installStyle(){if(document.getElementById('gz-shared-notice-style'))return;const s=document.createElement('style');s.id='gz-shared-notice-style';s.textContent=STYLE;(document.head||document.documentElement).appendChild(s)}
async function getState(){
  const r=await fetch('/api/marketplace/notices?ts='+Date.now(),{cache:'no-store',credentials:'include'});
  const b=await r.json().catch(()=>null);
  if(!r.ok)throw Error(String(b?.error||b?.message||('Notice request failed: '+r.status)));
  return {notices:Array.isArray(b?.notices)?b.notices:[],show:b?.show_notice!==false};
}
let animation=null;
function stopAnimation(){try{animation?.cancel()}catch{}animation=null}
function startAnimation(viewport,moving){stopAnimation();if(!viewport||!moving)return;const width=Math.max(viewport.clientWidth,1);const content=Math.max(moving.scrollWidth,1);const duration=Math.max(12000,((width+content)/150)*1000);moving.style.transform=`translate3d(${width}px,-50%,0)`;animation=moving.animate([{transform:`translate3d(${width}px,-50%,0)`},{transform:`translate3d(${-content-width}px,-50%,0)`}],{duration,iterations:Infinity,easing:'linear'});}
function build(notices){return notices.map(n=>`<span class="gzNoticeItem"><b>${esc(n.title)}</b><span class="gzNoticeMessage">${esc(n.message)}</span></span>`).join('')}
function renderMain(notices,show){
  const track=document.getElementById('noticeTrack'),section=document.getElementById('noticeSection');
  if(!track)return false;
  if(!show||!notices.length){stopAnimation();track.innerHTML='';track.setAttribute('data-gz-notice-sync','empty');if(section)section.style.display='none';return true}
  if(section)section.style.display='flex';
  track.setAttribute('data-gz-notice-sync','active');
  track.innerHTML=`<div id="gzNoticeMoving">${build(notices)}</div>`;
  const moving=document.getElementById('gzNoticeMoving');
  requestAnimationFrame(()=>startAnimation(track,moving));
  return true;
}
function renderMarketplace(notices,show){
  const bar=document.querySelector('.mp-notice');
  if(!bar)return false;
  if(!show||!notices.length){stopAnimation();bar.style.display='none';return true}
  bar.style.display='flex';
  bar.innerHTML=`<b>NOTICE</b><div class="gzMpNoticeViewport"><div class="gzMpNoticeMoving">${build(notices)}</div></div>`;
  const viewport=bar.querySelector('.gzMpNoticeViewport'),moving=bar.querySelector('.gzMpNoticeMoving');
  requestAnimationFrame(()=>startAnimation(viewport,moving));
  return true;
}
async function sync(){
  try{const state=await getState();renderMain(state.notices,state.show);renderMarketplace(state.notices,state.show)}catch(e){console.warn('GrabZone notice sync:',e)}
}
function boot(){
  installStyle();
  sync();
  setInterval(sync,30000);
  const mo=new MutationObserver(()=>{
    const track=document.getElementById('noticeTrack');
    if(track&&track.getAttribute('data-gz-notice-sync')!=='active'&&track.getAttribute('data-gz-notice-sync')!=='empty')sync();
    const bar=document.querySelector('.mp-notice');
    if(bar&&!bar.querySelector('.gzMpNoticeViewport'))sync();
  });
  mo.observe(document.documentElement,{childList:true,subtree:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();