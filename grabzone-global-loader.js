(function(){
  'use strict';
  if (window.__GZ_GLOBAL_LOADER__) return;
  window.__GZ_GLOBAL_LOADER__ = true;

  var CSS = '\n#gzGlobalLoading{position:fixed;inset:0;z-index:2147483647;background:radial-gradient(circle at 50% 42%,#fff 0,#fff 42%,#fffaf7 72%,#fff 100%);display:flex;align-items:center;justify-content:center;overflow:hidden;opacity:1;visibility:visible;pointer-events:auto;transition:opacity .35s ease,visibility .35s ease;font-family:Arial,Helvetica,sans-serif}\n#gzGlobalLoading.gz-hide{opacity:0;visibility:hidden;pointer-events:none}\n.gzgl-orbit{position:relative;width:min(330px,72vw);height:min(330px,72vw);display:flex;align-items:center;justify-content:center}\n.gzgl-orbit:before,.gzgl-orbit:after{content:"";position:absolute;border-radius:50%;inset:0;border:2px solid rgba(255,107,0,.10)}\n.gzgl-orbit:after{inset:22px;border-color:rgba(255,107,0,.08)}\n.gzgl-ring{position:absolute;inset:0;border-radius:50%;border:10px solid rgba(255,107,0,.10);border-top-color:#ff6b00;border-right-color:#ff8a22;animation:gzglSpin 1.55s linear infinite;filter:drop-shadow(0 4px 14px rgba(255,107,0,.22))}\n.gzgl-ring.two{inset:26px;border-width:4px;border-color:transparent transparent rgba(255,107,0,.20) #ffb36f;animation:gzglSpinReverse 2.3s linear infinite}\n.gzgl-ring.three{inset:50px;border-width:2px;border-style:dashed;border-color:rgba(255,107,0,.22);animation:gzglSpin 7s linear infinite}\n.gzgl-logo{position:relative;width:116px;height:116px;border-radius:30px;background:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 18px 55px rgba(0,0,0,.10),0 0 0 1px rgba(0,0,0,.04);font-weight:1000;font-size:58px;letter-spacing:-7px;color:#171717}\n.gzgl-logo span{color:#ff6b00;font-size:48px;margin-left:-4px;font-style:italic}\n.gzgl-logo:after{content:"";position:absolute;width:18px;height:18px;border-radius:50%;background:#fff;border:5px solid #ff6b00;right:-14px;top:10px;box-shadow:0 0 20px rgba(255,107,0,.55);animation:gzglPulse 1.2s ease-in-out infinite}\n.gzgl-copy{position:absolute;top:calc(100% + 28px);left:50%;transform:translateX(-50%);text-align:center;white-space:nowrap}\n.gzgl-title{font-size:14px;letter-spacing:.38em;font-weight:900;color:#333;margin-left:.38em}\n.gzgl-dots{display:inline-block;color:#ff6b00;letter-spacing:.12em;animation:gzglDots 1.1s steps(4,end) infinite;width:34px;text-align:left}\n.gzgl-sub{font-size:8px;letter-spacing:.42em;color:#aaa;margin:12px 0 0 .42em;font-weight:800}\n.gzgl-bar{position:absolute;top:calc(100% + 91px);left:50%;transform:translateX(-50%);width:min(260px,62vw);height:12px;border-radius:999px;background:#ececec;overflow:hidden;box-shadow:inset 0 1px 2px rgba(0,0,0,.05)}\n.gzgl-bar i{display:block;height:100%;width:62%;border-radius:inherit;background:linear-gradient(90deg,#ff6200,#ffad62,#ff6200);background-size:200% 100%;animation:gzglProgress 1.35s ease-in-out infinite;box-shadow:0 0 15px rgba(255,107,0,.35)}\n.gzgl-corner{position:absolute;font-size:7px;letter-spacing:.38em;color:#aaa;font-weight:900;line-height:1.9}.gzgl-corner b{display:block;color:#ff6b00;font-size:9px;letter-spacing:.1em;font-weight:900}.gzgl-corner.tl{top:32px;left:36px}.gzgl-corner.tr{top:32px;right:36px;text-align:right}.gzgl-corner.bl{bottom:32px;left:36px}.gzgl-corner.br{bottom:32px;right:36px;text-align:right}\n@keyframes gzglSpin{to{transform:rotate(360deg)}}@keyframes gzglSpinReverse{to{transform:rotate(-360deg)}}@keyframes gzglPulse{0%,100%{transform:scale(.88);opacity:.65}50%{transform:scale(1.08);opacity:1}}@keyframes gzglDots{0%{width:8px}33%{width:17px}66%{width:26px}100%{width:34px}}@keyframes gzglProgress{0%{transform:translateX(-105%);background-position:0 0}55%{transform:translateX(45%);background-position:100% 0}100%{transform:translateX(160%);background-position:0 0}}\n@media(max-width:600px){.gzgl-corner{display:none}.gzgl-logo{width:96px;height:96px;font-size:48px}.gzgl-logo span{font-size:40px}.gzgl-bar{top:calc(100% + 86px)}}';

  var style=document.createElement('style');
  style.id='gz-global-loader-style';
  style.textContent=CSS;
  (document.head||document.documentElement).appendChild(style);

  var overlay=document.createElement('div');
  overlay.id='gzGlobalLoading';
  overlay.setAttribute('aria-live','polite');
  overlay.setAttribute('aria-label','Loading GrabZone');
  overlay.innerHTML='<div class="gzgl-orbit"><div class="gzgl-ring"></div><div class="gzgl-ring two"></div><div class="gzgl-ring three"></div><div class="gzgl-logo">G<span>Z</span></div><div class="gzgl-copy"><div class="gzgl-title">PROCESSING <span class="gzgl-dots">...</span></div><div class="gzgl-sub">PLEASE WAIT A MOMENT</div></div><div class="gzgl-bar"><i></i></div></div><div class="gzgl-corner tl">MORE<br>THAN<br>JUST <b>GRABZONE</b></div><div class="gzgl-corner tr">SHOP<br>EXPLORE<br>ENJOY <b>ONLINE</b></div><div class="gzgl-corner bl">GRABZONE<br>ONLINE STORE <b>GRAB IT. LOVE IT.</b></div><div class="gzgl-corner br">A BETTER<br>SHOPPING<br>EXPERIENCE <b>GZ</b></div>';

  function mount(){
    if (!document.getElementById('gzGlobalLoading')) {
      (document.documentElement||document.body).appendChild(overlay);
    }
  }
  mount();

  var active=0;
  var navTimer=0;
  var hideTimer=0;
  var minimumVisibleUntil=0;

  function show(){
    mount();
    clearTimeout(hideTimer);
    overlay.classList.remove('gz-hide');
    minimumVisibleUntil=Math.max(minimumVisibleUntil,Date.now()+220);
  }
  function hide(){
    clearTimeout(hideTimer);
    var wait=Math.max(0,minimumVisibleUntil-Date.now());
    hideTimer=setTimeout(function(){
      if(active===0) overlay.classList.add('gz-hide');
    },wait);
  }
  function start(){active++;show()}
  function stop(){active=Math.max(0,active-1);if(active===0)hide()}
  window.GZLoading={show:show,hide:hide,start:start,stop:stop,isLoading:function(){return active>0}};

  function trackPromise(p){
    if (!p || typeof p.then!=='function') return p;
    start();
    return p.then(function(v){stop();return v;},function(e){stop();throw e;});
  }

  var nativeFetch=window.fetch;
  if(nativeFetch){
    window.fetch=function(){
      start();
      var p;
      try{p=nativeFetch.apply(this,arguments)}catch(e){stop();throw e}
      return p.then(function(r){stop();return r},function(e){stop();throw e});
    };
  }

  var XHR=window.XMLHttpRequest;
  if(XHR){
    var nativeOpen=XHR.prototype.open;
    var nativeSend=XHR.prototype.send;
    XHR.prototype.open=function(){
      this.__gzLoaderTracked=true;
      return nativeOpen.apply(this,arguments);
    };
    XHR.prototype.send=function(){
      var xhr=this;
      if(xhr.__gzLoaderTracked && !xhr.__gzLoaderStarted){
        xhr.__gzLoaderStarted=true;
        start();
        var done=false;
        var finish=function(){if(done)return;done=true;stop();};
        xhr.addEventListener('loadend',finish,{once:true});
        xhr.addEventListener('error',finish,{once:true});
        xhr.addEventListener('abort',finish,{once:true});
      }
      return nativeSend.apply(this,arguments);
    };
  }

  document.addEventListener('click',function(e){
    var a=e.target.closest&&e.target.closest('a');
    if(!a)return;
    var href=a.getAttribute('href')||'';
    if(!href||href.charAt(0)==='#'||href.indexOf('javascript:')===0||a.target==='_blank'||a.hasAttribute('download'))return;
    try{
      var u=new URL(href,location.href);
      if(u.origin!==location.origin)return;
    }catch(_){return}
    show();
    clearTimeout(navTimer);
    navTimer=setTimeout(function(){if(document.visibilityState==='visible'&&active===0)hide()},8000);
  },true);

  document.addEventListener('submit',function(e){
    var form=e.target;
    if(!form||form.hasAttribute('data-no-gz-loader'))return;
    show();
  },true);

  window.addEventListener('beforeunload',function(){show()});
  window.addEventListener('pageshow',function(){
    if(document.readyState==='complete' && active===0)hide();
  });
  window.addEventListener('load',function(){
    if(active===0)hide();
  });

  // Initial page load: keep the overlay until the document has loaded.
  if(document.readyState==='complete'){
    if(active===0)hide();
  } else {
    show();
  }
})();
