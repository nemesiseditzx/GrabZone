(()=>{'use strict';
if(window.__GZ_CUSTOMER_HEADER_FIX__)return;
window.__GZ_CUSTOMER_HEADER_FIX__=true;

const isHome=()=>{const p=(location.pathname||'/').replace(/\\/+$/,'')||'/';return p==='/'||p==='/index.html'};
if(!isHome())return;

function findSearch(){
  return document.getElementById('search')
    || document.querySelector('.gz-ref-search input[type="search"]')
    || document.querySelector('header input[type="search"]')
    || document.querySelector('input[type="search"]');
}

function normalize(){
  const header=document.querySelector('header.header,.header');
  const search=findSearch();
  if(!header||!search)return;

  let shell=document.getElementById('gzHeaderSearch');
  if(!shell){
    shell=document.createElement('div');
    shell.id='gzHeaderSearch';
    shell.className='gz-header-search';
  }

  if(shell.parentElement!==header)header.insertBefore(shell,header.querySelector('.header-actions')||null);
  if(search.parentElement!==shell)shell.appendChild(search);

  /* Remove empty legacy search shells left behind by older UI layers. */
  document.querySelectorAll('.gz-ref-search').forEach(el=>{
    if(el!==shell && !el.contains(search) && !el.textContent.trim())el.remove();
  });

  /* The header is the single desktop search surface. */
  if(window.innerWidth>=761){
    const tools=search.closest('.shop-tools');
    if(tools){
      tools.querySelectorAll('#search').forEach((el,i)=>{if(i>0)el.remove()});
    }
  }
}

let timer=0;
const boot=()=>{
  clearTimeout(timer);
  timer=setTimeout(normalize,30);
};

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();

new MutationObserver(boot).observe(document.documentElement,{childList:true,subtree:true});
window.addEventListener('resize',boot,{passive:true});
})();