(()=>{
'use strict';
if(window.__GZ_NOTICE_SYNC__)return;
window.__GZ_NOTICE_SYNC__=true;
const esc=v=>String(v??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[m]));
const STYLE=`
/* Shared Admin notice system: one data source, one visual system. */
#noticeSection{display:flex;align-items:stretch;width:100%;height:44px;min-height:44px;background:#10151b;color:#fff;overflow:hidden!important;position:relative;z-index:20}
#noticeSection .gzNoticeLabel{display:flex;align-items:center;justify-content:center;flex:0 0 101px;background:#ff650b;color:#fff;font-size:10px;font-weight:900;letter-spacing:.12em;line-height:1}
#noticeSection #noticeTrack{position:relative!important;flex:1 1 auto!important;min-width:0!important;height:100%!important;display:block!important;overflow:hidden!important;white-space:nowrap!important}
#noticeSection #gzNoticeMoving,.mp-notice .gzMpNoticeMoving{position:absolute!important;left:0!important;top:50%!important;display:inline-flex!important;align-items:center!important;width:max-content!important;min-width:max-content!important;height:auto!important;margin:0!important;padding:0!important;white-space:nowrap!important;gap:0!important;line-height:1!important;will-change:transform!important}
.gzNoticeItem{display:inline-flex!important;align-items:center!important;flex:0 0 auto!important;width:max-content!important;min-width:max-content!important;margin:0 90px 0 0!important;padding:0!important;white-space:nowrap!important;font-size:13px!important;font-weight:500!important;line-height:1!important;color:#fff!important}
.gzNoticeItem>b{display:inline!important;height:auto!important;width:auto!important;min-width:0!important;margin:0 14px 0 0!important;padding:0!important;background:transparent!important;color:inherit!important;font-size:inherit!important;font-weight:900!important;letter-spacing:0!important;line-height:1!important}
.gzNoticeMessage{display:inline!important;height:auto!important;width:auto!important;min-width:0!important;margin:0!important;padding:0!important;background:transparent!important;color:inherit!important;font-size:inherit!important;font-weight:500!important;line-height:1!important;white-space:nowrap!important}
.mp-notice{display:flex!important;align-items:center!important;overflow:hidden!important}
.mp-notice>.gzMpNoticeViewport{position:relative!important;flex:1 1 auto!important;min-width:0!important;height:100%!important;overflow:hidden!important;display:block!important}
.mp-notice>.gzMpNoticeViewport>.gzMpNoticeMoving{top:50%!important;align-items:center!important}
/* Keep Marketplace's existing bar dimensions/typography; only provide the moving viewport. */
.mp-notice>.gzMpNoticeViewport .gzNoticeItem{color:#e4e4e4!important;margin-right:70px!important;font-size:12px!important}
.mp-notice>.gzMpNoticeViewport .gzNoticeItem>b{background:transparent!important;color:#fff!important;height:auto!important;padding:0!important;margin-right:12px!important;font-size:12px!important}
.mp-notice>.gzMpNoticeViewport .gzNoticeMessage{padding:0!important;color:#e4e4e4!important;font-size:12px!important}
.mp-notice> b:first-child{height:100%!important;display:flex!important;align-items:center!important;justify-content:center!important;flex:0 0 auto!important;background:#ff650b!important;color:#fff!important;padding:0 28px!important;font-size:10px!important;letter-spacing:.12em!important;line-height:1!important}
@media(max-width:760px){#noticeSection{height:42px;min-height:42px}#noticeSection .gzNoticeLabel{flex-basis:74px;font-size:9px}.gzNoticeItem{font-size:12px!important;margin-right:60px!important}}
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
function ensureMainMarkup(){
  let section=document.getElementById('noticeSection');
  if(!section){
    section=document.createElement('section');
    section.id='noticeSection';
    section.setAttribute('aria-label','GrabZone notices');
    const header=document.querySelector('header.header,.header,header');
    if(header&&header.parentNode)header.parentNode.insertBefore(section,header.nextSibling);
    else if(document.body.firstElementChild)document.body.insertBefore(section,document.body.firstElementChild.nextSibling);
    else document.body.appendChild(section);
  }
  let track=document.getElementById('noticeTrack');
  if(!track){
    section.innerHTML='<div class="gzNoticeLabel">NOTICE</div><div id="noticeTrack"></div>';
    track=document.getElementById('noticeTrack');
  }else if(!section.querySelector('.gzNoticeLabel')){
    const label=document.createElement('div');
    label.className='gzNoticeLabel';
    label.textContent='NOTICE';
    section.insertBefore(label,track);
  }
  return {section,track};
}
function renderMain(notices,show){
  const {section,track}=ensureMainMarkup();
  if(!show||!notices.length){stopAnimation();track.innerHTML='';track.setAttribute('data-gz-notice-sync','empty');section.style.display='none';return true}
  section.style.display='flex';
  track.setAttribute('data-gz-notice-sync','active');
  track.innerHTML=`<div id="gzNoticeMoving">${build(notices)}</div>`;
  const moving=document.getElementById('gzNoticeMoving');
  requestAnimationFrame(()=>startAnimation(track,moving));
  return true;
}
function renderMarketplace(notices,show){
  const bar=document.querySelector('.mp-notice');
  if(!bar)return false;
  /* Marketplace already owns its single notice container. Never create a second one. */
  const duplicate=document.getElementById('noticeSection');
  if(duplicate)duplicate.remove();
  if(!show||!notices.length){stopAnimation();bar.style.display='none';return true}
  bar.style.display='flex';
  bar.innerHTML=`<b>NOTICE</b><div class="gzMpNoticeViewport"><div class="gzMpNoticeMoving">${build(notices)}</div></div>`;
  const viewport=bar.querySelector('.gzMpNoticeViewport'),moving=bar.querySelector('.gzMpNoticeMoving');
  requestAnimationFrame(()=>startAnimation(viewport,moving));
  return true;
}
async function sync(){
  try{
    const state=await getState();
    if(document.querySelector('.mp-notice'))renderMarketplace(state.notices,state.show);
    else renderMain(state.notices,state.show);
  }catch(e){console.warn('GrabZone notice sync:',e)}
}
function boot(){
  installStyle();
  sync();
  setInterval(sync,30000);
  const mo=new MutationObserver(()=>{
    const isMarketplace=!!document.querySelector('.mp-notice');
    if(isMarketplace){
      if(!document.querySelector('.mp-notice>.gzMpNoticeViewport'))sync();
    }else if(!document.getElementById('noticeTrack'))sync();
  });
  mo.observe(document.documentElement,{childList:true,subtree:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();