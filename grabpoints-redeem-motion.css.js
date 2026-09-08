(()=>{const id='gzRedeemMotionV2';if(document.getElementById(id))return;const s=document.createElement('style');s.id=id;s.textContent=`
/* Advanced verification motion — matches the current gz-rf redemption DOM. */
.gz-rf-pin-checking .gz-rf-pin-digit{animation:gzBoxLift .72s cubic-bezier(.2,.85,.2,1) both!important;border-color:#ff7a00!important;box-shadow:0 0 0 4px #ff7a0010,0 15px 30px #ff7a0020!important}
.gz-rf-pin-checking .gz-rf-pin-digit:nth-child(1){animation-delay:0s}.gz-rf-pin-checking .gz-rf-pin-digit:nth-child(2){animation-delay:.07s}.gz-rf-pin-checking .gz-rf-pin-digit:nth-child(3){animation-delay:.14s}.gz-rf-pin-checking .gz-rf-pin-digit:nth-child(4){animation-delay:.21s}.gz-rf-pin-checking .gz-rf-pin-digit:nth-child(5){animation-delay:.28s}.gz-rf-pin-checking .gz-rf-pin-digit:nth-child(6){animation-delay:.35s}
.gz-rf-pin-checking .gz-rf-pin-digits{animation:gzDigitsFloat .9s ease-in-out both}.gz-rf-pin-checking .gz-rf-pin-card{overflow:hidden}.gz-rf-pin-checking .gz-rf-pin-icon{position:relative}.gz-rf-pin-checking .gz-rf-pin-icon:before{content:'';position:absolute;inset:-16px;border-radius:50%;border:1px dashed #ff7a0070;animation:gzOrbit 1.2s linear infinite}.gz-rf-pin-checking .gz-rf-pin-icon:after{content:'';position:absolute;inset:-29px;border-radius:50%;border:1px solid #ff7a0020;animation:gzRing 1.3s ease-out infinite}.gz-rf-pin-checking .gz-rf-pin-status{animation:gzStatus 1s ease-in-out infinite}.gz-rf-pin-card.is-error .gz-rf-pin-digit{animation:gzWrong .5s both!important}.gz-rf-pin-card.is-success .gz-rf-pin-digit{animation:gzCorrect .58s cubic-bezier(.2,.9,.2,1) both!important}.gz-rf-pin-card.is-success .gz-rf-pin-digit:nth-child(2){animation-delay:.05s}.gz-rf-pin-card.is-success .gz-rf-pin-digit:nth-child(3){animation-delay:.10s}.gz-rf-pin-card.is-success .gz-rf-pin-digit:nth-child(4){animation-delay:.15s}.gz-rf-pin-card.is-success .gz-rf-pin-digit:nth-child(5){animation-delay:.20s}.gz-rf-pin-card.is-success .gz-rf-pin-digit:nth-child(6){animation-delay:.25s}
.gz-rf-pin-result.show .gz-rf-result-ring{animation:gzResult .8s cubic-bezier(.2,.9,.2,1) both!important}.gz-rf-pin-result.show h3{animation:gzText .5s .12s both}.gz-rf-pin-result.show p{animation:gzText .5s .2s both}.gz-rf-pin-result.show .gz-rf-result-btn{animation:gzText .5s .28s both}
@keyframes gzBoxLift{0%{transform:translateY(0) rotate(0) scale(1);opacity:.7}35%{transform:translateY(-24px) rotate(-7deg) scale(1.08);box-shadow:0 18px 35px #ff7a0030}70%{transform:translateY(5px) rotate(4deg) scale(.98)}100%{transform:translateY(0) rotate(0) scale(1);opacity:1}}@keyframes gzDigitsFloat{0%{transform:scale(.96)}45%{transform:scale(1.03) translateY(-4px)}100%{transform:none}}@keyframes gzOrbit{to{transform:rotate(360deg)}}@keyframes gzRing{0%{transform:scale(.7);opacity:0}35%{opacity:1}100%{transform:scale(1.15);opacity:0}}@keyframes gzStatus{50%{opacity:.45;transform:translateY(-1px)}}@keyframes gzWrong{20%{transform:translateX(-9px) rotate(-4deg)}40%{transform:translateX(9px) rotate(4deg)}60%{transform:translateX(-6px)}80%{transform:translateX(5px)}100%{transform:none}}@keyframes gzCorrect{0%{transform:scale(.65) rotate(-15deg);opacity:.2}60%{transform:scale(1.14) rotate(7deg)}100%{transform:none;opacity:1}}@keyframes gzResult{0%{transform:scale(.25) rotate(-20deg);opacity:0}55%{transform:scale(1.16) rotate(5deg)}100%{transform:none;opacity:1}}@keyframes gzText{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
@media(max-width:520px){.gz-rf-pin-checking .gz-rf-pin-digit{animation-duration:.65s!important}.gz-rf-pin-checking .gz-rf-pin-icon:before{inset:-13px}.gz-rf-pin-checking .gz-rf-pin-icon:after{inset:-23px}}@media(prefers-reduced-motion:reduce){.gz-rf-pin-checking .gz-rf-pin-digit,.gz-rf-pin-checking .gz-rf-pin-digits,.gz-rf-pin-checking .gz-rf-pin-icon:before,.gz-rf-pin-checking .gz-rf-pin-icon:after,.gz-rf-pin-checking .gz-rf-pin-status,.gz-rf-pin-result.show .gz-rf-result-ring,.gz-rf-pin-result.show h3,.gz-rf-pin-result.show p,.gz-rf-pin-result.show .gz-rf-result-btn{animation:none!important}}
`;document.head.appendChild(s)})();

