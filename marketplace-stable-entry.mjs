import app from './admin-vendor-capabilities-wrapper.mjs';

const LOADER_CSS = `
#gzAdminLoading{position:fixed;inset:0;z-index:2147483647;background:radial-gradient(circle at 50% 42%,#fff 0,#fff 42%,#fffaf7 72%,#fff 100%);display:flex;align-items:center;justify-content:center;overflow:hidden;opacity:1;visibility:visible;transition:opacity .35s ease,visibility .35s ease;font-family:Arial,Helvetica,sans-serif}
#gzAdminLoading.gz-hide{opacity:0;visibility:hidden;pointer-events:none}
.gz-load-orbit{position:relative;width:min(330px,72vw);height:min(330px,72vw);display:flex;align-items:center;justify-content:center}
.gz-load-orbit:before,.gz-load-orbit:after{content:"";position:absolute;border-radius:50%;inset:0;border:2px solid rgba(255,107,0,.10)}
.gz-load-orbit:after{inset:22px;border-color:rgba(255,107,0,.08)}
.gz-load-ring{position:absolute;inset:0;border-radius:50%;border:10px solid rgba(255,107,0,.10);border-top-color:#ff6b00;border-right-color:#ff8a22;animation:gzSpin 1.55s linear infinite;filter:drop-shadow(0 4px 14px rgba(255,107,0,.22))}
.gz-load-ring.two{inset:26px;border-width:4px;border-color:transparent transparent rgba(255,107,0,.20) #ffb36f;animation:gzSpinReverse 2.3s linear infinite}
.gz-load-ring.three{inset:50px;border-width:2px;border-style:dashed;border-color:rgba(255,107,0,.22);animation:gzSpin 7s linear infinite}
.gz-load-logo{position:relative;width:116px;height:116px;border-radius:30px;background:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 18px 55px rgba(0,0,0,.10),0 0 0 1px rgba(0,0,0,.04);font-weight:1000;font-size:58px;letter-spacing:-7px;color:#171717}
.gz-load-logo span{color:#ff6b00;font-size:48px;margin-left:-4px;font-style:italic}
.gz-load-logo:after{content:"";position:absolute;width:18px;height:18px;border-radius:50%;background:#fff;border:5px solid #ff6b00;right:-14px;top:10px;box-shadow:0 0 20px rgba(255,107,0,.55);animation:gzPulse 1.2s ease-in-out infinite}
.gz-load-copy{position:absolute;top:calc(100% + 28px);left:50%;transform:translateX(-50%);text-align:center;white-space:nowrap}
.gz-load-title{font-size:14px;letter-spacing:.38em;font-weight:900;color:#333;margin-left:.38em}
.gz-load-dots{display:inline-block;color:#ff6b00;letter-spacing:.12em;animation:gzDots 1.1s steps(4,end) infinite;width:34px;text-align:left}
.gz-load-sub{font-size:8px;letter-spacing:.42em;color:#aaa;margin:12px 0 0 .42em;font-weight:800}
.gz-load-bar{position:absolute;top:calc(100% + 91px);left:50%;transform:translateX(-50%);width:min(260px,62vw);height:12px;border-radius:999px;background:#ececec;overflow:hidden;box-shadow:inset 0 1px 2px rgba(0,0,0,.05)}
.gz-load-bar i{display:block;height:100%;width:62%;border-radius:inherit;background:linear-gradient(90deg,#ff6200,#ffad62,#ff6200);background-size:200% 100%;animation:gzProgress 1.35s ease-in-out infinite;box-shadow:0 0 15px rgba(255,107,0,.35)}
.gz-load-corner{position:absolute;font-size:7px;letter-spacing:.38em;color:#aaa;font-weight:900;line-height:1.9}.gz-load-corner b{display:block;color:#ff6b00;font-size:9px;letter-spacing:.1em;font-weight:900}.gz-load-corner.tl{top:32px;left:36px}.gz-load-corner.tr{top:32px;right:36px;text-align:right}.gz-load-corner.bl{bottom:32px;left:36px}.gz-load-corner.br{bottom:32px;right:36px;text-align:right}
@keyframes gzSpin{to{transform:rotate(360deg)}}@keyframes gzSpinReverse{to{transform:rotate(-360deg)}}@keyframes gzPulse{0%,100%{transform:scale(.88);opacity:.65}50%{transform:scale(1.08);opacity:1}}@keyframes gzDots{0%{width:8px}33%{width:17px}66%{width:26px}100%{width:34px}}@keyframes gzProgress{0%{transform:translateX(-105%);background-position:0 0}55%{transform:translateX(45%);background-position:100% 0}100%{transform:translateX(160%);background-position:0 0}}
@media(max-width:600px){.gz-load-corner{display:none}.gz-load-logo{width:96px;height:96px;font-size:48px}.gz-load-logo span{font-size:40px}.gz-load-bar{top:calc(100% + 86px)}}`;

