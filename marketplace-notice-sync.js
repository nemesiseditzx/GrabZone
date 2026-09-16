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
function ensureStyle(){
 if(document.getElementById('gzMarketplaceNoticeStyle'))return;
 const st=document.createElement('style');
 st.id='gzMarketplaceNoticeStyle';
 st.textContent=`
   .mp-notice.notice-wrap{
     position:relative!important;
     z-index:20!important;
     width:100%!important;
     height:42px!important;
     display:flex!important;
     align-items:center!important;
     overflow:hidden!important;
     background:#101010!important;
     color:#fff!important;
     isolation:isolate!important;
   }
   .mp-notice.notice-wrap .notice-label{
     position:relative!important;
     z-index:5!important;
     flex:0 0 88px!important;
     width:88px!important;
     height:100%!important;
     display:flex!important;
     align-items:center!important;
     justify-content:center!important;
     padding:0 12px!important;
     background:#ff650b!important;
     border-right:1px solid #ff650b!important;
     color:#fff!important;
     font-size:11px!important;
     font-weight:900!important;
     letter-spacing:.16em!important;
     line-height:1!important;
     white-space:nowrap!important;
   }
   .mp-notice.notice-wrap .notice-track{
     position:relative!important;
     flex:1 1 auto!important;
     width:0!important;
     min-width:0!important;
     height:100%!important;
     overflow:hidden!important;
     display:block!important;
     white-space:nowrap!important;
   }
   .mp-notice.notice-wrap .notice-loop{
     position:absolute!important;
     z-index:1!important;
     top:50%!important;
     left:100%!important;
     display:inline-flex!important;
     align-items:center!important;
     width:max-content!important;
     min-width:max-content!important;
     height:max-content!important;
     margin:0!important;
     padding:0!important;
     white-space:nowrap!important;
     transform:translate3d(0,-50%,0)!important;
     will-change:transform!important;
     backface-visibility:hidden!important;
   }
   .mp-notice.notice-wrap .notice-content,
   .mp-notice.notice-wrap .notice-group{
     display:inline-flex!important;
     align-items:center!important;
     width:max-content!important;
     min-width:max-content!important;
     flex:0 0 auto!important;
     white-space:nowrap!important;
   }
   .mp-notice.notice-wrap .notice-item{
     display:inline-flex!important;
     align-items:center!important;
     width:max-content!important;
     min-width:max-content!important;
     flex:0 0 auto!important;
     margin:0 100px 0 0!important;
     padding:0!important;
     font-size:13px!important;
     font-weight:500!important;
     line-height:1!important;
     white-space:nowrap!important;
   }
   .mp-notice.notice-wrap .notice-item b{
     display:inline-block!important;
     margin:0 14px 0 0!important;
     font-weight:900!important;
     white-space:nowrap!important;
   }
   .mp-notice.notice-wrap .notice-message{
     display:inline-block!important;
     margin:0!important;
     padding:0!important;
     white-space:nowrap!important;
   }
   .mp-notice.notice-wrap .notice-item::before,
   .mp-notice.notice-wrap .notice-item::after{
     content:none!important;
     display:none!important;
   }
   @media(max-width:600px){
     .mp-notice.notice-wrap{height:42px!important}
     .mp-notice.notice-wrap .notice-label{flex-basis:88px!important;width:88px!important;font-size:10px!important}
     .mp-notice.notice-wrap .notice-item{margin-right:60px!important;font-size:10px!important}
   }
   @media(prefers-reduced-motion:reduce){
     .mp-notice.notice-wrap .notice-loop{animation:none!important;left:0!important;transform:translate3d(0,-50%,0)!important}
   }
 `;
 document.head.appendChild(st);
}
function render(s){
 const bar=document.querySelector('.mp-notice');if(!bar)return false;
 const notices=s.notices||[],sig=JSON.stringify({show:s.show,notices});if(sig===lastSignature)return true;lastSignature=sig;
 try{animation?.cancel()}catch{}animation=null;
 if(s.show===false||!notices.length){bar.style.display='none';return true}
 ensureStyle();
 bar.classList.add('notice-wrap');
 bar.style.display='flex';
 bar.innerHTML='<b class="notice-label" data-i18n="noticeLabel">NOTICE</b><div id="noticeTrack" class="notice-track"><div class="notice-loop"><div class="notice-content"><div class="notice-group">'+notices.map(n=>'<span class="notice-item"><b>'+esc(n.title)+'</b><span class="notice-message">'+esc(n.message)+'</span></span>').join('')+'</div></div></div></div>';
 const track=bar.querySelector('#noticeTrack'),moving=bar.querySelector('.notice-loop');if(!track||!moving)return true;
 requestAnimationFrame(()=>requestAnimationFrame(()=>{
   const trackWidth=track.getBoundingClientRect().width;
   const noticeWidth=moving.getBoundingClientRect().width;
   if(!trackWidth||!noticeWidth)return;
   const startX=trackWidth;
   const endX=-noticeWidth;
   const distance=startX-endX;
   const speed=window.innerWidth<=600?130:165;
   const duration=Math.max(3000,(distance/speed)*1000);
   moving.style.transform=`translate3d(${startX}px,-50%,0)`;
   animation=moving.animate(
     [{transform:`translate3d(${startX}px,-50%,0)`},{transform:`translate3d(${endX}px,-50%,0)`}],
     {duration,iterations:Infinity,easing:'linear'}
   );
 });
 return true;
}
async function sync(){try{return render(await state())}catch(e){console.warn('GrabZone shared notice sync:',e);return false}}
function boot(){let tries=0;const tick=()=>{if(sync()||++tries>120)return;setTimeout(tick,100)};tick();setTimeout(sync,1200);setInterval(sync,30000)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();