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
})();