(()=>{const S='gzMotionStyle';if(document.getElementById(S))return;const s=document.createElement('style');s.id=S;s.textContent=`
.gz-rp-motion{animation:gzCardIn .55s cubic-bezier(.2,.9,.2,1)}
.gz-rp-motion .pin-dot{transition:.3s;animation:gzDotIn .45s both}
.gz-rp-motion .pin-dot:nth-child(2){animation-delay:.06s}.gz-rp-motion .pin-dot:nth-child(3){animation-delay:.12s}.gz-rp-motion .pin-dot:nth-child(4){animation-delay:.18s}.gz-rp-motion .pin-dot:nth-child(5){animation-delay:.24s}.gz-rp-motion .pin-dot:nth-child(6){animation-delay:.30s}
.gz-motion-processing{position:fixed;inset:0;z-index:100999;display:grid;place-items:center;background:rgba(18,16,14,.7);backdrop-filter:blur(16px);animation:gzFade .3s both}.gz-motion-panel{width:min(440px,calc(100% - 30px));padding:30px;border-radius:30px;background:linear-gradient(145deg,#fff,#fff5ea);border:1px solid #efd0b5;box-shadow:0 35px 100px #0005;text-align:center;animation:gzPanel .55s cubic-bezier(.2,.9,.2,1)}
.gz-motion-orbit{width:125px;height:125px;position:relative;margin:auto;display:grid;place-items:center}.gz-motion-orbit:before{content:'';position:absolute;inset:7px;border:1px dashed #ff7800;border-radius:50%;animation:gzSpin 1.4s linear infinite}.gz-motion-orbit:after{content:'';position:absolute;width:10px;height:10px;border-radius:50%;background:#ff7800;top:5px;left:58px;box-shadow:0 0 18px #ff7800;animation:gzSpin 1.4s linear infinite}.gz-motion-core{width:70px;height:70px;border-radius:50%;display:grid;place-items:center;background:#fff;border:2px solid #ff7800;font-size:28px;box-shadow:0 0 0 10px #ff780012,0 0 40px #ff780030;animation:gzPulse 1s ease-in-out infinite}.gz-motion-panel h2{margin:8px 0 5px;font-size:27px;letter-spacing:-.04em}.gz-motion-panel p{color:#777;font-size:12px;margin:0 0 18px}.gz-steps{text-align:left;padding:14px 16px;background:#fff;border:1px solid #eee0d4;border-radius:17px}.gz-step{display:flex;align-items:center;gap:10px;padding:7px 0;font-size:11px;font-weight:800;color:#8a817a}.gz-step i{width:20px;height:20px;border-radius:50%;display:grid;place-items:center;border:1px solid #ddd3cb;font-style:normal}.gz-step.active i{border-color:#ff7800;border-top-color:transparent;animation:gzSpin .7s linear infinite}.gz-step.done{color:#222}.gz-step.done i{background:#1dc477;color:#fff;border-color:#1dc477;animation:gzCheck .35s}.gz-step.fail{color:#cf3040}.gz-step.fail i{background:#e74b55;color:#fff;border-color:#e74b55}.gz-motion-ok{display:none}.gz-motion-ok.show{display:block}.gz-motion-ok .ok{width:78px;height:78px;border-radius:50%;margin:0 auto 15px;background:#1dc477;color:#fff;display:grid;place-items:center;font-size:38px;box-shadow:0 0 0 11px #1dc47712,0 0 45px #1dc47738;animation:gzSuccess .65s cubic-bezier(.2,.9,.2,1)}.gz-motion-ok h2{font-size:29px}.gz-motion-ok .voucher{margin:15px 0;padding:15px;border:1px dashed #ff9a4d;border-radius:16px;background:#fff9f3;font:900 19px ui-monospace,monospace;color:#171717}.gz-motion-close{width:100%;height:49px;border:0;border-radius:14px;background:#17181a;color:#fff;font-weight:900}
@keyframes gzCardIn{from{opacity:0;transform:translateY(25px) scale(.96)}to{opacity:1;transform:none}}@keyframes gzFade{from{opacity:0}to{opacity:1}}@keyframes gzPanel{from{transform:translateY(28px) scale(.94);opacity:0}to{transform:none;opacity:1}}@keyframes gzDotIn{from{transform:translateY(20px) rotateX(-55deg) scale(.65);opacity:0}70%{transform:translateY(-6px) rotateX(8deg) scale(1.08)}to{transform:none;opacity:1}}@keyframes gzSpin{to{transform:rotate(360deg)}}@keyframes gzPulse{50%{transform:scale(1.07);box-shadow:0 0 0 17px #ff780010,0 0 55px #ff780040}}@keyframes gzCheck{50%{transform:scale(1.2)}}@keyframes gzSuccess{0%{transform:scale(.25);opacity:0}70%{transform:scale(1.14)}100%{transform:none;opacity:1}}
@media(max-width:520px){.gz-motion-panel{width:100%;border-radius:29px 29px 0 0;align-self:end;margin:0;padding:24px 18px 25px}.gz-motion-processing{align-items:end}.gz-motion-panel h2{font-size:24px}}
@media(prefers-reduced-motion:reduce){.gz-motion-processing,.gz-motion-panel,.gz-motion-orbit:before,.gz-motion-orbit:after,.gz-motion-core,.gz-motion-ok .ok{animation:none!important}}
`;document.head.appendChild(s)})();

/* GrabPoints redemption hardening: staged amount -> PIN flow, duplicate-submit guard,
   keyboard-safe PIN entry, validation, error shake and accessible focus. */
