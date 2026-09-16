(()=>{
'use strict';

const path=String(location.pathname||'/');
const isHome=/^\/(?:index\.html)?$/.test(path);
const isMarketplace=/^\/marketplace(?:\.html)?\/?$/.test(path);

if(isMarketplace)return;
if(window.__GZ_NOTICE_SYNC__)return;
window.__GZ_NOTICE_SYNC__=true;

const esc=v=>String(v??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[m]));

function installStyle(){
  document.getElementById('gzNoticeStyle')?.remove();
  const s=document.createElement('style');
  s.id='gzNoticeStyle';
  s.textContent=`
    #noticeTrack{position:relative!important;overflow:hidden!important;width:100%!important;min-width:0!important;height:100%!important;display:block!important;white-space:nowrap!important}
    #gzNoticeMoving{position:absolute!important;top:0!important;left:0!important;display:inline-flex!important;align-items:center!important;width:max-content!important;min-width:max-content!important;height:100%!important;margin:0!important;padding:0!important;white-space:nowrap!important;will-change:transform!important}
    .gzNoticeItem{display:inline-flex!important;align-items:center!important;flex:0 0 auto!important;width:max-content!important;min-width:max-content!important;margin:0 100px 0 0!important;padding:0!important;white-space:nowrap!important;font-size:13px!important;line-height:1!important}
    .gzNoticeItem b{display:inline-block!important;flex:0 0 auto!important;margin:0 12px 0 0!important;padding:0!important;font-weight:900!important;white-space:nowrap!important}
    .gzNoticeMessage{display:inline-block!important;flex:0 0 auto!important;white-space:nowrap!important}
    @media(max-width:600px){.gzNoticeItem{margin-right:60px!important;font-size:10px!important}.gzNoticeItem b{margin-right:8px!important}}
  `;
  document.head.appendChild(s);
}

function markup(){
  let section=document.getElementById('noticeSection');
  if(!section){
    section=document.createElement('div');
    section.id='noticeSection';
    section.className='notice-wrap';
    const h=document.querySelector('header.header,.header,header');
    if(h?.parentNode)h.parentNode.insertBefore(section,h.nextSibling);else document.body.prepend(section);
  }
  let track=document.getElementById('noticeTrack');
  if(!track||!section.contains(track)){
    section.innerHTML='<div class="notice-label" data-i18n="noticeLabel">NOTICE</div><div id="noticeTrack" class="notice-track"></div>';
    track=section.querySelector('#noticeTrack');
  }
  return{section,track};
}

let animation=null;

function render(notices,show=true){
  const{section,track}=markup();
  if(!show||!notices.length){
    try{animation?.cancel()}catch{}
    animation=null;
    track.innerHTML='';
    section.style.display='none';
    return;
  }
  installStyle();
  section.style.display='flex';
  track.innerHTML='<div id="gzNoticeMoving">'+notices.map(n=>'<span class="gzNoticeItem"><b>'+esc(n.title)+'</b><span class="gzNoticeMessage">'+esc(n.message)+'</span></span>').join('')+'</div>';
  const moving=document.getElementById('gzNoticeMoving');
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    const w=track.getBoundingClientRect().width;
    const c=moving.getBoundingClientRect().width;
    if(!w||!c)return;
    try{animation?.cancel()}catch{}
    const sx=0,ex=-c;
    const d=Math.max(3000,(c/(innerWidth<=600?130:165))*1000);
    moving.style.transform=`translate3d(${sx}px,0,0)`;
    animation=moving.animate(
      [{transform:`translate3d(${sx}px,0,0)`},{transform:`translate3d(${ex}px,0,0)`}],
      {duration:d,iterations:Infinity,easing:'linear'}
    );
  }));
}

async function getApiState(){
  const r=await fetch('/api/marketplace/notices?ts='+Date.now(),{cache:'no-store',credentials:'include'});
  const b=await r.json().catch(()=>null);
  if(!r.ok)throw Error(String(b?.error||b?.message||('Notice request failed: '+r.status)));
  return{notices:Array.isArray(b?.notices)?b.notices:[],show:b?.show_notice!==false};
}

async function sync(){
  try{
    const s=await getApiState();
    render(s.notices,s.show);
  }catch(e){
    console.warn('GrabZone notice sync:',e);
  }
}

function boot(){
  sync();
  setTimeout(sync,1500);
  setInterval(sync,30000);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
})();