(()=>{
'use strict';
if(location.pathname!=='/'&&!location.pathname.endsWith('/index.html'))return;
function clean(){
  document.querySelectorAll('.gh-brands,.gz-mp-brand-bg').forEach(el=>el.remove());
  document.querySelectorAll('main > section').forEach(el=>{
    if(el.classList.contains('gz-home-brands-section'))return;
    const h=el.querySelector('h1,h2,h3');
    if(h&&/shop\s+by\s+brands/i.test(h.textContent||''))el.remove();
  });
}
clean();
const observer=new MutationObserver(clean);
observer.observe(document.documentElement,{childList:true,subtree:true});
setTimeout(()=>observer.disconnect(),15000);
const loadHomeBrands=()=>{
  if(document.querySelector('[data-grabzone-home-brand-fix]'))return;
  const s=document.createElement('script');
  s.defer=true;
  s.src='/marketplace-home-fix.js?v=20260911-brands2';
  s.dataset.grabzoneHomeBrandFix='true';
  document.head.appendChild(s);
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',loadHomeBrands,{once:true});else loadHomeBrands();
})();