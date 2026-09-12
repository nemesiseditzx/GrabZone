(function(){
  'use strict';
  if (window.__GZ_GLOBAL_LOADER__) return;
  window.__GZ_GLOBAL_LOADER__ = true;

  var CSS = `
#gzGlobalLoading{position:fixed;inset:0;z-index:2147483647;background:#fff;display:flex;align-items:center;justify-content:center;overflow:hidden;opacity:1;visibility:visible;pointer-events:auto;transition:opacity .24s ease,visibility .24s ease;font-family:Arial,Helvetica,sans-serif}
#gzGlobalLoading.gz-hide{opacity:0;visibility:hidden;pointer-events:none}
.gzgl-stage{position:relative;width:min(390px,82vw);height:min(390px,82vw);display:flex;align-items:center;justify-content:center}
.gzgl-orbit{position:absolute;border-radius:50%;box-sizing:border-box}
.gzgl-orbit.one{inset:0;border:2px solid rgba(255,107,0,.11);border-top-color:#ff6b00;border-right-color:#ff8a22;animation:gzglSpin 1.35s linear infinite}
.gzgl-orbit.two{inset:24px;border:1.5px solid rgba(255,107,0,.13);border-bottom-color:#ff8a22;border-left-color:#ffb36f;animation:gzglSpinReverse 2s linear infinite}
.gzgl-orbit.three{inset:52px;border:1px dashed rgba(255,107,0,.16);animation:gzglSpin 5.5s linear infinite}
.gzgl-logo-wrap{position:relative;width:116px;height:116px;border-radius:28px;background:#fff;display:grid;place-items:center;box-shadow:0 16px 48px rgba(0,0,0,.10),0 0 0 1px rgba(0,0,0,.045);z-index:2}
.gzgl-logo{width:82px;height:82px;object-fit:contain;display:block}
.gzgl-dot{position:absolute;right:-11px;top:8px;width:18px;height:18px;border-radius:50%;background:#fff;border:4px solid #ff6b00;box-shadow:0 0 18px rgba(255,107,0,.45);animation:gzglPulse 1.1s ease-in-out infinite}
.gzgl-copy{position:absolute;top:calc(100% + 28px);left:50%;transform:translateX(-50%);text-align:center;white-space:nowrap}
.gzgl-title{font-size:13px;letter-spacing:.32em;font-weight:900;color:#222;margin-left:.32em}
.gzgl-dots{color:#ff6b00;letter-spacing:.12em}
.gzgl-sub{font-size:8px;letter-spacing:.38em;color:#aaa;margin:11px 0 0 .38em;font-weight:800}
.gzgl-bar{position:absolute;top:calc(100% + 78px);left:50%;transform:translateX(-50%);width:min(250px,58vw);height:5px;border-radius:99px;background:#ededed;overflow:hidden}
.gzgl-bar i{display:block;width:38%;height:100%;border-radius:inherit;background:#ff6b00;animation:gzglProgress 1.15s ease-in-out infinite}
.gzgl-corner{position:absolute;font-size:7px;letter-spacing:.28em;line-height:1.75;color:#aaa;font-weight:800}
.gzgl-corner b{display:block;color:#ff6b00;font-size:8px;letter-spacing:.08em}
.gzgl-corner.tl{top:28px;left:30px}.gzgl-corner.tr{top:28px;right:30px;text-align:right}.gzgl-corner.bl{bottom:28px;left:30px}.gzgl-corner.br{bottom:28px;right:30px;text-align:right}
@keyframes gzglSpin{to{transform:rotate(360deg)}}
@keyframes gzglSpinReverse{to{transform:rotate(-360deg)}}
@keyframes gzglPulse{0%,100%{transform:scale(.88);opacity:.65}50%{transform:scale(1.08);opacity:1}}
@keyframes gzglProgress{0%{transform:translateX(-150%)}100%{transform:translateX(420%)}}
@media(max-width:600px){.gzgl-corner{display:none}.gzgl-logo-wrap{width:98px;height:98px;border-radius:24px}.gzgl-logo{width:70px;height:70px}.gzgl-bar{top:calc(100% + 72px)}}`;

  var style=document.createElement('style');
  style.id='gz-global-loader-style';
  style.textContent=CSS;
  (document.head||document.documentElement).appendChild(style);

  var overlay=document.createElement('div');
  overlay.id='gzGlobalLoading';
  overlay.setAttribute('aria-live','polite');
  overlay.setAttribute('aria-label','Loading GrabZone');
  overlay.innerHTML='<div class="gzgl-stage">'
    +'<div class="gzgl-orbit one"></div><div class="gzgl-orbit two"></div><div class="gzgl-orbit three"></div>'
    +'<div class="gzgl-logo-wrap"><img class="gzgl-logo" src="/favicon.png" alt="GrabZone"><span class="gzgl-dot"></span></div>'
    +'<div class="gzgl-copy"><div class="gzgl-title">PROCESSING <span class="gzgl-dots">...</span></div><div class="gzgl-sub">PLEASE WAIT A MOMENT</div></div>'
    +'<div class="gzgl-bar"><i></i></div></div>'
    +'<div class="gzgl-corner tl">MORE<br>THAN<br>JUST <b>GRABZONE</b></div>'
    +'<div class="gzgl-corner tr">SHOP<br>EXPLORE<br>ENJOY <b>ONLINE</b></div>'
    +'<div class="gzgl-corner bl">GRABZONE<br>ONLINE STORE <b>GRAB IT. LOVE IT.</b></div>'
    +'<div class="gzgl-corner br">A BETTER<br>SHOPPING<br>EXPERIENCE <b>GZ</b></div>';

  function mount(){
    if(!document.getElementById('gzGlobalLoading')){
      (document.body||document.documentElement).appendChild(overlay);
    }
  }
  mount();

  var hideTimer=0;
  function show(){mount();clearTimeout(hideTimer);overlay.classList.remove('gz-hide');}
  function hide(){clearTimeout(hideTimer);hideTimer=setTimeout(function(){overlay.classList.add('gz-hide');},120);}
  window.GZLoading={show:show,hide:hide,start:show,stop:hide,isLoading:function(){return !overlay.classList.contains('gz-hide');}};

  function initialHide(){
    var root=document.documentElement;
    var wait=root.hasAttribute('data-gz-loader-wait') || document.body&&document.body.hasAttribute('data-gz-loader-wait');
    if(!wait) hide();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialHide,{once:true});else initialHide();

  // Home-only hard cleanup for every obsolete Shop by Brands block.
  function removeLegacyHomeBrands(){
    var path=(location.pathname||'/').replace(/\/+$/,'')||'/';
    if(path!=='/'&&path!=='/index.html')return false;
    var removed=false;

    function cleanText(v){return String(v||'').replace(/\s+/g,' ').trim();}

    // Remove the largest nearby container that contains the old marketplace card content.
    function removeLegacyContainer(el){
      var node=el;
      for(var depth=0;depth<20&&node&&node!==document.body;depth++,node=node.parentElement){
        var t=cleanText(node.textContent);
        var legacyCards=/Official GrabZone store/i.test(t)&&/Partner Brands/i.test(t);
        var marketplace=/View Marketplace/i.test(t);
        var oldHeading=/Shop by Brands/i.test(t);
        if((legacyCards&&marketplace) || (oldHeading&&marketplace)){
          node.remove();
          removed=true;
          return true;
        }
      }
      return false;
    }

    // The previous cleanup could remove only the heading wrapper. If the cards remain,
    // find them by their exact legacy labels and remove their complete parent section.
    var legacy=document.querySelectorAll('body *');
    for(var i=0;i<legacy.length;i++){
      var text=cleanText(legacy[i].textContent);
      if(/^Official GrabZone store$/i.test(text)||/^Partner Brands$/i.test(text)||/^COMING SOON$/i.test(text)||/^View Marketplace/i.test(text)){
        removeLegacyContainer(legacy[i]);
      }
    }

    // Remove every Shop by Brands heading and the whole containing section.
    var headings=document.querySelectorAll('h1,h2,h3,h4,h5,h6');
    for(var j=0;j<headings.length;j++){
      if(cleanText(headings[j].textContent).toLowerCase()==='shop by brands'){
        removeLegacyContainer(headings[j]);
      }
    }

    // Catch non-semantic headings and partially-rendered legacy blocks.
    var candidates=document.querySelectorAll('section,article,div,main');
    for(var k=0;k<candidates.length;k++){
      var c=candidates[k];
      var tx=cleanText(c.textContent);
      if((/Official GrabZone store/i.test(tx)&&/Partner Brands/i.test(tx)&&/View Marketplace/i.test(tx)) ||
         (/Shop by Brands/i.test(tx)&&/View Marketplace/i.test(tx))){
        removeLegacyContainer(c);
      }
    }

    return removed;
  }

  function startLegacyBrandCleanup(){
    removeLegacyHomeBrands();
    var observer=new MutationObserver(function(){removeLegacyHomeBrands();});
    if(document.body)observer.observe(document.body,{childList:true,subtree:true});
    setTimeout(removeLegacyHomeBrands,100);
    setTimeout(removeLegacyHomeBrands,300);
    setTimeout(removeLegacyHomeBrands,750);
    setTimeout(removeLegacyHomeBrands,1500);
    setTimeout(removeLegacyHomeBrands,3000);
    setTimeout(removeLegacyHomeBrands,6000);
    setTimeout(removeLegacyHomeBrands,10000);
    setTimeout(function(){observer.disconnect();},15000);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',startLegacyBrandCleanup,{once:true});else startLegacyBrandCleanup();

  setTimeout(function(){hide();},12000);
})();
