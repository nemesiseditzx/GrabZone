(function(){
  'use strict';
  const STYLE_ID='gzAuthAnimationStyle';
  const APP_ID='gzRewardsApp';

  function inject(){
    if(document.getElementById(STYLE_ID)) return;
    const s=document.createElement('style');
    s.id=STYLE_ID;
    s.textContent=`
      #gzRewardsApp.gz-auth-ui{min-height:0!important}
      #gzRewardsApp.gz-auth-ui .gz-auth-stage{position:relative;display:grid;grid-template-columns:46% 54%;min-height:520px;border-radius:22px;overflow:hidden;background:#fff;border:1px solid #e9e9ef;box-shadow:0 24px 70px rgba(37,24,111,.12)}
      #gzRewardsApp.gz-auth-ui .gz-auth-visual{position:relative;display:flex;flex-direction:column;justify-content:center;padding:48px;background:linear-gradient(145deg,#111 0%,#28186f 45%,#6534df 100%);color:#fff;overflow:hidden}
      #gzRewardsApp.gz-auth-ui .gz-auth-visual:before{content:"";position:absolute;width:360px;height:360px;border-radius:50%;right:-190px;top:-150px;background:rgba(255,255,255,.12)}
      #gzRewardsApp.gz-auth-ui .gz-auth-visual:after{content:"";position:absolute;width:260px;height:260px;border-radius:50%;left:-140px;bottom:-150px;background:rgba(55,229,204,.16);filter:blur(8px)}
      #gzRewardsApp.gz-auth-ui .gz-auth-visual>*{position:relative;z-index:1}
      #gzRewardsApp.gz-auth-ui .gz-auth-logo{width:62px;height:62px;object-fit:contain;background:#fff;border-radius:18px;padding:8px;margin-bottom:30px;box-shadow:0 14px 35px rgba(0,0,0,.25)}
      #gzRewardsApp.gz-auth-ui .gz-auth-kicker{font-size:10px;letter-spacing:.2em;font-weight:900;opacity:.72;margin-bottom:12px}
      #gzRewardsApp.gz-auth-ui .gz-auth-visual h3{font-size:38px;line-height:1.02;letter-spacing:-.045em;margin:0 0 16px;color:#fff}
      #gzRewardsApp.gz-auth-ui .gz-auth-visual p{max-width:360px;color:#eee;font-size:13px;line-height:1.65;margin:0}
      #gzRewardsApp.gz-auth-ui .gz-auth-points{display:grid;gap:10px;margin-top:28px}
      #gzRewardsApp.gz-auth-ui .gz-auth-point{display:flex;align-items:center;gap:10px;font-size:11px;font-weight:800;color:#fff}
      #gzRewardsApp.gz-auth-ui .gz-auth-point i{width:24px;height:24px;border-radius:50%;display:grid;place-items:center;background:rgba(255,255,255,.13);border:1px solid rgba(255,255,255,.2);font-style:normal}
      #gzRewardsApp.gz-auth-ui .gz-auth-switch{margin-top:30px;width:max-content;border:1px solid rgba(255,255,255,.35);background:rgba(255,255,255,.1);color:#fff;border-radius:999px;padding:11px 16px;font:900 11px system-ui;cursor:pointer;transition:.2s}
      #gzRewardsApp.gz-auth-ui .gz-auth-switch:hover{background:#fff;color:#28186f;transform:translateY(-1px)}
      #gzRewardsApp.gz-auth-ui .gz-auth-form{display:flex;flex-direction:column;justify-content:center;padding:48px 52px;background:#fff;min-width:0;animation:gzAuthIn .55s ease both}
      #gzRewardsApp.gz-auth-ui .gz-auth-form .eyebrow{font-size:10px;letter-spacing:.2em;color:#5b25d9;font-weight:900}
      #gzRewardsApp.gz-auth-ui .gz-auth-form h2{font-size:36px!important;line-height:1!important;letter-spacing:-.045em;margin:9px 0 8px!important;color:#111}
      #gzRewardsApp.gz-auth-ui .gz-auth-form>p{font-size:13px;color:#777;margin:0;line-height:1.6}
      #gzRewardsApp.gz-auth-ui .gz-auth-form .gz-rewards-grid{display:grid;gap:11px;margin-top:24px;max-width:500px}
      #gzRewardsApp.gz-auth-ui .gz-auth-form .gz-rewards-grid input{height:52px;width:100%;box-sizing:border-box;border:1px solid #dedee5;border-radius:13px;padding:0 15px;background:#fafafd;outline:none;font:inherit;transition:.2s}
      #gzRewardsApp.gz-auth-ui .gz-auth-form .gz-rewards-grid input:focus{background:#fff;border-color:#6b4ce6;box-shadow:0 0 0 4px rgba(91,37,217,.09);transform:translateY(-1px)}
      #gzRewardsApp.gz-auth-ui .gz-auth-form .gz-rewards-btn{height:52px;border:0;border-radius:13px;background:#111;color:#fff;font-weight:900;cursor:pointer;transition:.2s}
      #gzRewardsApp.gz-auth-ui .gz-auth-form .gz-rewards-btn:hover{transform:translateY(-2px);box-shadow:0 12px 25px rgba(0,0,0,.14)}
      #gzRewardsApp.gz-auth-ui .gz-auth-form .gz-rewards-btn.alt{background:#fff;color:#111;border:1px solid #dedee5;box-shadow:none}
      #gzRewardsApp.gz-auth-ui .gz-auth-form .gz-rewards-btn.alt:hover{background:#f8f7ff;border-color:#bfb4ef;color:#4d2fc3}
      #gzRewardsApp.gz-auth-ui .gz-auth-form .gz-rewards-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px;max-width:500px;margin-top:10px}
      #gzRewardsApp.gz-auth-ui .gz-auth-form .gz-rewards-msg{max-width:500px;min-height:20px;margin-top:9px}
      @keyframes gzAuthIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:none}}
      #gzRewardsApp.gz-auth-ui.is-register .gz-auth-visual{order:2}
      #gzRewardsApp.gz-auth-ui.is-register .gz-auth-form{order:1}
      @media(max-width:760px){
        #gzRewardsApp.gz-auth-ui .gz-auth-stage{display:flex;flex-direction:column;min-height:0;border-radius:18px}
        #gzRewardsApp.gz-auth-ui .gz-auth-visual{padding:30px 24px;min-height:285px;order:0!important}
        #gzRewardsApp.gz-auth-ui .gz-auth-form{padding:30px 22px 26px;order:1!important}
        #gzRewardsApp.gz-auth-ui .gz-auth-visual h3{font-size:29px}
        #gzRewardsApp.gz-auth-ui .gz-auth-logo{width:52px;height:52px;margin-bottom:20px}
        #gzRewardsApp.gz-auth-ui .gz-auth-points{grid-template-columns:1fr 1fr;gap:8px;margin-top:20px}
        #gzRewardsApp.gz-auth-ui .gz-auth-switch{margin-top:20px}
        #gzRewardsApp.gz-auth-ui .gz-auth-form h2{font-size:30px!important}
        #gzRewardsApp.gz-auth-ui .gz-auth-form .gz-rewards-actions{grid-template-columns:1fr}
      }
    `;
    document.head.appendChild(s);
  }

  function build(){
    const body=document.getElementById(APP_ID);
    if(!body) return false;
    const login=document.getElementById('grLogin');
    const register=document.getElementById('grRegister');
    if(!login&&!register) return false;
    if(body.dataset.gzAuthAnimated==='1') return true;
    const original=[...body.children];
    if(!original.length) return false;
    body.dataset.gzAuthAnimated='1';
    body.classList.add('gz-auth-ui');
    if(register&&!login)body.classList.add('is-register');
    const stage=document.createElement('div');stage.className='gz-auth-stage';
    const visual=document.createElement('aside');visual.className='gz-auth-visual';
    visual.innerHTML='<img class="gz-auth-logo" src="favicon.png" alt="GrabZone"><div class="gz-auth-kicker">GRABZONE REWARDS</div><h3>More rewards.<br>More reasons to come back.</h3><p>One account for your GrabPoints balance, membership tier and rewards. Keep shopping, keep earning, keep leveling up.</p><div class="gz-auth-points"><div class="gz-auth-point"><i>✓</i><span>Track your GP balance</span></div><div class="gz-auth-point"><i>★</i><span>Unlock higher tiers</span></div><div class="gz-auth-point"><i>↗</i><span>Redeem securely</span></div></div>';
    const switcher=document.createElement('button');switcher.type='button';switcher.className='gz-auth-switch';switcher.textContent=register&&!login?'Already a member? Login':'New to GrabPoints? Join now';
    switcher.onclick=function(){const target=(register&&!login)?document.getElementById('grToLogin'):document.getElementById('grToRegister');if(target)target.click()};
    visual.appendChild(switcher);
    const form=document.createElement('section');form.className='gz-auth-form';original.forEach(n=>form.appendChild(n));
    stage.appendChild(visual);stage.appendChild(form);body.appendChild(stage);
    try{const brand=document.getElementById('gpBrandLogo'),logo=visual.querySelector('.gz-auth-logo');if(brand&&logo&&brand.src)logo.src=brand.src}catch{}
    return true;
  }

  function boot(){
    inject();
    let count=0;
    const run=()=>{if(build()){if(window.__gzAuthObserver)return;const body=document.getElementById(APP_ID);if(body){window.__gzAuthObserver=new MutationObserver(()=>{if(body.dataset.gzAuthAnimated!=='1')build()});window.__gzAuthObserver.observe(body,{childList:true,subtree:true})}return}if(++count<80)setTimeout(run,250)};
    run();
    document.addEventListener('DOMContentLoaded',()=>setTimeout(run,50),{once:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();