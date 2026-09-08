(()=>{'use strict';
const STYLE='gzFinalUiStyle';
function css(){if(document.getElementById(STYLE))return;const s=document.createElement('style');s.id=STYLE;s.textContent=`
/* GrabPoints final visual system: warm white + orange, restrained status colors. */
#gzRewardsApp.gz-auth-ui{font-family:Inter,system-ui,-apple-system,"Segoe UI",sans-serif}
#gzRewardsApp.gz-auth-ui .gz-auth-stage{border-color:#e9e1da!important;box-shadow:0 24px 70px rgba(47,31,20,.10)!important;background:#fffaf6!important}
#gzRewardsApp.gz-auth-ui .gz-auth-form{background:linear-gradient(180deg,#fff 0%,#fffdfb 100%)!important}
#gzRewardsApp.gz-auth-ui .gz-auth-form .eyebrow{color:#e85d04!important}
#gzRewardsApp.gz-auth-ui .gz-auth-form .gz-rewards-grid input:focus{border-color:#ff6b00!important;box-shadow:0 0 0 4px rgba(255,107,0,.11)!important}
#gzRewardsApp.gz-auth-ui .gz-auth-form .gz-rewards-btn:not(.alt){background:linear-gradient(100deg,#ff9800,#ff5b00)!important;color:#111!important;box-shadow:0 12px 26px rgba(255,106,0,.20)!important}
#gzRewardsApp.gz-auth-ui .gz-auth-form .gz-rewards-btn:not(.alt):hover{background:linear-gradient(100deg,#ffab18,#ff6500)!important}
#gzRewardsApp.gz-auth-ui .gz-auth-form .gz-rewards-btn.alt:hover{border-color:#ffb17c!important;background:#fff7f0!important;color:#c94d08!important}

/* Dashboard hierarchy */
.gz-rewards-dashboard{background:linear-gradient(145deg,#fffaf5 0%,#f9fbff 52%,#f7fbf9 100%)!important;border-color:#e9e4de!important;border-radius:24px!important;padding:16px!important}
.gz-dash-hero{background:linear-gradient(120deg,#171717 0%,#29231e 55%,#b94d0b 140%)!important;box-shadow:0 18px 40px rgba(48,29,17,.16)!important}
.gz-stat-grid{grid-template-columns:repeat(3,minmax(0,1fr))!important}
.gz-stat{min-height:108px!important;border-radius:17px!important}
.gz-stat.gp{background:linear-gradient(135deg,#f56b00,#ff8b19)!important}
.gz-stat.earned{background:linear-gradient(135deg,#4b5563,#64748b)!important}
.gz-stat.tier{background:linear-gradient(135deg,#7c5b31,#a77b3e)!important}
.gz-stat-12{background:linear-gradient(135deg,#59636f,#7b8794)!important}
.gz-dash-card,.gz-history-side{border-color:#e8e2dc!important;box-shadow:0 5px 20px rgba(31,24,19,.035)!important}
.gz-progress i{background:linear-gradient(90deg,#ff7a00,#ffb000)!important}
.gz-benefit-box{background:linear-gradient(135deg,#fff8f0,#fffdf8)!important;border-color:#f2dfce!important}
.gz-benefit-box b{color:#c9550a!important}
.gz-quick a:hover{border-color:#ffb27f!important;background:#fff9f4!important;transform:translateY(-1px);transition:.18s}

/* Redeem: clear visual path and no heavy black block */
.gz-redeem-premium{background:linear-gradient(145deg,#fffaf5,#fff)!important;border:1px solid #eadfd6!important;border-radius:22px!important;padding:18px!important;box-shadow:0 10px 30px rgba(66,40,20,.06)!important}
.gz-redeem-premium .gz-redeem-flow-note{background:#fff5ec!important;border-color:#f3d6c0!important;color:#765f50!important}
.gz-redeem-premium .gz-redeem-flow-note b{color:#c84f09!important}
.gz-redeem-premium .gz-redeem-amount-input{background:#fff!important;color:#171717!important;border-color:#ded6cf!important;border-radius:15px!important;height:58px!important}
.gz-redeem-premium .gz-redeem-amount-input:focus{border-color:#ff6b00!important;box-shadow:0 0 0 4px rgba(255,107,0,.10)!important}
.gz-redeem-premium .gz-redeem-continue{background:linear-gradient(100deg,#ff9800,#ff5b00)!important;color:#111!important;border-radius:15px!important;height:54px!important;box-shadow:0 13px 28px rgba(255,106,0,.18)!important}
.gz-redeem-premium .gz-redeem-continue:hover{transform:translateY(-1px);filter:saturate(1.05)}

/* PIN: lighter premium security modal, circular animated nodes */
.gz-rf-modal{background:rgba(22,17,13,.72)!important;backdrop-filter:blur(16px)!important}
.gz-rf-card{background:linear-gradient(150deg,#fff 0%,#fffaf6 58%,#fff4e9 100%)!important;color:#171717!important;border:1px solid #f0cdb5!important;box-shadow:0 35px 110px rgba(31,20,12,.28)!important}
.gz-rf-card:before{border-color:#ff6a0040!important;box-shadow:0 0 0 28px #ff6a0010,0 0 0 58px #ff6a0006!important}
.gz-rf-kicker{color:#d9570b!important}.gz-rf-secure{color:#8a7769!important}
.gz-rf-lock{background:radial-gradient(circle,#ff8a0020,#ff6a0008 58%,transparent 70%)!important;color:#d9570b!important;border-color:#ff6a00!important;box-shadow:0 0 0 9px #ff6a000b,0 0 45px #ff6a0030!important}
.gz-rf-card h3{color:#171717!important}.gz-rf-sub{color:#75685f!important}.gz-rf-amount{color:#c8550b!important}
.gz-rf-digit{border-color:#e1d7cf!important;background:linear-gradient(145deg,#fff,#f7f1eb)!important;color:#171717!important;box-shadow:0 5px 16px rgba(58,38,23,.07)!important;border-radius:50%!important;width:56px!important;height:56px!important}
.gz-rf-digit.active{border-color:#ff6b00!important;box-shadow:0 0 0 5px rgba(255,107,0,.10),0 0 25px rgba(255,107,0,.22)!important;transform:translateY(-4px) scale(1.05)!important}
.gz-rf-digit.filled{animation:gzRfPopRotate .38s cubic-bezier(.2,.9,.2,1)!important}
.gz-rf-key{border-color:#e4dcd5!important;background:#fff!important;color:#171717!important;box-shadow:0 4px 10px rgba(42,27,17,.05)!important}
.gz-rf-key:hover{border-color:#ffb17c!important;background:#fff8f2!important}.gz-rf-key:active{background:#ffeadb!important}.gz-rf-key.back,.gz-rf-key.clear{color:#d9570b!important}
.gz-rf-verify{background:linear-gradient(100deg,#ff9800,#ff5b00)!important;box-shadow:0 12px 30px rgba(255,106,0,.24)!important}
.gz-rf-forgot{color:#d9570b!important}.gz-rf-status{color:#796c62!important}.gz-rf-status.error{color:#d92d43!important}.gz-rf-status.success{color:#07864f!important}
.gz-rf-success{color:#171717!important}.gz-rf-success-ring{border-color:#16a66a!important;color:#0a965b!important;box-shadow:0 0 0 11px rgba(22,166,106,.09),0 0 50px rgba(22,166,106,.20)!important}
.gz-rf-success p{color:#75685f!important}.gz-rf-success button{background:#171717!important;color:#fff!important}
@keyframes gzRfPopRotate{0%{transform:scale(.45) rotate(-35deg);opacity:.2}55%{transform:scale(1.16) rotate(8deg);opacity:1}100%{transform:scale(1) rotate(0)}}
@media(max-width:760px){.gz-stat-grid{grid-template-columns:1fr 1fr!important}.gz-redeem-premium{padding:15px!important}.gz-rf-card{max-height:96vh!important}.gz-rf-digit{width:50px!important;height:50px!important}}
@media(max-width:430px){.gz-stat-grid{grid-template-columns:1fr!important}.gz-rf-digit{width:46px!important;height:46px!important}.gz-rf-digits{gap:7px!important}}
@media(prefers-reduced-motion:reduce){.gz-rf-card:before,.gz-rf-lock,.gz-rf-digit.filled{animation:none!important;transition:none!important}}
`;
document.head.appendChild(s)}
function stabilize(){
 const app=document.getElementById('gzRewardsApp');if(!app)return;
 app.classList.add('gz-ui-booting');
 if(!document.getElementById('gzBootStyle')){const s=document.createElement('style');s.id='gzBootStyle';s.textContent='#gzRewardsApp.gz-ui-booting{opacity:0;visibility:hidden}#gzRewardsApp.gz-ui-ready{opacity:1;visibility:visible;transition:opacity .16s ease}';document.head.appendChild(s)}
 const reveal=()=>{const stage=app.querySelector('.gz-auth-stage');const dash=app.querySelector('.gz-rewards-dashboard');if(stage||dash||app.querySelector('.gz-auth-shell')){app.classList.remove('gz-ui-booting');app.classList.add('gz-ui-ready');return true}return false};
 let tries=0;const t=setInterval(()=>{if(reveal()||++tries>50){clearInterval(t);if(tries>50){app.classList.remove('gz-ui-booting');app.classList.add('gz-ui-ready')}}},60);
}
function boot(){css();stabilize();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();