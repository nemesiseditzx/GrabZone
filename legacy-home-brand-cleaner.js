(()=>{
'use strict';
if(location.pathname!=='/'&&!location.pathname.endsWith('/index.html'))return;

// Home must use the newer full-width marketplace brands section.
// Permanently suppress the legacy boxed .gh-brands section.
const HIDE_STYLE_ID='gz-hide-legacy-home-brands';
function installStyle(){
  if(document.getElementById(HIDE_STYLE_ID))return;
  const s=document.createElement('style');
  s.id=HIDE_STYLE_ID;
  s.textContent='.gh-brands,.gz-mp-brand-bg{display:none!important}';
  (document.head||document.documentElement).appendChild(s);
}
function removeLegacy(){
  document.querySelectorAll('.gh-brands,.gz-mp-brand-bg').forEach(el=>el.remove());
}
function loadNew(){
  if(document.querySelector('[data-grabzone-home-brand-fix]'))return;
  const s=document.createElement('script');
  s.src='/marketplace-home-fix.js?v=20260912-brands-final';
  s.defer=true;
  s.dataset.grabzoneHomeBrandFix='true';
  (document.head||document.documentElement).appendChild(s);
}
function sync(){installStyle();removeLegacy();}
installStyle();
sync();
const observer=new MutationObserver(sync);
observer.observe(document.documentElement,{childList:true,subtree:true});
const start=()=>setTimeout(loadNew,100);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
else start();
})();