const LOADER_BOOT = `<style id="gz-admin-loading-style">${LOADER_CSS}</style><script>(function(){
if(window.__gzGlobalLoader)return;window.__gzGlobalLoader=true;
var active=0,hideTimer=0,loaded=false,overlay;
function mount(){if(overlay&&overlay.isConnected)return;overlay=document.createElement('div');overlay.id='gzAdminLoading';overlay.setAttribute('aria-live','polite');overlay.setAttribute('aria-label','Loading GrabZone');overlay.innerHTML='<div class="gz-load-orbit"><div class="gz-load-ring"></div><div class="gz-load-ring two"></div><div class="gz-load-ring three"></div><div class="gz-load-logo">G<span>Z</span></div><div class="gz-load-copy"><div class="gz-load-title">PROCESSING <span class="gz-load-dots">...</span></div><div class="gz-load-sub">PLEASE WAIT A MOMENT</div></div><div class="gz-load-bar"><i></i></div></div><div class="gz-load-corner tl">MORE<br>THAN<br>JUST <b>GRABZONE</b></div><div class="gz-load-corner tr">SHOP<br>EXPLORE<br>ENJOY <b>ONLINE</b></div><div class="gz-load-corner bl">GRABZONE<br>ONLINE STORE <b>GRAB IT. LOVE IT.</b></div><div class="gz-load-corner br">A BETTER<br>SHOPPING<br>EXPERIENCE <b>GZ</b></div>';(document.body||document.documentElement).appendChild(overlay)}
function show(){mount();clearTimeout(hideTimer);overlay.classList.remove('gz-hide')}
function hide(){clearTimeout(hideTimer);hideTimer=setTimeout(function(){if(active===0&&loaded)overlay.classList.add('gz-hide')},180)}
function start(){active++;show()}
function stop(){active=Math.max(0,active-1);hide()}
window.GZLoading={show:show,hide:hide,start:start,stop:stop,isLoading:function(){return active>0||!loaded}};
show();
var nativeFetch=window.fetch;if(nativeFetch){window.fetch=function(){start();var p;try{p=nativeFetch.apply(this,arguments)}catch(e){stop();throw e}return Promise.resolve(p).then(function(r){stop();return r},function(e){stop();throw e})}}
var XHR=window.XMLHttpRequest;if(XHR){var open=XHR.prototype.open,send=XHR.prototype.send;XHR.prototype.open=function(){return open.apply(this,arguments)};XHR.prototype.send=function(){start();var x=this,done=false;function finish(){if(done)return;done=true;stop();x.removeEventListener('loadend',finish)}x.addEventListener('loadend',finish,{once:true});try{return send.apply(this,arguments)}catch(e){finish();throw e}}}
document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a');if(a){var h=a.getAttribute('href')||'';if(h&&!h.startsWith('#')&&a.target!=='_blank'&&!a.hasAttribute('download'))show()}var f=e.target.closest&&e.target.closest('button[type=submit],input[type=submit]');if(f)show()},{capture:true});
document.addEventListener('submit',function(){show()},{capture:true});
window.addEventListener('beforeunload',function(){show()});
window.addEventListener('load',function(){loaded=true;hide()});
if(document.readyState==='complete')loaded=true;
})();</script>`;

async function enhanceHtml(request,response){
  if(!response.ok)return response;
  const type=response.headers.get('content-type')||'';
  if(!type.toLowerCase().includes('text/html'))return response;
  const html=await response.text();
  if(html.includes('id="gzAdminLoading"')||html.includes('__gzGlobalLoader'))return new Response(html,response);
  const marker=/<head[^>]*>/i;
  const enhanced=marker.test(html)?html.replace(marker,m=>m+LOADER_BOOT):LOADER_BOOT+html;
  const headers=new Headers(response.headers);
  headers.set('Cache-Control','no-store, must-revalidate');
  headers.delete('Content-Length');
  return new Response(enhanced,{status:response.status,statusText:response.statusText,headers});
}

export default {async fetch(request,env,ctx){const response=await app.fetch(request,env,ctx);return enhanceHtml(request,response)}};
