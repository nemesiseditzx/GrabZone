(()=>{
'use strict';
if(location.pathname!=='/'&&!location.pathname.endsWith('/index.html'))return;
const STYLE_ID='gz-home-brand-cleaner-style';
const SCRIPT_ID='gz-home-brand-fix-loader';
function installStyle(){
  if(document.getElementById(STYLE_ID))return;
  const s=document.createElement('style');s.id=STYLE_ID;
  s.textContent='.gh-brands,.gz-mp-brand-bg{display:none!important}.gz-home-brands-section{display:block!important}';
  (document.head||document.documentElement).appendChild(s);
}
function removeOld(){document.querySelectorAll('.gh-brands,.gz-mp-brand-bg').forEach(el=>el.remove())}
function loadNew(){
  if(document.getElementById(SCRIPT_ID)||document.querySelector('[data-grabzone-home-brand-fix]'))return;
  const s=document.createElement('script');s.id=SCRIPT_ID;s.defer=true;s.src='/marketplace-home-fix.js?v=20260912-brands4';s.dataset.grabzoneHomeBrandFix='true';
  (document.head||document.documentElement).appendChild(s);
}
function sync(){installStyle();removeOld();loadNew()}
installStyle();sync();
const observer=new MutationObserver(()=>sync());
observer.observe(document.documentElement,{childList:true,subtree:true});
})();