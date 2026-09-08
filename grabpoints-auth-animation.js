(function(){
  'use strict';
  const STYLE_ID='gzAuthAnimationStyle';
  const APP_ID='gzRewardsApp';

  function inject(){
    let s=document.getElementById(STYLE_ID);
    if(!s){s=document.createElement('style');s.id=STYLE_ID;document.head.appendChild(s)}
    s.textContent=`
      #gzRewardsApp.gz-auth-ui{width:100%!important;max-width:none!important;min-width:0!important;box-sizing:border-box!important;margin:0!important;padding:0!important}
      #gzRewardsApp.gz-auth-ui .gz-auth-stage{position:relative;display:grid;grid-template-columns:minmax(0,46%) minmax(0,54%);width:100%;min-height:540px;border-radius:24px;overflow:hidden;background:#fff;border:1px solid #e7e7eb;box-shadow:0 22px 65px rgba(17,17,17,.10);isolation:isolate}
      #gzRewardsApp.gz-auth-ui .gz-auth-visual{position:relative;display:flex;flex-direction:column;justify-content:center;padding:54px;background:radial-gradient(circle at 85% 10%,rgba(255,255,255,.18),transparent 28%),linear-gradient(145deg,#101010 0%,#1b1b1b 48%,#ff6a00 150%);color:#fff;overflow:hidden}
      #gzRewardsApp.gz-auth-ui .gz-auth-visual:before{content:"";position:absolute;width:430px;height:430px;border-radius:50%;right:-240px;top:-220px;border:1px solid rgba(255,255,255,.18);box-shadow:0 0 0 55px rgba(255,106,0,.10),0 0 0 110px rgba(255,106,0,.05)}
      #gzRewardsApp.gz-auth-ui .gz-auth-visual:after{content:"";position:absolute;width:330px;height:330px;border-radius:50%;left:-220px;bottom:-230px;background:rgba(255,106,0,.30);filter:blur(28px)}
      #gzRewardsApp.gz-auth-ui .gz-auth-visual>*{position:relative;z-index:1}
      #gzRewardsApp.gz-auth-ui .gz-auth-logo{width:64px;height:64px;object-fit:contain;background:#fff;border-radius:18px;padding:8px;margin-bottom:30px;box-shadow:0 15px 35px rgba(0,0,0,.24);animation:gzLogoIn .65s cubic-bezier(.2,.8,.2,1) both}
      #gzRewardsApp.gz-auth-ui .gz-auth-kicker{font-size:10px;letter-spacing:.22em;font-weight:900;opacity:.68;margin-bottom:12px;animation:gzTextIn .6s .05s both}
      #gzRewardsApp.gz-auth-ui .gz-auth-visual h3{font-size:40px;line-height:1.02;letter-spacing:-.045em;margin:0 0 17px;color:#fff;animation:gzTextIn .65s .10s both}
      #gzRewardsApp.gz-auth-ui .gz-auth-visual p{max-width:380px;color:rgba(255,255,255,.78);font-size:13px;line-height:1.7;margin:0;animation:gzTextIn .65s .16s both}
      #gzRewardsApp.gz-auth-ui .gz-auth-points{display:grid;gap:11px;margin-top:29px;animation:gzTextIn .65s .22s both}
      #gzRewardsApp.gz-auth-ui .gz-auth-point{display:flex;align-items:center;gap:10px;font-size:11px;font-weight:800;color:#fff}
      #gzRewardsApp.gz-auth-ui .gz-auth-point i{width:25px;height:25px;flex:0 0 25px;border-radius:50%;display:grid;place-items:center;background:rgba(255,255,255,.10);border:1px solid rgba(255,255,255,.20);font-style:normal;color:#ff8a3d}
      #gzRewardsApp.gz-auth-ui .gz-auth-switch{margin-top:30px;width:max-content;border:1px solid rgba(255,255,255,.30);background:rgba(255,255,255,.08);color:#fff;border-radius:999px;padding:11px 17px;font:900 11px system-ui;cursor:pointer;transition:.22s;animation:gzTextIn .65s .28s both}
      #gzRewardsApp.gz-auth-ui .gz-auth-switch:hover{background:#fff;color:#111;border-color:#fff;transform:translateY(-2px)}
      #gzRewardsApp.gz-auth-ui .gz-auth-form{display:flex;flex-direction:column;justify-content:center;padding:54px 58px;background:#fff;min-width:0;animation:gzFormIn .55s cubic-bezier(.2,.8,.2,1) both}
      #gzRewardsApp.gz-auth-ui .gz-auth-form .eyebrow{font-size:10px;letter-spacing:.2em;color:#f26a21;font-weight:900}
      #gzRewardsApp.gz-auth-ui .gz-auth-form h2{font-size:38px!important;line-height:1!important;letter-spacing:-.045em;margin:10px 0 9px!important;color:#111}
      #gzRewardsApp.gz-auth-ui .gz-auth-form>p{font-size:13px;color:#737373;margin:0;line-height:1.65;max-width:500px}
      #gzRewardsApp.gz-auth-ui .gz-auth-form .gz-rewards-grid{display:grid;gap:11px;margin-top:25px;max-width:500px}
      #gzRewardsApp.gz-auth-ui .gz-auth-form .gz-rewards-grid input{height:52px;width:100%;box-sizing:border-box;border:1px solid #dedee3;border-radius:13px;padding:0 15px;background:#fafafa;outline:none;font:inherit;transition:border-color .2s,box-shadow .2s,transform .2s,background .2s}
      #gzRewardsApp.gz-auth-ui .gz-auth-form .gz-rewards-grid input:focus{background:#fff;border-color:#ff6a00;box-shadow:0 0 0 4px rgba(255,106,0,.10);transform:translateY(-1px)}
      #gzRewardsApp.gz-auth-ui .gz-auth-form .gz-rewards-btn{height:52px;border:0;border-radius:13px;background:#111;color:#fff;font-weight:900;cursor:pointer;transition:.22s;box-shadow:0 8px 20px rgba(17,17,17,.10)}
      #gzRewardsApp.gz-auth-ui .gz-auth-form .gz-rewards-btn:hover{transform:translateY(-2px);box-shadow:0 13px 28px rgba(17,17,17,.16);background:#f26a21}
      #gzRewardsApp.gz-auth-ui .gz-auth-form .gz-rewards-btn.alt{background:#fff;color:#111;border:1px solid #dedee3;box-shadow:none}
      #gzRewardsApp.gz-auth-ui .gz-auth-form .gz-rewards-btn.alt:hover{background:#fff7f2;border-color:#ffb88d;color:#d95312}
      #gzRewardsApp.gz-auth-ui .gz-auth-form .gz-rewards-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px;max-width:500px;margin-top:10px}
      #gzRewardsApp.gz-auth-ui .gz-auth-form .gz-rewards-msg{max-width:500px;min-height:20px;margin-top:9px}
      #gzRewardsApp.gz-auth-ui.is-register .gz-auth-visual{order:2}
      #gzRewardsApp.gz-auth-ui.is-register .gz-auth-form{order:1}
      #gzRewardsApp.gz-auth-ui.is-register .gz-auth-form{animation-name:gzFormInLeft}
      @keyframes gzLogoIn{from{opacity:0;transform:scale(.78) rotate(-7deg)}to{opacity:1;transform:none}}
      @keyframes gzTextIn{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
      @keyframes gzFormIn{from{opacity:0;transform:translateX(28px)}to{opacity:1;transform:none}}
      @keyframes gzFormInLeft{from{opacity:0;transform:translateX(-28px)}to{opacity:1;transform:none}}

      @media(max-width:900px){
        #gzRewardsApp.gz-auth-ui .gz-auth-stage{grid-template-columns:minmax(0,44%) minmax(0,56%);min-height:500px}
        #gzRewardsApp.gz-auth-ui .gz-auth-visual{padding:38px}
        #gzRewardsApp.gz-auth-ui .gz-auth-form{padding:38px}
        #gzRewardsApp.gz-auth-ui .gz-auth-visual h3{font-size:33px}
        #gzRewardsApp.gz-auth-ui .gz-auth-form h2{font-size:32px!important}
      }

      @media(max-width:760px){
        #gzRewardsApp.gz-auth-ui{display:block!important;width:100vw!important;max-width:100vw!important;margin-left:calc(50% - 50vw)!important;margin-right:calc(50% - 50vw)!important}
        #gzRewardsApp.gz-auth-ui .gz-auth-stage{display:flex;flex-direction:column;width:100%!important;min-height:0;border:0;border-radius:0;box-shadow:none;overflow:visible;background:#fff}
        #gzRewardsApp.gz-auth-ui .gz-auth-visual{order:0!important;width:100%;box-sizing:border-box;min-height:0;padding:34px 24px 30px;border-radius:0;background:radial-gradient(circle at 90% 0%,rgba(255,255,255,.16),transparent 32%),linear-gradient(150deg,#0f0f0f 0%,#1d1d1d 55%,#f26a21 145%)}
        #gzRewardsApp.gz-auth-ui .gz-auth-form{order:1!important;width:100%;box-sizing:border-box;min-height:0;padding:32px 24px 38px;border-radius:0;background:#fff;animation-name:gzFormInMobile!important}
        #gzRewardsApp.gz-auth-ui.is-register .gz-auth-form{order:1!important}
        #gzRewardsApp.gz-auth-ui .gz-auth-logo{width:54px;height:54px;border-radius:16px;padding:7px;margin-bottom:22px}
        #gzRewardsApp.gz-auth-ui .gz-auth-kicker{font-size:9px;margin-bottom:10px}
        #gzRewardsApp.gz-auth-ui .gz-auth-visual h3{font-size:31px;line-height:1.03;margin-bottom:14px;max-width:340px}
        #gzRewardsApp.gz-auth-ui .gz-auth-visual p{font-size:12px;line-height:1.62;max-width:390px}
        #gzRewardsApp.gz-auth-ui .gz-auth-points{grid-template-columns:1fr 1fr;gap:9px 12px;margin-top:22px}
        #gzRewardsApp.gz-auth-ui .gz-auth-point{font-size:10px;line-height:1.25}
        #gzRewardsApp.gz-auth-ui .gz-auth-point i{width:23px;height:23px;flex-basis:23px}
        #gzRewardsApp.gz-auth-ui .gz-auth-switch{margin-top:23px;padding:10px 15px;font-size:10px}
        #gzRewardsApp.gz-auth-ui .gz-auth-form .eyebrow{font-size:9px}
        #gzRewardsApp.gz-auth-ui .gz-auth-form h2{font-size:30px!important;margin:9px 0 8px!important}
        #gzRewardsApp.gz-auth-ui .gz-auth-form>p{font-size:12px;line-height:1.6}
        #gzRewardsApp.gz-auth-ui .gz-auth-form .gz-rewards-grid{width:100%;max-width:none;margin-top:22px;gap:10px}
        #gzRewardsApp.gz-auth-ui .gz-auth-form .gz-rewards-grid input{height:50px;font-size:14px}
        #gzRewardsApp.gz-auth-ui .gz-auth-form .gz-rewards-btn{height:50px}
        #gzRewardsApp.gz-auth-ui .gz-auth-form .gz-rewards-actions{grid-template-columns:1fr 1fr;width:100%;max-width:none;gap:9px}
      }
      @media(max-width:430px){
        #gzRewardsApp.gz-auth-ui .gz-auth-visual{padding:29px 20px 26px}
        #gzRewardsApp.gz-auth-ui .gz-auth-form{padding:28px 20px 34px}
        #gzRewardsApp.gz-auth-ui .gz-auth-visual h3{font-size:28px}
        #gzRewardsApp.gz-auth-ui .gz-auth-points{grid-template-columns:1fr 1fr}
        #gzRewardsApp.gz-auth-ui .gz-auth-point{font-size:9.5px}
        #gzRewardsApp.gz-auth-ui .gz-auth-form .gz-rewards-actions{grid-template-columns:1fr}
      }
      @keyframes gzFormInMobile{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:none}}
    `;
  }

  function build(){
    const body=document.getElementById(APP_ID);
    if(!body)return false;
    const login=document.getElementById('grLogin');
    const register=document.getElementById('grRegister');
    if(!login&&!register)return false;
    if(body.dataset.gzAuthAnimated==='1')return true;
    const original=[...body.children];
    if(!original.length)return false;
    body.dataset.gzAuthAnimated='1';
    body.classList.add('gz-auth-ui');
    body.classList.toggle('is-register',!!register&&!login);
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
    const run=()=>{if(build()){
      if(window.__gzAuthObserver)return;
      const body=document.getElementById(APP_ID);
      if(body){window.__gzAuthObserver=new MutationObserver(()=>{
        if(body.dataset.gzAuthAnimated!=='1')build();
        else body.classList.toggle('is-register',!!document.getElementById('grRegister')&&!document.getElementById('grLogin'));
      });window.__gzAuthObserver.observe(body,{childList:true,subtree:true})}
      return;
    }if(++count<100)setTimeout(run,200)};
    run();
    document.addEventListener('DOMContentLoaded',()=>setTimeout(run,50),{once:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();