(()=>{
'use strict';
if(location.pathname!=='/'&&!location.pathname.endsWith('/index.html'))return;
const style=document.createElement('style');
style.id='gz-home-legacy-brand-hide';
style.textContent='.gz-home-brands-section{display:none!important}';
(document.head||document.documentElement).appendChild(style);
function clean(){
  // Remove ONLY the injected marketplace-home-fix section.
  // Keep the existing/reference .gh-brands section intact.
  document.querySelectorAll('.gz-home-brands-section,[data-gz-home-brands]').forEach(el=>el.remove());
}
clean();
const observer=new MutationObserver(clean);
observer.observe(document.documentElement,{childList:true,subtree:true});
setTimeout(()=>observer.disconnect(),20000);
})();