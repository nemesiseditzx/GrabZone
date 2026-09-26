(()=>{
'use strict';
const apply=()=>{
 const board=document.querySelector('#gzManagedBillboard');
 if(!board||board.dataset.sliderPatched)return !!board;
 board.dataset.sliderPatched='1';
 const style=document.createElement('style');
 style.id='gzBillboardSliderPatch';
 style.textContent=`#gzManagedBillboard .gz-bb-ui.is-hidden{display:flex!important}#gzManagedBillboard .gz-bb-copy{transition:opacity .18s ease}#gzManagedBillboard .gz-bb-art{transition:opacity .22s ease,transform .3s ease}#gzManagedBillboard .gz-bb-ui>button{cursor:pointer!important;z-index:6!important}#gzManagedBillboard .gz-bb-prev,#gzManagedBillboard .gz-bb-next{display:grid!important;place-items:center!important}@media(max-width:700px){#gzManagedBillboard .gz-bb-ui{padding:0 8px!important}#gzManagedBillboard .gz-bb-ui>button{width:36px!important;height:36px!important}}`;
 document.head.appendChild(style);
 return true;
};
if(apply())return;
const mo=new MutationObserver(()=>{if(apply())mo.disconnect()});
mo.observe(document.documentElement,{childList:true,subtree:true});
setTimeout(()=>mo.disconnect(),15000);
})();
