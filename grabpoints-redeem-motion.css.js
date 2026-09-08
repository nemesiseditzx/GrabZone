(()=>{const id='gzRedeemMotionV2';if(document.getElementById(id))return;const s=document.createElement('style');s.id=id;s.textContent=`
/* Advanced verification motion — matches the current gz-rf redemption DOM. */
.gz-rf-pin-checking .gz-rf-pin-digit{animation:gzBoxLift .72s cubic-bezier(.2,.85,.2,1) both!important;border-color:#ff7a00!important;box-shadow:0 0 0 4px #ff7a0010,0 15px 30px #ff7a0020!important}
.gz-rf-pin-checking .gz-rf-pin-digit:nth-child(1){animation-delay:0s}.gz-rf-pin-checking .gz-rf-pin-digit:nth-child(2){animation-delay:.07s}.gz-rf-pin-checking .gz-rf-pin-digit:nth-child(3){animation-delay:.14s}.gz-rf-pin-checking .gz-rf-pin-digit:nth-child(4){animation-delay:.21s}.gz-rf-pin-checking .gz-rf-pin-digit:nth-child(5){animation-delay:.28s}.gz-rf-pin-checking .gz-rf-pin-digit:nth-child(6){animation-delay:.35s}
.gz-rf-pin-checking .gz-rf-pin-digits{animation:gzDigitsFloat .9s ease-in-out both}.gz-rf-pin-checking .gz-rf-pin-card{overflow:hidden}.gz-rf-pin-checking .gz-rf-pin-icon{position:relative}.gz-rf-pin-checking .gz-rf-pin-icon:before{content:'';position:absolute;inset:-16px;border-radius:50%;border:1px dashed #ff7a0070;animation:gzOrbit 1.2s linear infinite}.gz-rf-pin-checking .gz-rf-pin-icon:after{content:'';position:absolute;inset:-29px;border-radius:50%;border:1px solid #ff7a0020;animation:gzRing 1.3s ease-out infinite}.gz-rf-pin-checking .gz-rf-pin-status{animation:gzStatus 1s ease-in-out infinite}.gz-rf-pin-card.is-error .gz-rf-pin-digit{animation:gzWrong .5s both!important}.gz-rf-pin-card.is-success .gz-rf-pin-digit{animation:gzCorrect .58s cubic-bezier(.2,.9,.2,1) both!important}.gz-rf-pin-card.is-success .gz-rf-pin-digit:nth-child(2){animation-delay:.05s}.gz-rf-pin-card.is-success .gz-rf-pin-digit:nth-child(3){animation-delay:.10s}.gz-rf-pin-card.is-success .gz-rf-pin-digit:nth-child(4){animation-delay:.15s}.gz-rf-pin-card.is-success .gz-rf-pin-digit:nth-child(5){animation-delay:.20s}.gz-rf-pin-card.is-success .gz-rf-pin-digit:nth-child(6){animation-delay:.25s}
.gz-rf-pin-result.show .gz-rf-result-ring{animation:gzResult .8s cubic-bezier(.2,.9,.2,1) both!important}.gz-rf-pin-result.show h3{animation:gzText .5s .12s both}.gz-rf-pin-result.show p{animation:gzText .5s .2s both}.gz-rf-pin-result.show .gz-rf-result-btn{animation:gzText .5s .28s both}
@keyframes gzBoxLift{0%{transform:translateY(0) rotate(0) scale(1);opacity:.7}35%{transform:translateY(-24px) rotate(-7deg) scale(1.08);box-shadow:0 18px 35px #ff7a0030}70%{transform:translateY(5px) rotate(4deg) scale(.98)}100%{transform:translateY(0) rotate(0) scale(1);opacity:1}}@keyframes gzDigitsFloat{0%{transform:scale(.96)}45%{transform:scale(1.03) translateY(-4px)}100%{transform:none}}@keyframes gzOrbit{to{transform:rotate(360deg)}}@keyframes gzRing{0%{transform:scale(.7);opacity:0}35%{opacity:1}100%{transform:scale(1.15);opacity:0}}@keyframes gzStatus{50%{opacity:.45;transform:translateY(-1px)}}@keyframes gzWrong{20%{transform:translateX(-9px) rotate(-4deg)}40%{transform:translateX(9px) rotate(4deg)}60%{transform:translateX(-6px)}80%{transform:translateX(5px)}100%{transform:none}}@keyframes gzCorrect{0%{transform:scale(.65) rotate(-15deg);opacity:.2}60%{transform:scale(1.14) rotate(7deg)}100%{transform:none;opacity:1}}@keyframes gzResult{0%{transform:scale(.25) rotate(-20deg);opacity:0}55%{transform:scale(1.16) rotate(5deg)}100%{transform:none;opacity:1}}@keyframes gzText{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
@media(max-width:520px){.gz-rf-pin-checking .gz-rf-pin-digit{animation-duration:.65s!important}.gz-rf-pin-checking .gz-rf-pin-icon:before{inset:-13px}.gz-rf-pin-checking .gz-rf-pin-icon:after{inset:-23px}}@media(prefers-reduced-motion:reduce){.gz-rf-pin-checking .gz-rf-pin-digit,.gz-rf-pin-checking .gz-rf-pin-digits,.gz-rf-pin-checking .gz-rf-pin-icon:before,.gz-rf-pin-checking .gz-rf-pin-icon:after,.gz-rf-pin-checking .gz-rf-pin-status,.gz-rf-pin-result.show .gz-rf-result-ring,.gz-rf-pin-result.show h3,.gz-rf-pin-result.show p,.gz-rf-pin-result.show .gz-rf-result-btn{animation:none!important}}

/* =========================================================
   FORGOT PIN — PREMIUM RECOVERY CARD
   Robustly targets the rendered Rewards recovery view.
   No rewards logic is changed here.
========================================================= */
.gz-forgot-ui{position:relative!important;overflow:hidden!important;background:linear-gradient(145deg,#fff 0%,#fffaf5 54%,#fff3e7 100%)!important;border:1px solid #eadfd6!important;border-radius:22px!important;padding:28px!important;box-shadow:0 20px 55px rgba(38,25,15,.09)!important;isolation:isolate;animation:gzForgotEnter .72s cubic-bezier(.16,1,.3,1) both}
.gz-forgot-ui:before{content:'';position:absolute;z-index:-1;width:260px;height:260px;right:-125px;top:-145px;border-radius:50%;background:radial-gradient(circle,#ff6b0040 0,#ff6b0014 42%,transparent 70%);animation:gzForgotOrb 4.8s ease-in-out infinite;pointer-events:none}
.gz-forgot-ui:after{content:'';position:absolute;z-index:-1;width:190px;height:190px;left:-130px;bottom:-130px;border-radius:50%;border:1px solid #ff6b0018;box-shadow:0 0 0 28px #ff6b0008,0 0 0 56px #ff6b0004;animation:gzForgotOrbit 7s linear infinite;pointer-events:none}
.gz-forgot-ui .gz-forgot-kicker{display:inline-flex;align-items:center;gap:7px;margin:0 0 12px;padding:7px 10px;border:1px solid #f0ddd0;border-radius:999px;background:#fff;color:#c8550b;font:900 9px/1 system-ui;letter-spacing:.13em;text-transform:uppercase;animation:gzForgotDrop .55s .05s both}
.gz-forgot-ui .gz-forgot-kicker i{width:7px;height:7px;border-radius:50%;background:#ff6b00;box-shadow:0 0 0 5px #ff6b0010,0 0 14px #ff6b0060}
.gz-forgot-ui .gz-forgot-lock{position:relative;width:58px;height:58px;margin:0 0 14px;border-radius:18px;display:grid;place-items:center;background:#171717;color:#fff;font-size:27px;box-shadow:0 14px 28px rgba(17,17,17,.16);animation:gzForgotLock .78s .12s cubic-bezier(.2,.9,.2,1) both}
.gz-forgot-ui .gz-forgot-lock:before,.gz-forgot-ui .gz-forgot-lock:after{content:'';position:absolute;border-radius:50%;pointer-events:none}.gz-forgot-ui .gz-forgot-lock:before{inset:-8px;border:1px solid #ff6b0050;animation:gzForgotPulse 1.8s ease-out infinite}.gz-forgot-ui .gz-forgot-lock:after{inset:-17px;border:1px dashed #ff6b0028;animation:gzForgotOrbit 5s linear infinite reverse}
.gz-forgot-ui h1,.gz-forgot-ui h2,.gz-forgot-ui h3{position:relative;z-index:1;letter-spacing:-.035em}.gz-forgot-ui h1,.gz-forgot-ui h2{font-weight:900}.gz-forgot-ui p{position:relative;z-index:1;color:#6f6259!important}.gz-forgot-ui .gz-forgot-copy{margin-bottom:15px}
.gz-forgot-ui .gz-forgot-steps{display:flex;align-items:center;gap:7px;margin:17px 0 16px}.gz-forgot-ui .gz-forgot-steps span{width:27px;height:27px;border-radius:50%;display:grid;place-items:center;background:#f2efec;color:#81766e;border:1px solid #e3ddd7;font:900 10px system-ui;transition:.3s}.gz-forgot-ui .gz-forgot-steps span.active{background:#ff6b00;color:#fff;border-color:#ff6b00;box-shadow:0 0 0 6px #ff6b0010}.gz-forgot-ui .gz-forgot-steps i{height:1px;flex:0 0 36px;background:#ddd5cf}
.gz-forgot-ui .gz-forgot-form{display:grid;gap:10px}.gz-forgot-ui input{position:relative;z-index:1!important;width:100%!important;border:1.5px solid #ddd5cf!important;background:#fff!important;border-radius:15px!important;padding:15px 16px!important;min-height:52px!important;outline:none!important;transition:border-color .25s,box-shadow .25s,transform .25s!important}.gz-forgot-ui input:focus{border-color:#ff6b00!important;box-shadow:0 0 0 5px #ff6b0012,0 12px 28px #ff6b000d!important;transform:translateY(-1px)}
.gz-forgot-ui button{position:relative;z-index:1;min-height:52px!important;border-radius:15px!important;transition:transform .25s cubic-bezier(.16,1,.3,1),box-shadow .25s,background .2s!important}.gz-forgot-ui button:not(.gz-forgot-secondary){background:linear-gradient(100deg,#ff9800,#ff5b00)!important;color:#111!important;box-shadow:0 13px 30px #ff6b0026!important}.gz-forgot-ui button:not(.gz-forgot-secondary):hover{transform:translateY(-2px)!important;box-shadow:0 18px 34px #ff6b0030!important}.gz-forgot-ui button:not(.gz-forgot-secondary):active{transform:translateY(1px) scale(.985)!important}.gz-forgot-ui .gz-forgot-secondary{background:#fff!important;color:#171717!important;border:1px solid #ddd5cf!important;box-shadow:none!important}.gz-forgot-ui .gz-rewards-msg{position:relative;z-index:2;min-height:20px}
@keyframes gzForgotEnter{from{opacity:0;transform:translateY(26px) scale(.975);clip-path:inset(8% 0 0 round 22px)}to{opacity:1;transform:none;clip-path:inset(0 round 22px)}}@keyframes gzForgotDrop{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}@keyframes gzForgotLock{0%{opacity:0;transform:translateY(20px) rotate(-14deg) scale(.72)}55%{opacity:1;transform:translateY(-5px) rotate(5deg) scale(1.08)}100%{transform:none}}@keyframes gzForgotPulse{0%{transform:scale(.72);opacity:0}35%{opacity:1}100%{transform:scale(1.16);opacity:0}}@keyframes gzForgotOrb{0%,100%{transform:scale(.78);opacity:.55}50%{transform:scale(1.15);opacity:1}}@keyframes gzForgotOrbit{to{transform:rotate(360deg)}}
@media(max-width:760px){.gz-forgot-ui{padding:21px!important;border-radius:19px!important}.gz-forgot-ui .gz-forgot-lock{width:52px;height:52px;font-size:24px;border-radius:16px}.gz-forgot-ui .gz-forgot-steps i{flex-basis:22px}.gz-forgot-ui input,.gz-forgot-ui button{min-height:50px!important}}@media(prefers-reduced-motion:reduce){.gz-forgot-ui,.gz-forgot-ui:before,.gz-forgot-ui:after,.gz-forgot-ui .gz-forgot-kicker,.gz-forgot-ui .gz-forgot-lock,.gz-forgot-ui .gz-forgot-lock:before,.gz-forgot-ui .gz-forgot-lock:after{animation:none!important}}
`;
document.head.appendChild(s)})();

