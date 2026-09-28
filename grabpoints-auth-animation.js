(() => {
  'use strict';
  const APP_ID = 'gzRewardsApp';
  const STYLE_ID = 'gzAuthAnimationStyle';
  let observer = null;
  let scheduled = false;
  let building = false;
  let lastMode = '';

  function inject() {
    let style = document.getElementById(STYLE_ID);
    if (!style) {
      style = document.createElement('style');
      style.id = STYLE_ID;
      document.head.appendChild(style);
    }
    style.textContent = `
      #gzRewardsApp.gz-auth-ui{width:100%!important;max-width:none!important;min-width:0!important;box-sizing:border-box!important;margin:0!important;padding:0!important}
      #gzRewardsApp.gz-auth-ui .gz-auth-stage{position:relative;display:grid;grid-template-columns:minmax(0,54%) minmax(0,46%);width:100%;min-height:540px;border-radius:24px;overflow:hidden;background:#fff;border:1px solid #e7e7eb;box-shadow:0 22px 65px rgba(17,17,17,.10);isolation:isolate}
      #gzRewardsApp.gz-auth-ui .gz-auth-visual{position:relative;display:flex;flex-direction:column;justify-content:center;padding:54px;background:linear-gradient(145deg,#6d18ef 0%,#5010d5 55%,#3c08b7 100%);color:#fff;overflow:hidden}
      #gzRewardsApp.gz-auth-ui .gz-auth-visual:before{content:"";position:absolute;width:430px;height:430px;border-radius:50%;right:-240px;top:-220px;border:1px solid rgba(255,255,255,.18);box-shadow:0 0 0 55px rgba(255,255,255,.09),0 0 0 110px rgba(255,255,255,.04)}
      #gzRewardsApp.gz-auth-ui .gz-auth-visual:after{content:"";position:absolute;width:330px;height:330px;border-radius:50%;left:-220px;bottom:-230px;background:rgba(255,255,255,.20);filter:blur(28px)}
      #gzRewardsApp.gz-auth-ui .gz-auth-visual>*{position:relative;z-index:1}
      #gzRewardsApp.gz-auth-ui .gz-auth-logo{width:64px;height:64px;object-fit:contain;background:#fff;border-radius:18px;padding:8px;margin-bottom:30px;box-shadow:0 15px 35px rgba(0,0,0,.24);animation:gzLogoIn .65s cubic-bezier(.2,.8,.2,1) both}
      #gzRewardsApp.gz-auth-ui .gz-auth-kicker{font-size:10px;letter-spacing:.22em;font-weight:900;opacity:.68;margin-bottom:12px;animation:gzTextIn .6s .05s both}
      #gzRewardsApp.gz-auth-ui .gz-auth-visual h3{font-size:40px;line-height:1.02;letter-spacing:-.045em;margin:0 0 17px;color:#fff;animation:gzTextIn .65s .10s both}
      #gzRewardsApp.gz-auth-ui .gz-auth-visual p{max-width:390px;color:rgba(255,255,255,.78);font-size:13px;line-height:1.7;margin:0;animation:gzTextIn .65s .16s both}
      #gzRewardsApp.gz-auth-ui .gz-auth-points{display:grid;gap:11px;margin-top:29px;animation:gzTextIn .65s .22s both}
      #gzRewardsApp.gz-auth-ui .gz-auth-point{display:flex;align-items:center;gap:10px;font-size:11px;font-weight:800;color:#fff}
      #gzRewardsApp.gz-auth-ui .gz-auth-point i{width:25px;height:25px;flex:0 0 25px;border-radius:50%;display:grid;place-items:center;background:rgba(255,255,255,.10);border:1px solid rgba(255,255,255,.20);font-style:normal;color:#f2dfff}
      #gzRewardsApp.gz-auth-ui .gz-auth-switch{margin-top:30px;width:max-content;border:1px solid rgba(255,255,255,.30);background:rgba(255,255,255,.12);color:#fff;border-radius:999px;padding:11px 17px;font:900 11px system-ui;cursor:pointer;transition:.22s;animation:gzTextIn .65s .28s both}
      #gzRewardsApp.gz-auth-ui .gz-auth-switch:hover{background:#fff;color:#5010d5;border-color:#fff;transform:translateY(-2px)}
      #gzRewardsApp.gz-auth-ui .gz-auth-form{display:flex;flex-direction:column;justify-content:center;padding:54px 58px;background:#fff;min-width:0;animation:gzFormIn .55s cubic-bezier(.2,.8,.2,1) both}
      #gzRewardsApp.gz-auth-ui .gz-auth-form .eyebrow{font-size:10px;letter-spacing:.2em;color:#6515db;font-weight:900}
      #gzRewardsApp.gz-auth-ui .gz-auth-form h2{font-size:38px!important;line-height:1!important;letter-spacing:-.045em;margin:10px 0 9px!important;color:#111}
      #gzRewardsApp.gz-auth-ui .gz-auth-form>p{font-size:13px;color:#737373;margin:0;line-height:1.65;max-width:500px}
      #gzRewardsApp.gz-auth-ui .gz-auth-form .gz-rewards-grid{display:grid;gap:11px;margin-top:25px;max-width:500px}
      #gzRewardsApp.gz-auth-ui .gz-auth-form .gz-rewards-grid input{height:52px;width:100%;box-sizing:border-box;border:1px solid #dedee3;border-radius:13px;padding:0 15px;background:#fafafa;outline:none;font:inherit;transition:border-color .2s,box-shadow .2s,transform .2s,background .2s}
      #gzRewardsApp.gz-auth-ui .gz-auth-form .gz-rewards-grid input:focus{background:#fff;border-color:#7627e8;box-shadow:0 0 0 4px rgba(118,39,232,.12);transform:translateY(-1px)}
      #gzRewardsApp.gz-auth-ui .gz-auth-form .gz-rewards-btn{height:52px;border:0;border-radius:13px;background:#111;color:#fff;font-weight:900;cursor:pointer;transition:.22s;box-shadow:0 8px 20px rgba(17,17,17,.10)}
      #gzRewardsApp.gz-auth-ui .gz-auth-form .gz-rewards-btn:hover{transform:translateY(-2px);box-shadow:0 13px 28px rgba(17,17,17,.16);background:#6515db}
      #gzRewardsApp.gz-auth-ui .gz-auth-form .gz-rewards-btn.alt{background:#fff;color:#111;border:1px solid #dedee3;box-shadow:none}
      #gzRewardsApp.gz-auth-ui .gz-auth-form .gz-rewards-btn.alt:hover{background:#fff7f2;border-color:#c8a7ff;color:#d95312}
      #gzRewardsApp.gz-auth-ui .gz-auth-form .gz-rewards-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px;max-width:500px;margin-top:10px}
      #gzRewardsApp.gz-auth-ui .gz-auth-form .gz-rewards-msg{max-width:500px;min-height:20px;margin-top:9px}
      #gzRewardsApp.gz-auth-ui .gz-auth-visual{order:2}\n      #gzRewardsApp.gz-auth-ui .gz-auth-form{order:1}\n      #gzRewardsApp.gz-auth-ui.is-register .gz-auth-visual{order:1}
      #gzRewardsApp.gz-auth-ui.is-register .gz-auth-form{order:2;animation-name:gzFormInLeft}
      @keyframes gzLogoIn{from{opacity:0;transform:scale(.78) rotate(-7deg)}to{opacity:1;transform:none}}
      @keyframes gzTextIn{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
      @keyframes gzFormIn{from{opacity:0;transform:translateX(28px)}to{opacity:1;transform:none}}
      @keyframes gzFormInLeft{from{opacity:0;transform:translateX(-28px)}to{opacity:1;transform:none}}
      @media(max-width:900px){
        #gzRewardsApp.gz-auth-ui .gz-auth-stage{grid-template-columns:minmax(0,44%) minmax(0,56%);min-height:500px}
        #gzRewardsApp.gz-auth-ui .gz-auth-visual,#gzRewardsApp.gz-auth-ui .gz-auth-form{padding:38px}
        #gzRewardsApp.gz-auth-ui .gz-auth-visual h3{font-size:33px}
        #gzRewardsApp.gz-auth-ui .gz-auth-form h2{font-size:32px!important}
      }
      @media(max-width:760px){
        #gzRewardsApp.gz-auth-ui{display:block!important;width:100vw!important;max-width:100vw!important;margin-left:calc(50% - 50vw)!important;margin-right:calc(50% - 50vw)!important}
        #gzRewardsApp.gz-auth-ui .gz-auth-stage{display:flex;flex-direction:column;width:100%!important;min-height:0;border:0;border-radius:0;box-shadow:none;overflow:visible;background:#fff}
        #gzRewardsApp.gz-auth-ui .gz-auth-visual{order:0!important;width:100%;box-sizing:border-box;min-height:0;padding:34px 24px 30px;border-radius:0;background:radial-gradient(circle at 90% 0%,rgba(255,255,255,.2),transparent 32%),linear-gradient(150deg,#6d18ef 0%,#5010d5 55%,#3c08b7 100%)}
        #gzRewardsApp.gz-auth-ui .gz-auth-form{order:1!important;width:100%;box-sizing:border-box;min-height:0;padding:32px 24px 38px;border-radius:0;background:#fff;animation-name:gzFormInMobile!important}
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
        #gzRewardsApp.gz-auth-ui .gz-auth-point{font-size:9.5px}
        #gzRewardsApp.gz-auth-ui .gz-auth-form .gz-rewards-actions{grid-template-columns:1fr}
      }

      /* Reference-inspired purple animated authentication panel */
      #gzRewardsApp.gz-auth-ui .gz-auth-visual{isolation:isolate}
      #gzRewardsApp.gz-auth-ui .gz-auth-visual:before{width:520px;height:520px;right:-245px;top:-285px;border:0;border-radius:0 0 0 58%;background:rgba(255,255,255,.10);box-shadow:none;transform:rotate(-10deg)}
      #gzRewardsApp.gz-auth-ui .gz-auth-visual:after{width:380px;height:240px;left:auto;right:-80px;bottom:-115px;border-radius:55% 45% 0 0;background:#3f09bb;filter:none;transform:rotate(-8deg);z-index:0}
      #gzRewardsApp.gz-auth-ui .gz-auth-visual h3{font-size:clamp(30px,3vw,43px)}
      #gzRewardsApp.gz-auth-ui .gz-auth-form .gz-rewards-btn:not(.alt){background:linear-gradient(110deg,#851cf0,#4f0ed7);color:#fff;box-shadow:0 10px 24px rgba(92,23,210,.22)}
      #gzRewardsApp.gz-auth-ui .gz-auth-form .gz-rewards-btn:not(.alt):hover{background:linear-gradient(110deg,#982bff,#5a17e7)}
      #gzRewardsApp.gz-auth-ui .gz-auth-form .gz-rewards-grid input:focus{border-color:#7627e8;box-shadow:0 0 0 4px rgba(118,39,232,.12)}
      #gzRewardsApp.gz-auth-ui .gz-auth-form .eyebrow{color:#721de0}
      #gzRewardsApp.gz-auth-ui .gz-auth-switch{background:rgba(255,255,255,.13);border-color:rgba(255,255,255,.42)}
      #gzRewardsApp.gz-auth-ui .gz-auth-switch:hover{background:#fff;color:#5010d5}

      /* Rich motion layer: drifting reward tokens, orbit rings, glow and shimmer */
      #gzRewardsApp.gz-auth-ui .gz-auth-visual{overflow:hidden}
      #gzRewardsApp.gz-auth-ui .gz-auth-motion{position:absolute;inset:0;z-index:0;pointer-events:none;overflow:hidden}
      #gzRewardsApp.gz-auth-ui .gz-auth-motion:before{content:"";position:absolute;inset:-40%;background:linear-gradient(115deg,transparent 35%,rgba(255,255,255,.075) 48%,transparent 61%);transform:translateX(-70%) rotate(8deg);animation:gzAuthShimmer 7s ease-in-out infinite}
      #gzRewardsApp.gz-auth-ui .gz-orbit{position:absolute;border:1px solid rgba(255,255,255,.2);border-radius:50%;width:350px;height:350px;right:-125px;top:8%;animation:gzOrbitDrift 15s ease-in-out infinite}
      #gzRewardsApp.gz-auth-ui .gz-orbit-b{width:245px;height:245px;right:-65px;top:18%;border-style:dashed;border-color:rgba(255,255,255,.18);animation:gzOrbitDrift 19s ease-in-out infinite reverse}
      #gzRewardsApp.gz-auth-ui .gz-float{position:absolute;display:grid;place-items:center;color:#fff;box-shadow:0 14px 32px rgba(32,0,85,.2);backdrop-filter:blur(7px);animation:gzTokenFloat 5.4s ease-in-out infinite}
      #gzRewardsApp.gz-auth-ui .gz-float-star{top:15%;right:20%;font-size:28px;width:54px;height:54px;border-radius:18px;background:rgba(255,255,255,.15);animation-delay:-1.1s}
      #gzRewardsApp.gz-auth-ui .gz-float-gift{right:12%;bottom:18%;font-size:28px;width:66px;height:66px;border-radius:22px;background:rgba(255,255,255,.16);animation-delay:-2.7s}
      #gzRewardsApp.gz-auth-ui .gz-float-coin{right:43%;top:46%;width:48px;height:48px;border-radius:50%;font-weight:950;font-size:13px;background:linear-gradient(145deg,#ffeaa1,#eebd4e);color:#6e3bb1;border:3px solid rgba(255,255,255,.5);animation:gzCoinFloat 6s ease-in-out infinite}
      #gzRewardsApp.gz-auth-ui .gz-float-heart{right:24%;bottom:38%;width:40px;height:40px;border-radius:14px;background:rgba(255,255,255,.17);font-size:22px;animation-delay:-3.5s}
      #gzRewardsApp.gz-auth-ui .gz-glow{position:absolute;border-radius:50%;filter:blur(2px);background:rgba(255,255,255,.15);animation:gzGlowPulse 5s ease-in-out infinite}
      #gzRewardsApp.gz-auth-ui .gz-glow-one{width:150px;height:150px;top:30%;left:9%}
      #gzRewardsApp.gz-auth-ui .gz-glow-two{width:90px;height:90px;right:12%;top:65%;animation-delay:-2.4s}
      #gzRewardsApp.gz-auth-ui .gz-auth-point i{animation:gzPointPulse 3s ease-in-out infinite}
      #gzRewardsApp.gz-auth-ui .gz-auth-point:nth-child(2) i{animation-delay:.5s}
      #gzRewardsApp.gz-auth-ui .gz-auth-point:nth-child(3) i{animation-delay:1s}
      #gzRewardsApp.gz-auth-ui .gz-auth-form .gz-rewards-grid>*{animation:gzInputRise .55s cubic-bezier(.2,.8,.2,1) both}
      #gzRewardsApp.gz-auth-ui .gz-auth-form .gz-rewards-grid>*:nth-child(2){animation-delay:.07s}
      #gzRewardsApp.gz-auth-ui .gz-auth-form .gz-rewards-grid>*:nth-child(3){animation-delay:.14s}
      #gzRewardsApp.gz-auth-ui .gz-auth-form .gz-rewards-grid>*:nth-child(4){animation-delay:.21s}
      #gzRewardsApp.gz-auth-ui .gz-auth-form .gz-rewards-grid>*:nth-child(5){animation-delay:.28s}
      #gzRewardsApp.gz-auth-ui .gz-auth-form .gz-rewards-grid>*:nth-child(6){animation-delay:.35s}
      #gzRewardsApp.gz-auth-ui .gz-auth-form .gz-rewards-btn:not(.alt){position:relative;overflow:hidden}
      #gzRewardsApp.gz-auth-ui .gz-auth-form .gz-rewards-btn:not(.alt):after{content:"";position:absolute;inset:-50% auto -50% -45%;width:30%;transform:skewX(-20deg);background:linear-gradient(90deg,transparent,rgba(255,255,255,.35),transparent);animation:gzButtonShine 4.8s ease-in-out infinite}
      @keyframes gzTokenFloat{0%,100%{transform:translate3d(0,0,0) rotate(-4deg)}50%{transform:translate3d(0,-17px,0) rotate(5deg)}}
      @keyframes gzCoinFloat{0%,100%{transform:translate3d(0,0,0) rotateY(0)}50%{transform:translate3d(-9px,-15px,0) rotateY(180deg)}}
      @keyframes gzOrbitDrift{0%,100%{transform:translate3d(0,0,0) rotate(0)}50%{transform:translate3d(-22px,18px,0) rotate(12deg)}}
      @keyframes gzGlowPulse{0%,100%{opacity:.35;transform:scale(.88)}50%{opacity:.8;transform:scale(1.12)}}
      @keyframes gzPointPulse{0%,100%{box-shadow:0 0 0 0 rgba(255,255,255,0)}50%{box-shadow:0 0 0 6px rgba(255,255,255,.08)}}
      @keyframes gzInputRise{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
      @keyframes gzAuthShimmer{0%,30%{transform:translateX(-70%) rotate(8deg)}75%,100%{transform:translateX(70%) rotate(8deg)}}
      @keyframes gzButtonShine{0%,65%{left:-45%}100%{left:140%}}
      @media(max-width:760px){#gzRewardsApp.gz-auth-ui .gz-float-star{top:12%;right:12%}#gzRewardsApp.gz-auth-ui .gz-float-gift{right:8%;bottom:12%}#gzRewardsApp.gz-auth-ui .gz-float-coin{right:18%;top:45%}#gzRewardsApp.gz-auth-ui .gz-float-heart{right:38%;bottom:20%}#gzRewardsApp.gz-auth-ui .gz-orbit{width:240px;height:240px;right:-95px}}

      @media(prefers-reduced-motion:reduce){#gzRewardsApp.gz-auth-ui .gz-auth-logo,#gzRewardsApp.gz-auth-ui .gz-auth-kicker,#gzRewardsApp.gz-auth-ui .gz-auth-visual h3,#gzRewardsApp.gz-auth-ui .gz-auth-visual p,#gzRewardsApp.gz-auth-ui .gz-auth-points,#gzRewardsApp.gz-auth-ui .gz-auth-switch,#gzRewardsApp.gz-auth-ui .gz-auth-form{animation:none!important}}

      @keyframes gzFormInMobile{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:none}}
    `;
  }

  function authMode() {
    const login = document.getElementById('grLogin');
    const register = document.getElementById('grRegister');
    if (register && !login) return 'register';
    if (login && !register) return 'login';
    return '';
  }

  function clearAnimationState(app) {
    if (!app) return;
    app.classList.remove('gz-auth-ui', 'is-register');
    delete app.dataset.gzAuthAnimated;
    const stage = app.querySelector(':scope > .gz-auth-stage');
    if (stage) stage.remove();
  }

  function build(force = false) {
    if (building) return false;
    const app = document.getElementById(APP_ID);
    if (!app) return false;
    const mode = authMode();
    if (!mode) return false;

    const stage = app.querySelector(':scope > .gz-auth-stage');
    if (!force && stage && lastMode === mode) {
      app.classList.add('gz-auth-ui');
      app.classList.toggle('is-register', mode === 'register');
      return true;
    }

    if (stage) stage.remove();

    const original = [...app.children].filter(n => !n.classList.contains('gz-auth-stage'));
    if (!original.length) return false;

    app.classList.add('gz-auth-ui');
    app.classList.toggle('is-register', mode === 'register');

    const next = document.createElement('div');
    next.className = 'gz-auth-stage';

    const visual = document.createElement('aside');
    visual.className = 'gz-auth-visual';
    visual.innerHTML = '<div class="gz-auth-motion" aria-hidden="true"><span class="gz-orbit gz-orbit-a"></span><span class="gz-orbit gz-orbit-b"></span><span class="gz-float gz-float-star">✦</span><span class="gz-float gz-float-gift">🎁</span><span class="gz-float gz-float-coin">GP</span><span class="gz-float gz-float-heart">♥</span><span class="gz-glow gz-glow-one"></span><span class="gz-glow gz-glow-two"></span></div><img class="gz-auth-logo" src="favicon.png" alt="GrabZone"><div class="gz-auth-kicker">GRABZONE REWARDS</div><h3>More rewards.<br>More reasons to come back.</h3><p>One account for your GrabPoints balance, membership tier and rewards. Keep shopping, keep earning, keep leveling up.</p><div class="gz-auth-points"><div class="gz-auth-point"><i>✓</i><span>Track your GP balance</span></div><div class="gz-auth-point"><i>★</i><span>Unlock higher tiers</span></div><div class="gz-auth-point"><i>↗</i><span>Redeem securely</span></div></div>';

    const switcher = document.createElement('button');
    switcher.type = 'button';
    switcher.className = 'gz-auth-switch';
    switcher.textContent = mode === 'register' ? 'Already a member? Login' : 'New to GrabPoints? Join now';
    switcher.onclick = () => {
      const target = mode === 'register' ? document.getElementById('grToLogin') : document.getElementById('grToRegister');
      if (target) target.click();
    };
    visual.appendChild(switcher);

    const form = document.createElement('section');
    form.className = 'gz-auth-form';
    original.forEach(node => form.appendChild(node));

    next.appendChild(visual);
    next.appendChild(form);
    app.appendChild(next);

    try {
      const brand = document.getElementById('gpBrandLogo');
      const logo = visual.querySelector('.gz-auth-logo');
      if (brand && logo && brand.src) logo.src = brand.src;
    } catch (_) {}

    app.dataset.gzAuthAnimated = '1';
    lastMode = mode;
    return true;
  }

  let stabilityTimer = null;

  function scheduleBuild(){
    clearTimeout(stabilityTimer);
    stabilityTimer=setTimeout(()=>{stabilityTimer=null;build()},120);
  }

  function watch(){
    const app=document.getElementById(APP_ID);
    if(!app)return false;
    if(observer){observer.disconnect();observer=null}
    /* Poll only for a genuinely missing auth stage. Do not observe every child move:
       build() itself moves the original form nodes, and observing those transient DOM
       states was the source of the visible multi-refresh/flicker on page load. */
    if(stabilityTimer)clearInterval(stabilityTimer);
    stabilityTimer=setInterval(()=>{
      if(building) return;
      const m=authMode();
      if(!m){lastMode='';return}
      const stage=app.querySelector(':scope > .gz-auth-stage');
      if(!stage){build();return}
      if(stage.querySelector('.gz-auth-form')){
        app.classList.add('gz-auth-ui');
        app.classList.toggle('is-register',m==='register');
        lastMode=m;
      }
    },500);
    return true;
  }

  function boot() {
    inject();
    let attempts = 0;
    const run = () => {
      const ok = build();
      if (ok) { watch(); return; }
      if (++attempts < 150) setTimeout(run, 100);
    };
    run();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