(()=>{
  'use strict';
  const STYLE='gzRedeemHardeningStyle';
  if(!document.getElementById(STYLE)){
    const st=document.createElement('style');st.id=STYLE;st.textContent=`
      #gzRedeemArea.gz-rh-stage-pin{border-color:#ffb27b;box-shadow:0 12px 35px rgba(255,107,0,.10)}
      #gzRedeemArea.gz-rh-stage-pin #grRedeemPoints{background:#fff8f2;border-color:#ffb27b}
      #gzRedeemArea.gz-rh-stage-pin #grRedeemPin{animation:gzRhPinIn .38s cubic-bezier(.2,.9,.2,1)}
      #gzRedeemArea.gz-rh-shake{animation:gzRhShake .42s ease}
      #gzRedeemArea .gz-rh-step-note{display:none;margin:-2px 0 8px;padding:9px 11px;border-radius:11px;background:#fff8f2;border:1px solid #ffd2b1;color:#7a3c13;font-size:11px;font-weight:800}
      #gzRedeemArea.gz-rh-stage-pin .gz-rh-step-note{display:block}
      #gzRedeemArea.gz-rh-locked #grRedeem{opacity:.65;pointer-events:none}
      @keyframes gzRhPinIn{from{opacity:0;transform:translateY(-8px) scale(.97)}to{opacity:1;transform:none}}
      @keyframes gzRhShake{20%{transform:translateX(-7px)}40%{transform:translateX(7px)}60%{transform:translateX(-5px)}80%{transform:translateX(5px)}to{transform:none}}
      @media(max-width:520px){#gzRedeemArea .gz-rewards-grid{gap:9px}#gzRedeemArea #grRedeemPoints,#gzRedeemArea #grRedeemPin{font-size:16px;min-height:48px}#gzRedeemArea #grRedeem{min-height:50px}}
      @media(prefers-reduced-motion:reduce){#gzRedeemArea.gz-rh-shake,#gzRedeemArea.gz-rh-stage-pin #grRedeemPin{animation:none}}
    `;document.head.appendChild(st);
  }
  let lastButton=null,lastOriginal=null,stage='amount',busy=false;
  function msg(text,error){const m=document.getElementById('grRedeemMsg');if(m){m.textContent=text||'';m.style.color=error?'#b42318':'#08704f'}}
  function resetStage(btn){const area=document.getElementById('gzRedeemArea'),pin=document.getElementById('grRedeemPin');stage='amount';busy=false;if(area){area.classList.remove('gz-rh-stage-pin','gz-rh-locked','gz-rh-shake');area.querySelector('.gz-rh-step-note')?.remove()}if(pin){pin.style.display='';pin.value='';pin.setAttribute('aria-hidden','true');}if(btn){btn.textContent='Continue to PIN →';btn.dataset.gzRhStage='amount';}}
  function setup(){
    const btn=document.getElementById('grRedeem');if(!btn||btn===lastButton&&btn.onclick===lastOriginal)return;
    lastButton=btn;lastOriginal=btn.onclick;
    if(typeof lastOriginal!=='function')return;
    const area=document.getElementById('gzRedeemArea'),points=document.getElementById('grRedeemPoints'),pin=document.getElementById('grRedeemPin');if(!area||!points||!pin)return;
    let note=area.querySelector('.gz-rh-step-note');if(!note){note=document.createElement('div');note.className='gz-rh-step-note';note.textContent='Step 2 of 2 — Enter your private Rewards PIN to confirm this redemption.';points.insertAdjacentElement('afterend',note)}
    resetStage(btn);pin.style.display='none';pin.setAttribute('aria-hidden','true');
    btn.onclick=async function(e){
      e.preventDefault();
      if(busy)return;
      const pts=Math.floor(Number(points.value||0));
      if(stage==='amount'){
        if(!Number.isFinite(pts)||pts<10){msg('Enter at least 10 GP to continue.',true);points.focus();return}
        if(pts%10!==0){msg('Redeem amount must be in 10 GP steps.',true);points.focus();return}
        stage='pin';area.classList.add('gz-rh-stage-pin');pin.style.display='';pin.removeAttribute('aria-hidden');btn.textContent='Confirm Redemption ✓';btn.dataset.gzRhStage='pin';msg('Amount selected: '+pts.toLocaleString('en-BD')+' GP. Enter your PIN to continue.',false);setTimeout(()=>pin.focus(),80);return;
      }
      if(!/^\d{4,6}$/.test(String(pin.value||''))){msg('Enter your 4–6 digit Rewards PIN.',true);pin.focus();area.classList.add('gz-rh-shake');setTimeout(()=>area.classList.remove('gz-rh-shake'),500);return}
      busy=true;area.classList.add('gz-rh-locked');btn.textContent='Verifying PIN…';
      try{await lastOriginal.call(btn,e);}
      catch(_){/* original handler reports its own error */}
      setTimeout(()=>{
        const m=document.getElementById('grRedeemMsg');
        if(m&&/^\s*[✕x]/i.test(m.textContent||'')){area.classList.add('gz-rh-shake');setTimeout(()=>area.classList.remove('gz-rh-shake'),500);busy=false;area.classList.remove('gz-rh-locked');btn.textContent='Confirm Redemption ✓';}
      },450);
    };
    pin.addEventListener('input',()=>{pin.value=pin.value.replace(/\D/g,'').slice(0,6)});
    pin.addEventListener('keydown',e=>{if(e.key==='Enter')btn.click()});
    points.addEventListener('input',()=>{points.value=points.value.replace(/\D/g,'')});
  }
  const mo=new MutationObserver(()=>setup());
  const boot=()=>{setup();const root=document.getElementById('gzRewardsApp');if(root)mo.observe(root,{subtree:true,childList:true});};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else setTimeout(boot,80);
})();