(()=>{'use strict';
const ID='gzRedeemPolishV1';
function styles(){if(document.getElementById(ID))return;const s=document.createElement('style');s.id=ID;s.textContent=`
/* Keep generated voucher content readable after the redeem card becomes dark. */
.gz-redeem-premium .gz-readable-voucher{background:#fff!important;color:#17181b!important;border:1px solid #e1e4e8!important;box-shadow:0 12px 30px rgba(0,0,0,.08)!important}
.gz-redeem-premium .gz-readable-voucher *{color:#17181b!important;text-shadow:none!important}
.gz-redeem-premium .gz-readable-voucher button{background:#15171b!important;color:#fff!important;border-color:#15171b!important}
.gz-redeem-premium .gz-readable-voucher input,.gz-redeem-premium .gz-readable-voucher code{background:#f8f9fb!important;color:#111318!important;border:1px solid #cfd4da!important}
.gz-redeem-premium .gz-readable-voucher .gz-voucher-code{color:#111318!important;background:#f8f9fb!important}
/* More expressive PIN motion: circular boxes, rotating ring and a small orbit on each new digit. */
.gz-rf-digit{width:58px!important;height:58px!important;border-radius:50%!important;position:relative;overflow:visible!important}
.gz-rf-digit:before{content:"";position:absolute;inset:-5px;border-radius:50%;border:1px solid transparent;pointer-events:none}
.gz-rf-digit.filled{animation:gzPolishDigit .58s cubic-bezier(.18,.88,.25,1) both!important}
.gz-rf-digit.filled:before{border-color:#ff7b2455;animation:gzPolishRing .7s ease-out both}
.gz-rf-digit.active{transform:translateY(-5px) scale(1.04)!important}
.gz-rf-digit:nth-child(2).filled{animation-delay:.03s!important}.gz-rf-digit:nth-child(3).filled{animation-delay:.06s!important}.gz-rf-digit:nth-child(4).filled{animation-delay:.09s!important}.gz-rf-digit:nth-child(5).filled{animation-delay:.12s!important}.gz-rf-digit:nth-child(6).filled{animation-delay:.15s!important}
.gz-rf-lock{position:relative!important}
.gz-rf-lock:after{content:"";position:absolute;inset:-10px;border-radius:50%;border:1px dashed #ff913f55;animation:gzPolishOrbit 5s linear infinite!important}
.gz-rf-card.checking .gz-rf-lock:after{animation-duration:.65s!important;border-color:#ffad69aa}
.gz-rf-card.is-error .gz-rf-digit,.gz-rf-card.error .gz-rf-digit{animation:gzPolishError .5s!important}
.gz-rf-card.is-success .gz-rf-digit,.gz-rf-card.success .gz-rf-digit{animation:gzPolishSuccess .55s cubic-bezier(.2,.9,.2,1) both!important}
@keyframes gzPolishDigit{0%{transform:rotate(-180deg) scale(.35);opacity:0}55%{transform:rotate(18deg) scale(1.12);opacity:1}100%{transform:rotate(0) scale(1);opacity:1}}
@keyframes gzPolishRing{0%{transform:scale(.6);opacity:1}100%{transform:scale(1.45);opacity:0}}
@keyframes gzPolishOrbit{to{transform:rotate(360deg)}}
@keyframes gzPolishError{0%,100%{transform:translateX(0)}20%{transform:translateX(-8px) rotate(-8deg)}40%{transform:translateX(8px) rotate(8deg)}60%{transform:translateX(-6px) rotate(-5deg)}80%{transform:translateX(5px) rotate(4deg)}}
@keyframes gzPolishSuccess{0%{transform:scale(.65) rotate(-90deg)}65%{transform:scale(1.12) rotate(8deg)}100%{transform:scale(1) rotate(0)}}
@media(max-width:520px){.gz-rf-digit{width:50px!important;height:50px!important}.gz-rf-digits{gap:9px!important}}
`;
document.head.appendChild(s)}
function markVoucher(){const root=document.querySelector('.gz-redeem-premium');if(!root)return;const all=[...root.querySelectorAll('*')];const hit=all.find(el=>{const t=(el.textContent||'').trim().toLowerCase();return /reward voucher created|voucher created/.test(t)&&t.length<140});if(!hit)return;let box=hit;for(let i=0;i<4&&box.parentElement&&box.parentElement!==root;i++)box=box.parentElement;if(box&&box!==root)box.classList.add('gz-readable-voucher')}
function boot(){styles();markVoucher();let n=0;const timer=setInterval(()=>{markVoucher();if(++n>80)clearInterval(timer)},250);new MutationObserver(markVoucher).observe(document.body,{childList:true,subtree:true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();