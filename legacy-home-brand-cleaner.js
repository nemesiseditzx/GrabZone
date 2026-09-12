(()=>{
'use strict';
if(location.pathname!=='/'&&!location.pathname.endsWith('/index.html'))return;
const HIDE_STYLE_ID='gz-hide-legacy-home-brands';
function installHideStyle(){
  if(document.getElementById(HIDE_STYLE_ID))return;
  const s=document.createElement('style');
  s.id=HIDE_STYLE_ID;
  s.textContent='.gh-brands,.gz-mp-brand-bg{display:none!important}';
  (document.head||document.documentElement).appendChild(s);
}
function removeLegacy(){
  document.querySelectorAll('.gh-brands,.gz-mp-brand-bg').forEach(el=>el.remove());
}
function loadDesired(){
  if(document.querySelector('[data-grabzone-home-brand-fix],[data-gz-home-brands]'))return;
  const s=document.createElement('script');
  s.src='/marketplace-home-fix.js?v=20260912-final4';
  s.dataset.grabzoneHomeBrandFix='true';
  (document.head||document.documentElement).appendChild(s);
}
function sync(){installHideStyle();removeLegacy();}
installHideStyle();
sync();
const observer=new MutationObserver(sync);
observer.observe(document.documentElement,{childList:true,subtree:true});
setInterval(sync,500);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',loadDesired,{once:true});else loadDesired();
})();