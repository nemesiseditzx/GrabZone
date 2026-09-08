(function(){
  'use strict';

  const STYLE_ID='gzAuthAnimationStyle';
  const APP_ID='gzRewardsApp';
  const BODY_ID='gzRewardsBody';

  function inject(){
    if(document.getElementById(STYLE_ID)) return;
    const s=document.createElement('style');
    s.id=STYLE_ID;
    s.textContent=`
      .gz-auth-shell{position:relative!important;padding:0!important;min-height:470px;overflow:hidden;border-radius:22px;background:#fff;isolation:isolate}
      .gz-auth-stage{position:relative;display:grid;grid-template-columns:1fr 1fr;min-height:470px;background:#fff;overflow:hidden}
      .gz-auth-form{grid-column:2;padding:44px 42px 38px;display:flex;flex-direction:column;justify-content:center;position:relative;z-index:2;background:#fff;transition:transform .72s cubic-bezier(.77,0,.18,1),opacity .4s ease}
      .gz-auth-visual{position:absolute;inset:0 auto 0 0;width:50%;z-index:3;padding:42px;background:linear-gradient(145deg,#111 0%,#25186f 48%,#5b25d9 100%);color:#fff;display:flex;flex-direction:column;justify-content:center;overflow:hidden;transition:transform .72s cubic-bezier(.77,0,.18,1);box-shadow:18px 0 45px #0002}
      .gz-auth-visual:before{content:"";position:absolute;width:320px;height:320px;border-radius:50%;right:-150px;top:-120px;background:#fff2;filter:blur(2px)}
      .gz-auth-visual:after{content:"";position:absolute;width:220px;height:220px;border-radius:50%;left:-90px;bottom:-110px;background:#37e5c655;filter:blur(8px)}
      .gz-auth-visual>*{position:relative;z-index:1}
      .gz-auth-logo{width:54px;height:54px;border-radius:16px;background:#fff;padding:7px;object-fit:contain;margin-bottom:26px;box-shadow:0 12px 30px #0003}
      .gz-auth-kicker{font-size:10px;letter-spacing:.2em;font-weight:900;opacity:.75;margin-bottom:10px}
      .gz-auth-visual h3{font-size:31px;line-height:1.05;margin:0 0 13px;color:#fff;letter-spacing:-.04em}
      .gz-auth-visual p{color:#eee;font-size:13px;line-height:1.6;max-width:330px;margin:0}
      .gz-auth-points{display:grid;gap:9px;margin-top:25px}
      .gz-auth-point{display:flex;gap:9px;align-items:center;font-size:11px;font-weight:800;color:#fff}
      .gz-auth-point i{width:22px;height:22px;border-radius:50%;display:grid;place-items:center;background:#ffffff1f;border:1px solid #ffffff35;font-style:normal}
      .gz-auth-switch{margin-top:26px;width:max-content;border:1px solid #ffffff55;background:#ffffff12;color:#fff;border-radius:999px;padding:10px 14px;font:900 11px system-ui;cursor:pointer;backdrop-filter:blur(8px)}
      .gz-auth-switch:hover{background:#fff;color:#25186f;transform:translateY(-1px)}
      .gz-auth-form .eyebrow{font-size:10px;letter-spacing:.2em;color:#5035d5;font-weight:900}
      .gz-auth-form h2{font-size:31px!important;margin:7px 42px 7px 0!important;letter-spacing:-.04em}
      .gz-auth-form>p{margin-bottom:3px}
      .gz-auth-form .gz-rewards-grid{max-width:430px;margin-top:18px}
      .gz-auth-form .gz-rewards-grid input{height:47px;border-radius:12px;background:#fafafa;transition:border-color .2s,box-shadow .2s,transform .2s}
      .gz-auth-form .gz-rewards-grid input:focus{border-color:#6b4ce6;box-shadow:0 0 0 4px #6b4ce615;transform:translateY(-1px)}
      .gz-auth-form .gz-rewards-btn{height:47px;border-radius:12px;background:#111;transition:transform .2s,box-shadow .2s}
      .gz-auth-form .gz-rewards-btn:hover{transform:translateY(-1px);box-shadow:0 10px 24px #00018}
      .gz-auth-form .gz-rewards-btn.alt{background:#fff}
      .gz-auth-form .gz-rewards-actions{max-width:430px}
      .gz-auth-form .gz-rewards-msg{max-width:430px}
      .gz-auth-form.is-switching{animation:gzAuthFormIn .45s ease both}
      @keyframes gzAuthFormIn{from{opacity:.2;transform:translateY(12px)}to{opacity:1;transform:none}}
      .gz-auth-shell.is-register .gz-auth-visual{transform:translateX(100%)}
      .gz-auth-shell.is-register .gz-auth-form{grid-column:1}
      .gz-auth-shell.is-register .gz-auth-visual{left:50%}
      @media(max-width:720px){
        .gz-auth-shell{min-height:0}
        .gz-auth-stage{display:flex;flex-direction:column;min-height:0}
        .gz-auth-visual{position:relative;inset:auto;width:100%;min-height:220px;padding:28px 25px;order:0;transform:none!important;left:auto!important;box-shadow:none}
        .gz-auth-form{order:1;padding:30px 22px 26px}
        .gz-auth-visual h3{font-size:25px}.gz-auth-logo{margin-bottom:15px}.gz-auth-points{grid-template-columns:1fr 1fr;margin-top:17px}.gz-auth-switch{margin-top:17px}
      }
    `;
    document.head.appendChild(s);
  }

  function getBody(){
    return document.getElementById(BODY_ID)||document.getElementById(APP_ID);
  }

  function build(body){
    if(!body || body.dataset.gzAuthAnimated==='1') return;
    const login=document.getElementById('grLogin');
    const register=document.getElementById('grRegister');
    if(!login && !register) return;

    body.dataset.gzAuthAnimated='1';
    body.classList.add('gz-auth-shell');
    if(register && !login) body.classList.add('is-register');

    const original=[...body.children];
    if(!original.length){body.dataset.gzAuthAnimated='';return}

    const stage=document.createElement('div');
    stage.className='gz-auth-stage';

    const visual=document.createElement('aside');
    visual.className='gz-auth-visual';
    visual.innerHTML='<img class="gz-auth-logo" src="favicon.png" alt="GrabZone"><div class="gz-auth-kicker">GRABZONE REWARDS</div><h3>More rewards.<br>More reasons to come back.</h3><p>Keep your GrabPoints account in one place and unlock more value as your membership grows.</p><div class="gz-auth-points"><div class="gz-auth-point"><i>✓</i><span>Track your GP balance</span></div><div class="gz-auth-point"><i>★</i><span>Grow your membership</span></div><div class="gz-auth-point"><i>↗</i><span>Redeem securely</span></div></div>';

    const switcher=document.createElement('button');
    switcher.type='button';
    switcher.className='gz-auth-switch';
    switcher.textContent=register && !login?'Already have an account? Login':'New to GrabPoints? Join now';
    switcher.onclick=function(){
      const target=(register && !login)?document.getElementById('grToLogin'):document.getElementById('grToRegister');
      if(target) target.click();
    };
    visual.appendChild(switcher);

    const form=document.createElement('section');
    form.className='gz-auth-form';
    original.forEach(n=>form.appendChild(n));

    stage.appendChild(visual);
    stage.appendChild(form);
    body.appendChild(stage);

    try{
      const brand=document.getElementById('gpBrandLogo');
      const logo=visual.querySelector('.gz-auth-logo');
      if(brand && logo && brand.src) logo.src=brand.src;
    }catch{}

    requestAnimationFrame(()=>form.classList.add('is-switching'));
  }

  function watch(){
    inject();
    const body=getBody();
    if(!body) return;
    if(body.dataset.gzAuthObserver==='1'){
      if(body.dataset.gzAuthAnimated!=='1') build(body);
      return;
    }
    body.dataset.gzAuthObserver='1';
    const obs=new MutationObserver(()=>build(body));
    obs.observe(body,{childList:true,subtree:true});
    build(body);
  }

  function boot(){
    inject();
    let tries=0;
    const timer=setInterval(()=>{
      watch();
      if(++tries>40) clearInterval(timer);
    },250);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
})();
