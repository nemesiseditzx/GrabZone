(()=>{
'use strict';
if(location.pathname!=='/'&&!location.pathname.endsWith('/index.html'))return;
const HIDE_STYLE_ID='gz-hide-legacy-home-brands';
let desiredLoaded=false;
let bootTimer=0;
function installHideStyle(){
  if(document.getElementById(HIDE_STYLE_ID))return;
  const s=document.createElement('style');
  s.id=HIDE_STYLE_ID;
  s.textContent='.gh-brands,.gz-mp-brand-bg{display:none!important}';
  (document.head||document.documentElement).appendChild(s);
}
function removeLegacy(){
  const old=[...document.querySelectorAll('.gh-brands,.gz-mp-brand-bg')];
  old.forEach(el=>el.remove());
  return old.length>0;
}
function loadDesired(){
  if(desiredLoaded||document.querySelector('[data-grabzone-home-brand-fix]')||document.querySelector('[data-gz-home-brands]'))return;
  desiredLoaded=true;
  const s=document.createElement('script');
  s.src='/marketplace-home-fix.js?v=20260912-final3';
  s.defer=true;
  s.dataset.grabzoneHomeBrandFix='true';
  (document.head||document.documentElement).appendChild(s);
}
function sync(){
  installHideStyle();
  const removed=removeLegacy();
  if(removed){
    clearTimeout(bootTimer);
    bootTimer=setTimeout(loadDesired,50);
  }
}
installHideStyle();
const observer=new MutationObserver(sync);
observer.observe(document.documentElement,{childList:true,subtree:true});
sync();
bootTimer=setTimeout(loadDesired,800);
setTimeout(()=>observer.disconnect(),120000);
})();