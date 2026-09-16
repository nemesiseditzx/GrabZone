(()=>{
'use strict';
if(window.__GZ_NOTICE_SYNC__)return;
window.__GZ_NOTICE_SYNC__=true;

const esc=v=>String(v??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[m]));

async function getState(){
  const r=await fetch('/api/marketplace/notices?ts='+Date.now(),{cache:'no-store',credentials:'include'});
  const b=await r.json().catch(()=>null);
  if(!r.ok)throw Error(String(b?.error||b?.message||('Notice request failed: '+r.status)));
  return {notices:Array.isArray(b?.notices)?b.notices:[],show:b?.show_notice!==false};
}

function installMainNoticeStyle(){
  document.getElementById('gzNoticeStyle')?.remove();
  const style=document.createElement('style');
  style.id='gzNoticeStyle';
  style.textContent=`
    #noticeTrack{position:relative!important;overflow:hidden!important;width:100%!important;min-width:0!important;height:100%!important;display:block!important;white-space:nowrap!important}
    #gzNoticeMoving{position:absolute!important;top:0!important;left:0!important;display:inline-flex!important;align-items:center!important;width:max-content!important;min-width:max-content!important;height:100%!important;margin:0!important;padding:0!important;white-space:nowrap!important;animation:none!important;transition:none!important;will-change:transform!important}
    .gzNoticeItem{display:inline-flex!important;align-items:center!important;flex:0 0 auto!important;width:max-content!important;min-width:max-content!important;margin:0 100px 0 0!important;padding:0!important;white-space:nowrap!important;font-size:13px!important;line-height:1!important}
    .gzNoticeItem b{display:inline-block!important;flex:0 0 auto!important;margin:0 12px 0 0!important;padding:0!important;font-weight:900!important;white-space:nowrap!important}
    .gzNoticeMessage{display:inline-block!important;flex:0 0 auto!important;white-space:nowrap!important}
    .gzNoticeItem::before,.gzNoticeItem::after{content:none!important;display:none!important}
    @media(max-width:600px){.gzNoticeItem{margin-right:60px!important;font-size:10px!important}.gzNoticeItem b{margin-right:8px!important}}
    @media(prefers-reduced-motion:reduce){#gzNoticeMoving{animation:none!important}}
  `;
  (document.head||document.documentElement).appendChild(style);
}

function ensureMainMarkup(){
  let section=document.getElementById('noticeSection');
  if(!section){
    section=document.createElement('div');
    section.id='noticeSection';
    section.className='notice-wrap';
    const header=document.querySelector('header.header,.header,header');
    if(header?.parentNode)header.parentNode.insertBefore(section,header.nextSibling);
    else document.body.prepend(section);
  }
  let label=section.querySelector('.notice-label,.gzNoticeLabel');
  let track=document.getElementById('noticeTrack');
  if(!track||!section.contains(track)){
    section.innerHTML='<div class="notice-label" data-i18n="noticeLabel">NOTICE</div><div id="noticeTrack" class="notice-track"></div>';
    track=section.querySelector('#noticeTrack');
  }else if(!label){
    label=document.createElement('div');
    label.className='notice-label';
    label.setAttribute('data-i18n','noticeLabel');
    label.textContent='NOTICE';
    section.insertBefore(label,track);
  }
  return {section,track};
}

let animation=null;
function stopAnimation(){try{animation?.cancel()}catch{}animation=null;window.__grabzoneNoticeAnimation=null}

function renderMain(notices,show){
  const {section,track}=ensureMainMarkup();
  if(!show||!notices.length){stopAnimation();track.innerHTML='';section.style.display='none';return}
  installMainNoticeStyle();
  section.style.display='flex';
  const html=notices.map(notice=>`<span class="gzNoticeItem"><b>${esc(notice.title)}</b><span class="gzNoticeMessage">${esc(notice.message)}</span></span>`).join('');
  track.innerHTML=`<div id="gzNoticeMoving">${html}</div>`;
  const moving=document.getElementById('gzNoticeMoving');
  if(!moving)return;
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    const trackWidth=track.getBoundingClientRect().width;
    const noticeWidth=moving.getBoundingClientRect().width;
    if(!trackWidth||!noticeWidth)return;
    const startX=trackWidth;
    const endX=-noticeWidth;
    const distance=startX-endX;
    const speed=window.innerWidth<=600?130:165;
    const duration=Math.max(3000,(distance/speed)*1000);
    stopAnimation();
    moving.style.transform=`translate3d(${startX}px,0,0)`;
    const startAnimation=()=>{
      if(window.__grabzoneNoticeStopped)return;
      moving.style.transform=`translate3d(${startX}px,0,0)`;
      const a=moving.animate([{transform:`translate3d(${startX}px,0,0)`},{transform:`translate3d(${endX}px,0,0)`}],{duration,iterations:1,easing:'linear',fill:'forwards'});
      animation=a;
      window.__grabzoneNoticeAnimation=a;
      a.onfinish=()=>{if(window.__grabzoneNoticeAnimation!==a)return;startAnimation()};
    };
    window.__grabzoneNoticeStopped=false;
    startAnimation();
  }));
}