(()=>{
  if(document.getElementById('gzForgotPinMotionV2'))return;
  const s=document.createElement('style');s.id='gzForgotPinMotionV2';s.textContent=`
  /* Runtime decorator: detect the actual recovery view and normalize it. */
  #gzRewardsApp .gz-forgot-ui .gz-recovery-content{position:relative;z-index:1}
  #gzRewardsApp .gz-forgot-ui .gz-rewards-grid{display:grid;gap:10px;margin-top:14px}
  #gzRewardsApp .gz-forgot-ui .gz-rewards-grid>*{min-width:0}
  #gzRewardsApp .gz-forgot-ui .gz-forgot-copy{max-width:780px}
  `;document.head.appendChild(s);

  function decorate(){
    const root=document.getElementById('gzRewardsApp');
    if(!root)return;
    const text=[...root.querySelectorAll('h1,h2,h3,p,div,span')];
    const heading=text.find(el=>{const t=(el.textContent||'').replace(/\\s+/g,' ').trim();return /forgot your pin/i.test(t)&&t.length<100});
    if(!heading)return;
    let box=heading;
    for(let i=0;i<10&&box;i++,box=box.parentElement){
      if(box.querySelector?.('input')&&box.querySelector?.('button'))break;
    }
    if(!box||!box.querySelector?.('input')||!box.querySelector?.('button'))return;
    if(box.dataset.gzForgotDecorated==='2')return;
    box.dataset.gzForgotDecorated='2';
    box.classList.add('gz-forgot-ui');
    const content=document.createElement('div');content.className='gz-recovery-content';
    while(box.firstChild)content.appendChild(box.firstChild);
    box.appendChild(content);
    const kicker=document.createElement('div');kicker.className='gz-forgot-kicker';kicker.innerHTML='<i></i><span>SECURE PIN RECOVERY</span>';content.insertBefore(kicker,content.firstChild);
    const lock=document.createElement('div');lock.className='gz-forgot-lock';lock.textContent='🔐';content.insertBefore(lock,kicker.nextSibling);
    const steps=document.createElement('div');steps.className='gz-forgot-steps';steps.innerHTML='<span class="active">1</span><i></i><span>2</span><i></i><span>3</span>';content.insertBefore(steps,heading);
    const p=[...content.querySelectorAll('p')].find(x=>/verification code|email attached|registered rewards email/i.test(x.textContent||''));if(p)p.classList.add('gz-forgot-copy');
    const grid=content.querySelector('.gz-rewards-grid');if(grid)grid.classList.add('gz-forgot-form');
    content.querySelectorAll('button').forEach(btn=>{if(/back to login/i.test(btn.textContent||''))btn.classList.add('gz-forgot-secondary')});
  }
  const run=()=>requestAnimationFrame(decorate);
  run();
  const root=document.getElementById('gzRewardsApp');
  if(root)new MutationObserver(run).observe(root,{childList:true,subtree:true});
})();