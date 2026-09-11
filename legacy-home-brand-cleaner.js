(()=>{
'use strict';
if(location.pathname!=='/'&&!location.pathname.endsWith('/index.html'))return;
function removeLegacy(){
  // The upper broken/narrow brands block is the legacy .gh-brands section.
  // Remove only that block; the desired .gz-home-brands-section must remain.
  document.querySelectorAll('.gh-brands,.gz-mp-brand-bg').forEach(el=>el.remove());
}
function loadDesired(){
  if(document.querySelector('[data-grabzone-home-brand-fix]'))return;
  const s=document.createElement('script');
  s.src='/marketplace-home-fix.js?v=20260911-final-brands';
  s.defer=true;
  s.dataset.grabzoneHomeBrandFix='true';
  document.head.appendChild(s);
}
removeLegacy();
const observer=new MutationObserver(removeLegacy);
observer.observe(document.documentElement,{childList:true,subtree:true});
setTimeout(()=>observer.disconnect(),20000);
const start=()=>{
  removeLegacy();
  loadDesired();
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
else start();
})();