function installMarketplaceNoticeStyle(){
  if(document.getElementById('gzMpNoticeStyle'))return;
  const style=document.createElement('style');
  style.id='gzMpNoticeStyle';
  style.textContent=`
    .mp-notice{display:flex!important;align-items:center!important;overflow:hidden!important;height:44px!important}
    .mp-notice > b{height:44px!important;display:flex!important;align-items:center!important;justify-content:center!important;flex:0 0 auto!important;padding:0 28px!important;background:#ff650b!important;color:#fff!important;font-size:10px!important;letter-spacing:.12em!important;line-height:1!important}
    .gzMpNoticeViewport{position:relative!important;flex:1 1 auto!important;min-width:0!important;height:44px!important;overflow:hidden!important;display:flex!important;align-items:center!important}
    .gzMpNoticeMoving{position:absolute!important;left:0!important;top:0!important;height:44px!important;display:inline-flex!important;align-items:center!important;width:max-content!important;min-width:max-content!important;white-space:nowrap!important;will-change:transform!important}
    .gzMpNoticeMoving .gzNoticeItem{display:inline-flex!important;align-items:center!important;flex:0 0 auto!important;width:max-content!important;min-width:max-content!important;margin:0 100px 0 0!important;padding:0!important;color:#e4e4e4!important;font-size:12px!important;line-height:1!important;white-space:nowrap!important}
    .gzMpNoticeMoving .gzNoticeItem b{display:inline-block!important;flex:0 0 auto!important;margin:0 12px 0 0!important;padding:0!important;background:none!important;color:#fff!important;font-size:12px!important;font-weight:900!important;line-height:1!important;letter-spacing:normal!important;white-space:nowrap!important}
    .gzMpNoticeMoving .gzNoticeMessage{display:inline-block!important;flex:0 0 auto!important;color:#e4e4e4!important;font-size:12px!important;line-height:1!important;white-space:nowrap!important}
    @media(max-width:700px){.mp-notice{height:40px!important}.mp-notice > b{height:40px!important;padding:0 17px!important}.gzMpNoticeViewport,.gzMpNoticeMoving{height:40px!important}.gzMpNoticeMoving .gzNoticeItem{margin-right:60px!important;font-size:10px!important}.gzMpNoticeMoving .gzNoticeItem b,.gzMpNoticeMoving .gzNoticeMessage{font-size:10px!important}}
  `;
  (document.head||document.documentElement).appendChild(style);
}

function renderMarketplace(notices,show){
  const bar=document.querySelector('.mp-notice');
  if(!bar)return false;
  const duplicate=document.getElementById('noticeSection');
  if(duplicate)duplicate.remove();
  if(!show||!notices.length){stopAnimation();bar.style.display='none';return true}
  installMarketplaceNoticeStyle();
  bar.style.display='flex';
  bar.innerHTML=`<b>NOTICE</b><div class="gzMpNoticeViewport"><div class="gzMpNoticeMoving">${notices.map(n=>`<span class="gzNoticeItem"><b>${esc(n.title)}</b><span class="gzNoticeMessage">${esc(n.message)}</span></span>`).join('')}</div></div>`;
  const viewport=bar.querySelector('.gzMpNoticeViewport'),moving=bar.querySelector('.gzMpNoticeMoving');
  if(!viewport||!moving)return true;
  requestAnimationFrame(()=>{
    const width=Math.max(viewport.clientWidth,1),content=Math.max(moving.scrollWidth,1);
    const startX=width,endX=-content;
    moving.style.transform=`translate3d(${startX}px,0,0)`;
    const a=moving.animate([{transform:`translate3d(${startX}px,0,0)`},{transform:`translate3d(${endX}px,0,0)`}],{duration:Math.max(12000,((width+content)/150)*1000),iterations:Infinity,easing:'linear'});
    animation=a;
  });
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
  sync();
  setInterval(sync,30000);
  const mo=new MutationObserver(()=>{
    const isMarketplace=!!document.querySelector('.mp-notice');
    if(isMarketplace){
      if(!document.querySelector('.mp-notice>.gzMpNoticeViewport'))sync();
    }else if(!document.getElementById('gzNoticeMoving'))sync();
  });
  mo.observe(document.documentElement,{childList:true,subtree:true});
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();