(()=>{
  if(document.getElementById('gzForgotPinMotionV3'))return;
  const s=document.createElement('style');s.id='gzForgotPinMotionV3';s.textContent=`
  /* Premium Rewards PIN-recovery experience. Handles every recovery step. */
  #gzRewardsApp .gz-forgot-ui{position:relative!important;overflow:hidden!important;isolation:isolate;background:linear-gradient(145deg,#fff 0%,#fffaf5 58%,#fff2e5 100%)!important;border:1px solid #eadfd6!important;border-radius:22px!important;padding:28px!important;box-shadow:0 20px 55px rgba(38,25,15,.09)!important;animation:gzRecoveryEnter .68s cubic-bezier(.16,1,.3,1) both}
  #gzRewardsApp .gz-forgot-ui:before{content:'';position:absolute;z-index:-1;width:300px;height:300px;right:-150px;top:-160px;border-radius:50%;background:radial-gradient(circle,#ff6b0042 0,#ff6b0014 40%,transparent 70%);animation:gzRecoveryGlow 4s ease-in-out infinite;pointer-events:none}
  #gzRewardsApp .gz-forgot-ui:after{content:'';position:absolute;z-index:-1;width:180px;height:180px;left:-125px;bottom:-125px;border:1px solid #ff6b0025;border-radius:50%;box-shadow:0 0 0 26px #ff6b0008,0 0 0 52px #ff6b0004;animation:gzRecoveryOrbit 8s linear infinite;pointer-events:none}
  #gzRewardsApp .gz-forgot-ui .gz-recovery-inner{position:relative;z-index:1}
  #gzRewardsApp .gz-forgot-kicker{display:inline-flex;align-items:center;gap:8px;margin:0 0 14px;padding:7px 11px;border:1px solid #f0ddd0;border-radius:999px;background:#fff;color:#c8550b;font:900 9px/1 system-ui;letter-spacing:.13em;text-transform:uppercase;animation:gzRecoveryDrop .48s .04s both}
  #gzRewardsApp .gz-forgot-kicker i{width:7px;height:7px;border-radius:50%;background:#ff6b00;box-shadow:0 0 0 5px #ff6b0010,0 0 14px #ff6b0060}
  #gzRewardsApp .gz-forgot-lock{position:relative;width:58px;height:58px;margin:0 0 14px;border-radius:18px;display:grid;place-items:center;background:#171717;color:#fff;font-size:27px;box-shadow:0 14px 28px rgba(17,17,17,.16);animation:gzRecoveryLock .72s .08s cubic-bezier(.2,.9,.2,1) both}
  #gzRewardsApp .gz-forgot-lock:before,#gzRewardsApp .gz-forgot-lock:after{content:'';position:absolute;border-radius:50%;pointer-events:none}
  #gzRewardsApp .gz-forgot-lock:before{inset:-8px;border:1px solid #ff6b0050;animation:gzRecoveryPulse 1.7s ease-out infinite}
  #gzRewardsApp .gz-forgot-lock:after{inset:-17px;border:1px dashed #ff6b0028;animation:gzRecoveryOrbit 5s linear infinite reverse}
  #gzRewardsApp .gz-forgot-ui h1,#gzRewardsApp .gz-forgot-ui h2,#gzRewardsApp .gz-forgot-ui h3{position:relative;z-index:1;letter-spacing:-.035em;font-weight:900}
  #gzRewardsApp .gz-forgot-ui p{position:relative;z-index:1;color:#6f6259!important}
  #gzRewardsApp .gz-forgot-copy{max-width:850px;margin-bottom:15px}
  #gzRewardsApp .gz-forgot-steps{display:flex;align-items:center;gap:7px;margin:17px 0 16px}
  #gzRewardsApp .gz-forgot-steps span{width:28px;height:28px;border-radius:50%;display:grid;place-items:center;background:#f2efec;color:#81766e;border:1px solid #e3ddd7;font:900 10px system-ui;transition:.3s}
  #gzRewardsApp .gz-forgot-steps span.active{background:#ff6b00;color:#fff;border-color:#ff6b00;box-shadow:0 0 0 6px #ff6b0010;animation:gzStepPop .5s cubic-bezier(.2,.9,.2,1) both}
  #gzRewardsApp .gz-forgot-steps i{height:1px;flex:0 0 36px;background:#ddd5cf}
  #gzRewardsApp .gz-forgot-ui .gz-rewards-grid{display:grid;gap:10px;margin-top:14px}
  #gzRewardsApp .gz-forgot-ui input{position:relative;z-index:1;width:100%!important;min-height:52px!important;border:1.5px solid #ddd5cf!important;background:#fff!important;border-radius:15px!important;padding:15px 16px!important;outline:none!important;transition:border-color .25s,box-shadow .25s,transform .25s!important;animation:gzRecoveryField .55s .12s both}
  #gzRewardsApp .gz-forgot-ui input:focus{border-color:#ff6b00!important;box-shadow:0 0 0 5px #ff6b0012,0 12px 28px #ff6b000d!important;transform:translateY(-1px)}
  #gzRewardsApp .gz-forgot-ui button{position:relative;z-index:1;min-height:52px!important;border-radius:15px!important;transition:transform .25s cubic-bezier(.16,1,.3,1),box-shadow .25s!important;animation:gzRecoveryField .55s .18s both}
  #gzRewardsApp .gz-forgot-ui button:not(.gz-forgot-secondary){background:linear-gradient(100deg,#ff9800,#ff5b00)!important;color:#111!important;box-shadow:0 13px 30px #ff6b0026!important}
  #gzRewardsApp .gz-forgot-ui button:not(.gz-forgot-secondary):hover{transform:translateY(-2px)!important;box-shadow:0 18px 34px #ff6b0030!important}
  #gzRewardsApp .gz-forgot-ui button:not(.gz-forgot-secondary):active{transform:translateY(1px) scale(.985)!important}
  #gzRewardsApp .gz-forgot-ui .gz-forgot-secondary{background:#fff!important;color:#171717!important;border:1px solid #ddd5cf!important;box-shadow:none!important}
  #gzRewardsApp .gz-forgot-ui .gz-rewards-msg{position:relative;z-index:2;min-height:20px}

  /* Email verification is step 2 of the same recovery experience. */
  #gzRewardsApp .gz-forgot-ui.gz-recovery-code .gz-forgot-lock{background:linear-gradient(145deg,#171717,#30251f)}
  #gzRewardsApp .gz-forgot-ui.gz-recovery-code .gz-forgot-lock:before{animation-duration:1.25s}
  #gzRewardsApp .gz-forgot-ui.gz-recovery-code .gz-forgot-steps span:nth-of-type(1){background:#eeeae6;color:#777;border-color:#ddd5cf;box-shadow:none}
  #gzRewardsApp .gz-forgot-ui.gz-recovery-code .gz-forgot-steps span:nth-of-type(2){background:#ff6b00;color:#fff;border-color:#ff6b00;box-shadow:0 0 0 6px #ff6b0010;animation:gzStepPop .5s both}
  #gzRewardsApp .gz-forgot-ui.gz-recovery-code input{text-align:center;letter-spacing:.25em;font-weight:800;font-size:18px}
  #gzRewardsApp .gz-forgot-ui.gz-recovery-code input:focus{letter-spacing:.3em}

  @keyframes gzRecoveryEnter{from{opacity:0;transform:translateY(24px) scale(.975);clip-path:inset(7% 0 0 round 22px)}to{opacity:1;transform:none;clip-path:inset(0 round 22px)}}
  @keyframes gzRecoveryDrop{from{opacity:0;transform:translateY(9px)}to{opacity:1;transform:none}}
  @keyframes gzRecoveryLock{0%{opacity:0;transform:translateY(18px) rotate(-14deg) scale(.7)}55%{opacity:1;transform:translateY(-5px) rotate(5deg) scale(1.08)}100%{transform:none}}
  @keyframes gzRecoveryPulse{0%{transform:scale(.72);opacity:0}35%{opacity:1}100%{transform:scale(1.16);opacity:0}}
  @keyframes gzRecoveryGlow{0%,100%{transform:scale(.8);opacity:.55}50%{transform:scale(1.13);opacity:1}}
  @keyframes gzRecoveryOrbit{to{transform:rotate(360deg)}}
  @keyframes gzRecoveryField{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
  @keyframes gzStepPop{0%{transform:scale(.55);opacity:.2}70%{transform:scale(1.15)}100%{transform:scale(1);opacity:1}}
  @media(max-width:760px){#gzRewardsApp .gz-forgot-ui{padding:21px!important;border-radius:19px!important}#gzRewardsApp .gz-forgot-lock{width:52px;height:52px;font-size:24px;border-radius:16px}#gzRewardsApp .gz-forgot-steps i{flex-basis:22px}#gzRewardsApp .gz-forgot-ui input,#gzRewardsApp .gz-forgot-ui button{min-height:50px!important}}
  @media(prefers-reduced-motion:reduce){#gzRewardsApp .gz-forgot-ui,#gzRewardsApp .gz-forgot-ui:before,#gzRewardsApp .gz-forgot-ui:after,#gzRewardsApp .gz-forgot-kicker,#gzRewardsApp .gz-forgot-lock,#gzRewardsApp .gz-forgot-lock:before,#gzRewardsApp .gz-forgot-lock:after,#gzRewardsApp .gz-forgot-steps span.active,#gzRewardsApp .gz-forgot-ui input,#gzRewardsApp .gz-forgot-ui button{animation:none!important}}
  `;document.head.appendChild(s);

  function findRecoveryBox(root){
    const candidates=[...root.querySelectorAll('h1,h2,h3,p,div,span,input')];
    const signal=candidates.find(el=>{
      const t=(el.textContent||'').replace(/\s+/g,' ').trim();
      const ph=(el.getAttribute?.('placeholder')||'').toLowerCase();
      return /forgot your pin|check your email|pin recovery/i.test(t)&&t.length<120 || /6-digit code|registered rewards email/i.test(ph);
    });
    if(!signal)return null;
    let box=signal;
    for(let i=0;i<12&&box;i++,box=box.parentElement){
      if(box.querySelector?.('input')&&box.querySelector?.('button'))break;
    }
    return box&&box.querySelector?.('input')&&box.querySelector?.('button')?box:null;
  }

  function decorate(){
    const root=document.getElementById('gzRewardsApp');if(!root)return;
    const box=findRecoveryBox(root);if(!box)return;
    const inputs=[...box.querySelectorAll('input')];
    const headingText=(box.querySelector('h1,h2,h3')?.textContent||'').trim();
    const isCode=/check your email|6-digit code/i.test(headingText+' '+inputs.map(x=>x.placeholder||'').join(' '));
    box.classList.add('gz-forgot-ui');
    box.classList.toggle('gz-recovery-code',isCode);
    if(box.dataset.gzRecoveryDecorated==='3'){
      const steps=box.querySelector('.gz-forgot-steps');if(steps){steps.querySelectorAll('span').forEach((x,i)=>x.classList.toggle('active',isCode?i===1:i===0))}
      return;
    }
    box.dataset.gzRecoveryDecorated='3';
    const inner=document.createElement('div');inner.className='gz-recovery-inner';
    while(box.firstChild)inner.appendChild(box.firstChild);box.appendChild(inner);
    const kicker=document.createElement('div');kicker.className='gz-forgot-kicker';kicker.innerHTML='<i></i><span>'+(isCode?'EMAIL VERIFICATION':'SECURE PIN RECOVERY')+'</span>';inner.insertBefore(kicker,inner.firstChild);
    const lock=document.createElement('div');lock.className='gz-forgot-lock';lock.textContent=isCode?'✉️':'🔐';inner.insertBefore(lock,kicker.nextSibling);
    const heading=inner.querySelector('h1,h2,h3');
    const steps=document.createElement('div');steps.className='gz-forgot-steps';steps.innerHTML='<span class="'+(isCode?'':'active')+'">1</span><i></i><span class="'+(isCode?'active':'')+'">2</span><i></i><span>3</span>';
    if(heading)inner.insertBefore(steps,heading);else inner.insertBefore(steps,lock.nextSibling);
    const p=[...inner.querySelectorAll('p')].find(x=>/verification code|email attached|registered rewards email/i.test(x.textContent||''));if(p)p.classList.add('gz-forgot-copy');
    inner.querySelectorAll('button').forEach(btn=>{if(/back to login/i.test(btn.textContent||''))btn.classList.add('gz-forgot-secondary')});
    if(isCode)inputs.forEach(x=>{x.setAttribute('inputmode','numeric');x.setAttribute('maxlength','6')});
  }

  const run=()=>requestAnimationFrame(decorate);
  run();
  const root=document.getElementById('gzRewardsApp');
  if(root)new MutationObserver(run).observe(root,{childList:true,subtree:true});
})();