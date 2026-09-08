(()=>{const id='gzRedeemMotionV2';if(document.getElementById(id))return;const s=document.createElement('style');s.id=id;s.textContent=`
/* Advanced verification motion: activates from the existing redemption states. */
.gz-pin-checking .gz-pin-digit{animation:gzBoxLift .72s cubic-bezier(.2,.85,.2,1) both!important;border-color:#ff7a00!important;box-shadow:0 0 0 4px #ff7a0010,0 15px 30px #ff7a0020!important}
.gz-pin-checking .gz-pin-digit:nth-child(1){animation-delay:0s}.gz-pin-checking .gz-pin-digit:nth-child(2){animation-delay:.07s}.gz-pin-checking .gz-pin-digit:nth-child(3){animation-delay:.14s}.gz-pin-checking .gz-pin-digit:nth-child(4){animation-delay:.21s}.gz-pin-checking .gz-pin-digit:nth-child(5){animation-delay:.28s}.gz-pin-checking .gz-pin-digit:nth-child(6){animation-delay:.35s}
.gz-pin-checking .gz-pin-digits{animation:gzDigitsFloat .9s ease-in-out both}
.gz-pin-checking .gz-pin-card{overflow:hidden}
.gz-pin-checking .gz-pin-icon:before{content:'';position:absolute;inset:-16px;border-radius:50%;border:1px dashed #ff7a0070;animation:gzOrbit 1.2s linear infinite}
.gz-pin-checking .gz-pin-icon:after{content:'';position:absolute;inset:-29px;border-radius:50%;border:1px solid #ff7a0020;animation:gzRing 1.3s ease-out infinite}
.gz-pin-checking .gz-pin-status{animation:gzStatus 1s ease-in-out infinite}
.gz-pin-card.is-error .gz-pin-digit{animation:gzWrong .5s both!important}.gz-pin-card.is-success .gz-pin-digit{animation:gzCorrect .58s cubic-bezier(.2,.9,.2,1) both!important}
.gz-pin-card.is-success .gz-pin-digit:nth-child(2){animation-delay:.05s}.gz-pin-card.is-success .gz-pin-digit:nth-child(3){animation-delay:.10s}.gz-pin-card.is-success .gz-pin-digit:nth-child(4){animation-delay:.15s}.gz-pin-card.is-success .gz-pin-digit:nth-child(5){animation-delay:.20s}.gz-pin-card.is-success .gz-pin-digit:nth-child(6){animation-delay:.25s}
.gz-pin-result.show .gz-result-ring{animation:gzResult .8s cubic-bezier(.2,.9,.2,1) both!important}.gz-pin-result.show h3{animation:gzText .5s .12s both}.gz-pin-result.show p{animation:gzText .5s .2s both}.gz-pin-result.show .gz-result-btn{animation:gzText .5s .28s both}
@keyframes gzBoxLift{0%{transform:translateY(0) rotate(0) scale(1);opacity:.7}35%{transform:translateY(-24px) rotate(-7deg) scale(1.08);box-shadow:0 18px 35px #ff7a0030}70%{transform:translateY(5px) rotate(4deg) scale(.98)}100%{transform:translateY(0) rotate(0) scale(1);opacity:1}}
@keyframes gzDigitsFloat{0%{transform:scale(.96)}45%{transform:scale(1.03) translateY(-4px)}100%{transform:none}}
@keyframes gzOrbit{to{transform:rotate(360deg)}}@keyframes gzRing{0%{transform:scale(.7);opacity:0}35%{opacity:1}100%{transform:scale(1.15);opacity:0}}
@keyframes gzStatus{50%{opacity:.45;transform:translateY(-1px)}}@keyframes gzWrong{20%{transform:translateX(-9px) rotate(-4deg)}40%{transform:translateX(9px) rotate(4deg)}60%{transform:translateX(-6px)}80%{transform:translateX(5px)}100%{transform:none}}
@keyframes gzCorrect{0%{transform:scale(.65) rotate(-15deg);opacity:.2}60%{transform:scale(1.14) rotate(7deg)}100%{transform:none;opacity:1}}
@keyframes gzResult{0%{transform:scale(.25) rotate(-20deg);opacity:0}55%{transform:scale(1.16) rotate(5deg)}100%{transform:none;opacity:1}}@keyframes gzText{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
@media(max-width:520px){.gz-pin-checking .gz-pin-digit{animation-duration:.65s!important}.gz-pin-checking .gz-pin-icon:before{inset:-13px}.gz-pin-checking .gz-pin-icon:after{inset:-23px}}
@media(prefers-reduced-motion:reduce){.gz-pin-checking .gz-pin-digit,.gz-pin-checking .gz-pin-digits,.gz-pin-checking .gz-pin-icon:before,.gz-pin-checking .gz-pin-icon:after,.gz-pin-checking .gz-pin-status,.gz-pin-result.show .gz-result-ring,.gz-pin-result.show h3,.gz-pin-result.show p,.gz-pin-result.show .gz-result-btn{animation:none!important}}
`;document.head.appendChild(s)})();