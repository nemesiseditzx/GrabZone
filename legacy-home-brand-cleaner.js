(()=>{
'use strict';
if(location.pathname!=='/'&&!location.pathname.endsWith('/index.html'))return;
let desiredLoaded=false;
let bootTimer=0;
function removeLegacy(){
  const old=[...document.querySelectorAll('.gh-brands,.gz-mp-brand-bg')];
  old.forEach(el=>el.remove());
  return old.length>0;
}
function loadDesired(){
  if(desiredLoaded||document.querySelector('[data-grabzone-home-brand-fix]')||document.querySelector('[data-gz-home-brands]'))return;
  desiredLoaded=true;
  const s=document.createElement('script');
  s.src='/marketplace-home-fix.js?v=20260912-final2';
  s.defer=true;
  s.dataset.grabzoneHomeBrandFix='true';
  (document.head||document.documentElement).appendChild(s);
}
function sync(){
  const removed=removeLegacy();
  if(removed){
    clearTimeout(bootTimer);
    bootTimer=setTimeout(loadDesired,50);
  }
}
const observer=new MutationObserver(sync);
observer.observe(document.documentElement,{childList:true,subtree:true});
sync();
// If the legacy block never appears, still allow the desired section to initialize.
bootTimer=setTimeout(loadDesired,1500);
setTimeout(()=>observer.disconnect(),30000);
})();