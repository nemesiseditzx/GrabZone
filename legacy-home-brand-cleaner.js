(()=>{
'use strict';
if(location.pathname!=='/'&&!location.pathname.endsWith('/index.html'))return;

// Keep the original Home-page .gh-brands section.
// Remove only the newer replacement section that was added later.
const HIDE_STYLE_ID='gz-remove-new-home-brands';
function installStyle(){
  if(document.getElementById(HIDE_STYLE_ID))return;
  const s=document.createElement('style');
  s.id=HIDE_STYLE_ID;
  s.textContent='.gz-home-brands-section{display:none!important}';
  (document.head||document.documentElement).appendChild(s);
}
function removeNew(){
  document.querySelectorAll('.gz-home-brands-section,.gz-mp-brand-bg').forEach(el=>el.remove());
}
function sync(){installStyle();removeNew();}
installStyle();
sync();
const observer=new MutationObserver(sync);
observer.observe(document.documentElement,{childList:true,subtree:true});
setInterval(sync,500);
})();