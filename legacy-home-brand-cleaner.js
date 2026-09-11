(()=>{
'use strict';
if(location.pathname!=='/'&&!location.pathname.endsWith('/index.html'))return;
const style=document.createElement('style');
style.id='gz-home-legacy-brand-hide';
style.textContent='.gz-home-brands-section,.gz-mp-brand-bg{display:none!important}';
(document.head||document.documentElement).appendChild(style);
function clean(){
  // Remove ONLY the old/narrow Home Brands block. Keep the existing .gh-brands section.
  document.querySelectorAll('.gz-home-brands-section,.gz-mp-brand-bg').forEach(el=>el.remove());
  document.querySelectorAll('main > section').forEach(el=>{
    if(el.classList.contains('gh-brands'))return;
    const h=el.querySelector('h1,h2,h3');
    if(h&&/shop\s+by\s+brands/i.test(h.textContent||'')){
      // Do not remove the intended .gh-brands section; remove other duplicate legacy blocks.
      if(!el.classList.contains('gh-brands'))el.remove();
    }
  });
}
clean();
const observer=new MutationObserver(clean);
observer.observe(document.documentElement,{childList:true,subtree:true});
setTimeout(()=>observer.disconnect(),20000);
})();