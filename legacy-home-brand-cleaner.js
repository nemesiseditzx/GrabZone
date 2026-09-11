(()=>{
'use strict';
if(location.pathname!=='/'&&!location.pathname.endsWith('/index.html'))return;

// Home UI cleanup: remove ONLY the old/messy narrow Brands block.
// Keep .gz-home-brands-section — that is the intended full-width Brands UI.
const style=document.createElement('style');
style.id='gz-home-messy-brand-hide';
style.textContent='.gh-brands,.gz-mp-brand-bg{display:none!important}';
(document.head||document.documentElement).appendChild(style);

function clean(){
  document.querySelectorAll('.gh-brands,.gz-mp-brand-bg').forEach(el=>el.remove());

  // Remove any other duplicate Shop by Brands section, but NEVER the intended one.
  document.querySelectorAll('main > section').forEach(el=>{
    if(el.classList.contains('gz-home-brands-section'))return;
    if(el.classList.contains('gh-brands')){el.remove();return;}
    const h=el.querySelector('h1,h2,h3');
    if(h&&/shop\s+by\s+brands/i.test(h.textContent||''))el.remove();
  });
}

clean();
const observer=new MutationObserver(clean);
observer.observe(document.documentElement,{childList:true,subtree:true});
setTimeout(()=>observer.disconnect(),20000);
})();
