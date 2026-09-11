(()=>{
'use strict';
if(location.pathname!=='/'&&!location.pathname.endsWith('/index.html'))return;
const style=document.createElement('style');
style.id='gz-home-legacy-brand-hide';
style.textContent='.gh-brands,.gz-mp-brand-bg{display:none!important}';
(document.head||document.documentElement).appendChild(style);
function clean(){
  document.querySelectorAll('.gh-brands,.gz-mp-brand-bg').forEach(el=>el.remove());
}
clean();
const observer=new MutationObserver(clean);
observer.observe(document.documentElement,{childList:true,subtree:true});
setTimeout(()=>observer.disconnect(),20000);
const loadHomeBrands=()=>{
  if(document.querySelector('[data-grabzone-home-brand-fix]'))return;
  const s=document.createElement('script');
  s.src='/marketplace-home-fix.js?v=20260911-brands5';
  s.dataset.grabzoneHomeBrandFix='true';
  (document.head||document.documentElement).appendChild(s);
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',loadHomeBrands,{once:true});else loadHomeBrands();
})();