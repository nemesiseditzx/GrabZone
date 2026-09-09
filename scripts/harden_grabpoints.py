from pathlib import Path
import re


def replace_one(text, pattern, replacement, label):
    out, n = re.subn(pattern, replacement, text, count=1, flags=re.M)
    if n != 1:
        raise SystemExit(f"Expected {label} block was not found exactly once")
    return out

# rewards.js
p = Path('rewards.js')
s = p.read_text()
s = re.sub(r'\n/\* GRABZONE FORGOT PIN V7 \*/[\s\S]*\Z', '\n', s, count=1)

helper = r'''
function forgotPinStyle(){
 if(document.getElementById('gzForgotPinCleanStyle'))return;
 const s=document.createElement('style');s.id='gzForgotPinCleanStyle';s.textContent=`
 #gzRewardsApp .gz-fp-clean{position:relative;overflow:hidden;background:linear-gradient(145deg,#141414 0%,#1c1916 58%,#302015 100%);color:#fff;border:1px solid rgba(255,140,55,.28);border-radius:24px;padding:30px;box-shadow:0 24px 70px rgba(25,14,6,.25);animation:gzFpCleanIn .45s cubic-bezier(.16,1,.3,1) both}
 #gzRewardsApp .gz-fp-clean:before{content:'';position:absolute;width:250px;height:250px;right:-150px;top:-145px;border-radius:50%;border:1px solid rgba(255,122,0,.22);box-shadow:0 0 0 30px rgba(255,122,0,.05),0 0 0 60px rgba(255,122,0,.025);animation:gzFpCleanOrbit 9s linear infinite}
 #gzRewardsApp .gz-fp-clean>*{position:relative;z-index:1}
 #gzRewardsApp .gz-fp-icon{width:68px;height:68px;border-radius:18px;display:grid;place-items:center;background:#fff;color:#171717;font-size:29px;box-shadow:0 15px 35px rgba(0,0,0,.22);animation:gzFpCleanIcon .55s cubic-bezier(.16,1,.3,1) both}
 #gzRewardsApp .gz-fp-kicker{display:inline-flex;align-items:center;gap:7px;margin-top:18px;color:#ff9149;font-size:9px;letter-spacing:2.4px;font-weight:950}
 #gzRewardsApp .gz-fp-kicker i{width:6px;height:6px;border-radius:50%;background:#ff7a00;box-shadow:0 0 14px #ff7a00}
 #gzRewardsApp .gz-fp-clean h2{margin:8px 0 8px;color:#fff;font-size:30px;letter-spacing:-.5px}
 #gzRewardsApp .gz-fp-copy{color:#a9a39e;line-height:1.65;font-size:12px;max-width:600px}
 #gzRewardsApp .gz-fp-progress{display:grid;grid-template-columns:32px 1fr 32px 1fr 32px;align-items:center;gap:7px;margin:21px 0 20px}
 #gzRewardsApp .gz-fp-progress b{width:32px;height:32px;border-radius:50%;display:grid;place-items:center;background:#242321;border:1px solid #45413d;color:#8f8982;font-size:11px}
 #gzRewardsApp .gz-fp-progress b.on{background:#ff7a00;border-color:#ff7a00;color:#111;box-shadow:0 0 0 6px rgba(255,122,0,.10)}
 #gzRewardsApp .gz-fp-progress i{height:1px;background:#45413d}
 #gzRewardsApp .gz-fp-progress i.on{background:#ff7a00}
 #gzRewardsApp .gz-fp-label{display:block;margin-bottom:7px;color:#d8d1ca;font-size:10px;font-weight:850}
 #gzRewardsApp .gz-fp-field{width:100%;box-sizing:border-box;height:50px;border:1px solid #3b3936;border-radius:13px;background:#0e0f11;color:#fff;padding:0 14px;outline:none;font:800 13px system-ui;transition:.2s}
 #gzRewardsApp .gz-fp-field:focus{border-color:#ff7a00;box-shadow:0 0 0 4px rgba(255,122,0,.12)}
 #gzRewardsApp .gz-fp-actions{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:12px}
 #gzRewardsApp .gz-fp-primary,#gzRewardsApp .gz-fp-secondary{height:50px;border-radius:13px;font:900 12px system-ui;cursor:pointer;transition:.2s}
 #gzRewardsApp .gz-fp-primary{border:0;background:linear-gradient(100deg,#ff9a00,#ff5b00);color:#111;box-shadow:0 12px 28px rgba(255,106,0,.22)}
 #gzRewardsApp .gz-fp-primary:hover{transform:translateY(-2px)}
 #gzRewardsApp .gz-fp-primary:disabled{opacity:.55;cursor:wait;transform:none}
 #gzRewardsApp .gz-fp-secondary{border:1px solid #3b3936;background:#151619;color:#fff}
 #gzRewardsApp .gz-fp-secondary:hover{border-color:#ff8b42}
 #gzRewardsApp .gz-fp-msg{min-height:20px;margin-top:10px;color:#ffb5a8;font:800 11px/1.5 system-ui}
 #gzRewardsApp .gz-fp-note{display:flex;gap:9px;margin-top:17px;padding:12px 13px;border:1px solid rgba(255,255,255,.09);border-radius:14px;background:rgba(255,255,255,.045);color:#a9a19a;font-size:10px;line-height:1.55}
 #gzRewardsApp .gz-fp-note strong{color:#fff}
 #gzRewardsApp .gz-fp-otp{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:8px;margin-top:12px}
 #gzRewardsApp .gz-fp-otp input{width:100%;height:56px;box-sizing:border-box;border:1px solid #3b3936;border-radius:14px;background:#fff;color:#171717;text-align:center;font-size:23px;font-weight:950;outline:none;transition:.18s}
 #gzRewardsApp .gz-fp-otp input:focus{border-color:#ff7a00;box-shadow:0 0 0 4px rgba(255,122,0,.13);transform:translateY(-2px)}
 @keyframes gzFpCleanIn{from{opacity:0;transform:translateY(16px) scale(.99)}to{opacity:1;transform:none}}
 @keyframes gzFpCleanIcon{from{opacity:0;transform:translateY(12px) rotate(-12deg) scale(.75)}70%{transform:translateY(-3px) rotate(4deg) scale(1.05)}to{opacity:1;transform:none}}
 @keyframes gzFpCleanOrbit{to{transform:rotate(360deg)}}
 @media(max-width:700px){#gzRewardsApp .gz-fp-clean{padding:21px;border-radius:20px}#gzRewardsApp .gz-fp-clean h2{font-size:27px}#gzRewardsApp .gz-fp-actions{grid-template-columns:1fr}#gzRewardsApp .gz-fp-otp{gap:5px}#gzRewardsApp .gz-fp-otp input{height:50px;font-size:20px}}
 @media(max-width:390px){#gzRewardsApp .gz-fp-otp{gap:3px}#gzRewardsApp .gz-fp-otp input{height:47px;font-size:18px}}
 @media(prefers-reduced-motion:reduce){#gzRewardsApp .gz-fp-clean,#gzRewardsApp .gz-fp-icon,#gzRewardsApp .gz-fp-clean:before{animation:none!important;transition:none!important}}
 `;document.head.appendChild(s)
}
'''
s = s.replace('\nasync function forgot(){', helper + '\nasync function forgot(){', 1)
forgot = r'''async function forgot(){const b=$('gzRewardsBody');forgotPinStyle();b.innerHTML='<div class="gz-fp-clean"><div class="gz-fp-icon">🔐</div><div class="gz-fp-kicker"><i></i>SECURE PIN RECOVERY</div><h2>Forgot your PIN?</h2><p class="gz-fp-copy">Recover your Rewards account securely. We will send a one-time verification code to your registered email.</p><div class="gz-fp-progress"><b class="on">1</b><i class="on"></i><b>2</b><i></i><b>3</b></div><label class="gz-fp-label" for="grResetEmail">Registered Rewards email</label><input class="gz-fp-field" id="grResetEmail" type="email" autocomplete="email" placeholder="name@example.com"><div class="gz-fp-actions"><button type="button" class="gz-fp-primary" id="grSendCode">Send Verification Code →</button><button type="button" class="gz-fp-secondary" id="grBackLogin">Back to Login</button></div><div id="grMsg" class="gz-fp-msg"></div><div class="gz-fp-note">🛡️ <span><strong>Private & secure.</strong> Your verification code is sent only to the email registered with your Rewards account.</span></div></div>';$('grSendCode').onclick=sendCode;$('grBackLogin').onclick=()=>showAuth('login');$('grResetEmail').onkeydown=e=>{if(e.key==='Enter')sendCode()};$('grResetEmail').focus()}
'''
verify = r'''async function sendCode(){const m=$('grMsg'),email=$('grResetEmail')?.value.trim(),btn=$('grSendCode');if(!email||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){m.textContent='✕ Enter a valid registered Rewards email.';m.style.color='#ffb5a8';$('grResetEmail')?.focus();return}if(btn){btn.disabled=true;btn.textContent='Sending code…'}m.textContent='';try{await rpc('rewards_forgot_pin',{p_email:email});showVerify(email)}catch(e){m.textContent='✕ '+e.message;m.style.color='#ffb5a8';if(btn){btn.disabled=false;btn.textContent='Send Verification Code →'}}}
function showVerify(email){const b=$('gzRewardsBody');forgotPinStyle();b.innerHTML='<div class="gz-fp-clean"><div class="gz-fp-icon">✉️</div><div class="gz-fp-kicker"><i></i>EMAIL VERIFICATION</div><h2>Check your email</h2><p class="gz-fp-copy">Enter the 6-digit code sent to <strong style="color:#fff">'+esc(email)+'</strong>.</p><div class="gz-fp-progress"><b class="on">1</b><i class="on"></i><b class="on">2</b><i class="on"></i><b>3</b></div><div class="gz-fp-otp">'+Array.from({length:6},(_,i)=>'<input inputmode="numeric" maxlength="1" autocomplete="one-time-code" aria-label="Verification digit '+(i+1)+'">').join('')+'</div><div class="gz-fp-actions"><button type="button" class="gz-fp-primary" id="grVerify">Verify Code →</button><button type="button" class="gz-fp-secondary" id="grBackLogin">Back to Login</button></div><div id="grMsg" class="gz-fp-msg"></div><div class="gz-fp-note">📩 <span>The code expires in 10 minutes and can only be used once.</span></div></div>';const boxes=[...b.querySelectorAll('.gz-fp-otp input')],verify=$('grVerify');const syncFocus=i=>{if(boxes[i])boxes[i].focus()};boxes.forEach((x,i)=>{x.oninput=()=>{x.value=x.value.replace(/\D/g,'').slice(0,1);if(x.value&&boxes[i+1])syncFocus(i+1)};x.onkeydown=e=>{if(e.key==='Backspace'&&!x.value&&boxes[i-1]){e.preventDefault();syncFocus(i-1)};if(e.key==='Enter')verify.click()};x.onpaste=e=>{e.preventDefault();const v=(e.clipboardData?.getData('text')||'').replace(/\D/g,'').slice(0,6);boxes.forEach((q,j)=>q.value=v[j]||'');syncFocus(Math.max(0,Math.min(v.length,6)-1))}});verify.onclick=()=>verifyCode(email,boxes.map(x=>x.value).join(''));$('grBackLogin').onclick=()=>showAuth('login');boxes[0]?.focus()}
'''
s = replace_one(s, r'^async function sendCode\(\)\{.*\}$', verify, 'sendCode/showVerify')
s = replace_one(s, r'^async function verifyCode\(email\)\{.*\}$', r'''async function verifyCode(email,code){const m=$('grMsg'),btn=$('grVerify');if(!/^\d{6}$/.test(String(code||''))){m.textContent='✕ Enter all 6 digits.';m.style.color='#ffb5a8';return}if(btn){btn.disabled=true;btn.textContent='Verifying…'}try{const d=await rpc('rewards_verify_reset',{p_email:email,p_code:code});showReset(d.reset_token)}catch(e){m.textContent='✕ '+e.message;m.style.color='#ffb5a8';if(btn){btn.disabled=false;btn.textContent='Verify Code →'}}}''', 'verifyCode')
s = replace_one(s, r'^function showReset\(t\)\{.*\}$', r'''function showReset(t){const b=$('gzRewardsBody');forgotPinStyle();b.innerHTML='<div class="gz-fp-clean"><div class="gz-fp-icon">🔑</div><div class="gz-fp-kicker"><i></i>CREATE NEW PIN</div><h2>Set your new PIN</h2><p class="gz-fp-copy">Choose a new 4–6 digit PIN for your Rewards account.</p><div class="gz-fp-progress"><b class="on">1</b><i class="on"></i><b class="on">2</b><i class="on"></i><b class="on">3</b></div><label class="gz-fp-label" for="grNewPin">New Rewards PIN</label><input class="gz-fp-field" id="grNewPin" type="password" inputmode="numeric" maxlength="6" autocomplete="new-password" placeholder="4–6 digit PIN"><label class="gz-fp-label" for="grNewPin2" style="margin-top:10px">Confirm new PIN</label><input class="gz-fp-field" id="grNewPin2" type="password" inputmode="numeric" maxlength="6" autocomplete="new-password" placeholder="Confirm your PIN"><div class="gz-fp-actions"><button type="button" class="gz-fp-primary" id="grReset">Reset PIN →</button><button type="button" class="gz-fp-secondary" id="grBackLogin">Back to Login</button></div><div id="grMsg" class="gz-fp-msg"></div><div class="gz-fp-note">🛡️ <span><strong>Secure reset.</strong> Your new PIN is protected by the Rewards security system.</span></div></div>';const n1=$('grNewPin'),n2=$('grNewPin2'),btn=$('grReset');[n1,n2].forEach(x=>x.oninput=()=>{x.value=x.value.replace(/\D/g,'').slice(0,6)});btn.onclick=async()=>{const m=$('grMsg'),pin=n1.value,pin2=n2.value;if(!/^\d{4,6}$/.test(pin)||pin!==pin2){m.textContent='✕ PIN must be 4–6 digits and both fields must match.';m.style.color='#ffb5a8';return}btn.disabled=true;btn.textContent='Resetting PIN…';try{await rpc('rewards_reset_pin',{p_reset_token:t,p_pin:pin,p_pin_confirm:pin2});showAuth('login');const lm=$('grMsg');if(lm){lm.textContent='✓ PIN reset successfully. You can now log in.';lm.style.color='#08704f'}}catch(e){m.textContent='✕ '+e.message;m.style.color='#ffb5a8';btn.disabled=false;btn.textContent='Reset PIN →'}};$('grBackLogin').onclick=()=>showAuth('login');n1.focus()}
''', 'showReset')
p.write_text(s)

# grabpoints.html
p=Path('grabpoints.html');s=p.read_text()
for a,b in {
'Earn GP from eligible orders, follow your membership tier, and redeem rewards securely from one place.':'Earn GP on your member orders, follow your membership tier, and redeem rewards securely from one place.',
'যোগ্য order থেকে GP আয় করুন, membership tier দেখুন এবং এক জায়গা থেকেই নিরাপদে reward redeem করুন।':'আপনার member order থেকে GP cashback earn করুন, membership tier দেখুন এবং এক জায়গা থেকেই নিরাপদে reward redeem করুন।',
"GrabPoints (GP) is GrabZone's optional loyalty system. It is designed to reward customers who complete eligible orders and keep using GrabZone.":"GrabPoints (GP) is GrabZone's member cashback system. Members earn GP cashback on their orders according to their membership tier.",
'GrabPoints (GP) হলো GrabZone-এর optional loyalty system। যোগ্য order complete করা এবং নিয়মিত GrabZone ব্যবহার করার জন্য customers-কে reward করার জন্য এটি তৈরি করা হয়েছে।':'GrabPoints (GP) হলো GrabZone-এর member cashback system। আপনার membership tier অনুযায়ী member order থেকে GP cashback পাবেন।',
'Eligible completed orders can add GP to your account. The exact earning rule is controlled by GrabZone.':'Completed member orders add GP cashback to your account. Your membership tier determines the cashback rate.',
'যোগ্য completed order থেকে আপনার account-এ GP যোগ হতে পারে। কত GP পাবেন তা GrabZone-এর earning rule অনুযায়ী নির্ধারিত হবে।':'Completed member order থেকে আপনার account-এ GP cashback যোগ হবে। আপনার membership tier অনুযায়ী cashback rate নির্ধারিত হবে.'
}.items():s=s.replace(a,b)
s=s.replace('<script src="grabpoints-redeem-animation.js?v=20260908redeem2"></script>\n','')
s=s.replace('rewards.js?v=20260903gpfix3','rewards.js?v=20260909hardening1').replace('grabpoints-ui-final.js?v=20260908final1','grabpoints-ui-final.js?v=20260909hardening1').replace('grabpoints-redeem-flow.js?v=20260908flow3','grabpoints-redeem-flow.js?v=20260909hardening1')
p.write_text(s)

# grabpoints-ui-final.js
p=Path('grabpoints-ui-final.js');s=p.read_text()
s=re.sub(r'\nfunction fixPublicCopy\(\)\{[\s\S]*?\n\}\n\nfunction stabilize\(\)','\nfunction stabilize()',s,count=1)
s=re.sub(r'function boot\(\)\{css\(\);fixPublicCopy\(\);stabilize\(\);const mo=new MutationObserver\(\(\)=>fixPublicCopy\(\)\);mo\.observe\(document\.body,\{childList:true,subtree:true\}\);setTimeout\(\(\)=>mo\.disconnect\(\),12000\);\}','function boot(){css();stabilize();}',s,count=1)
p.write_text(s)

# worker.mjs
p=Path('worker.mjs');s=p.read_text()
for rate,extra in [('1','earn and redeem GrabPoints.'),('2','Silver member offers.'),('3','Gold member offers; bonus GP campaigns.'),('5','Platinum member offers; exclusive promotions.')]:
    s=s.replace(f'{rate}% GrabPoints cashback on eligible product purchases; {extra}',f'{rate}% GrabPoints cashback on member orders; {extra}')
s=s.replace('"Delivered order · "+rate+"% cashback on eligible products"','"Delivered member order · "+rate+"% cashback"')
s=s.replace('Eligible product spend: <b>৳"+eligibleSubtotal.toLocaleString("en-BD")+"</b>. Delivery charge is never included.','Qualifying order spend: <b>৳"+cashbackBase.toLocaleString("en-BD")+"</b>. Delivery charge is never included.')
s=s.replace('let pts=0,rate=0,cashbackValue=0,eligibleSubtotal=0,tInfo=null;','let pts=0,rate=0,cashbackValue=0,cashbackBase=0,tInfo=null;')
s=s.replace('eligibleSubtotal=Math.max(0,sub-customerDiscount);cashbackValue=Math.round(eligibleSubtotal*rate/100*100)/100;','cashbackBase=Math.max(0,sub-customerDiscount);cashbackValue=Math.round(cashbackBase*rate/100*100)/100;')
start=s.find('if(fn==="rewards_redeem")'); end=s.find('\nif(fn==="rewards_admin_list")',start)
if start<0 or end<0: raise SystemExit('rewards_redeem boundaries not found')
new_redeem='''if(fn==="rewards_redeem"){const m=await verifyRewardToken(a.p_token,env);if(!m)throw new Error("Rewards session expired.");const pin=String(a.p_pin||"");if(!/^\\d{4,6}$/.test(pin))throw new Error("Enter your 4–6 digit Rewards PIN.");const h=await rewardPinHash(pin,m.pin_salt);if(h!==m.pin_hash)throw new Error("Incorrect Rewards PIN.");const pts=Math.floor(Number(a.p_points||0));if(pts<=0||pts%10!==0)throw new Error("Redeem points in multiples of 10.");const settings=(await q(env,"SELECT grabpoints_enabled,grabpoints_value FROM site_settings WHERE id=1 LIMIT 1")).results?.[0];if(Number(settings?.grabpoints_enabled??1)!==1)throw new Error("GrabPoints are currently disabled.");const gpValue=Math.max(0.1,Number(settings?.grabpoints_value??0.1));const value=Math.round(pts*gpValue*100)/100;if(value<=0)throw new Error("GrabPoints redemption value is not configured.");const voucher="GZGP-"+crypto.randomUUID().replace(/-/g,"").slice(0,12).toUpperCase(),expires=new Date(Date.now()+48*60*60*1000).toISOString(),t=now();const batchResult=await env.DB.batch([env.DB.prepare("UPDATE customer_points SET points=points-?,total_redeemed=total_redeemed+?,updated_at=? WHERE phone=? AND points>=?").bind(pts,pts,t,m.phone,pts),env.DB.prepare("INSERT INTO rewards_tx_guard(ok) SELECT CASE WHEN changes()=1 THEN 1 ELSE 0 END"),env.DB.prepare("INSERT INTO grabpoints_ledger(id,phone,order_id,points,type,reference,reason,balance_after,qualifying_points,created_at) SELECT ?,?,?,?,'redeem',?,NULL,points,0,? FROM customer_points WHERE phone=? AND EXISTS (SELECT 1 FROM rewards_tx_guard WHERE ok=1)").bind(crypto.randomUUID(),m.phone,null,-pts,voucher,t,m.phone),env.DB.prepare("INSERT INTO rewards_vouchers(code,member_id,phone,email,points_redeemed,value,status,expires_at,created_at) SELECT ?,?,?,?,?,?,'UNUSED',?,? FROM rewards_tx_guard WHERE ok=1").bind(voucher,m.id,m.phone,m.email,pts,value,expires,t),env.DB.prepare("DELETE FROM rewards_tx_guard WHERE ok=1")]);const first=batchResult?.[0];if(!first?.success||Number(first?.meta?.changes||0)!==1)throw new Error("Insufficient GrabPoints for this redemption.");const voucherInsert=batchResult?.[3];if(!voucherInsert?.success||Number(voucherInsert?.meta?.changes||0)!==1)throw new Error("Could not create your reward voucher.");const bal=(await q(env,"SELECT points FROM customer_points WHERE phone=? LIMIT 1",[m.phone])).results?.[0];if(!bal||Number(bal.points)<0)throw new Error("Could not update your points.");const tInfo=await rewardTier(env,m.id);await rewardAudit(env,m.id,null,"POINTS_REDEEMED",null,{points:pts,value,voucher_code:voucher,expires_at:expires});const emailBody="<p>Hi <b>"+htmlEsc(m.name)+"</b>,</p><p>You redeemed <b>"+pts.toLocaleString("en-BD")+" GP</b> for a <b>৳"+value.toLocaleString("en-BD")+" reward voucher</b>.</p><div style='margin:18px 0;padding:18px;border:2px dashed #111;border-radius:14px;text-align:center'><div style='font-size:11px;letter-spacing:2px;color:#777'>YOUR ONE-TIME VOUCHER</div><div style='font-size:24px;font-weight:900;letter-spacing:2px;margin-top:8px'>"+voucher+"</div><div style='margin-top:6px;font-size:13px;color:#555'>Value: ৳"+value.toLocaleString("en-BD")+" · Expires in 48 hours</div></div><p>New GP balance: <b>"+Number(bal.points||0).toLocaleString("en-BD")+" GP</b><br>Membership tier: <b>"+htmlEsc(tInfo.tier)+"</b></p><p>At checkout, enter this voucher code and use the same Rewards account phone number. The voucher can be used once only.</p>";const emailSent=await sendRewardsEmail(env,m.email,"GrabZone Rewards — Your reward voucher is ready","Your GrabPoints reward is ready",emailBody+rewardEmailTierCard(tInfo.tier),"",false,tInfo.tier,m.name,m.member_id);return{data:{ok:true,points_redeemed:pts,balance:Number(bal.points||0),voucher_code:voucher,voucher_value:value,expires_at:expires,reference:voucher,email_sent:emailSent}}}'''
s=s[:start]+new_redeem+s[end:]
p.write_text(s)

print('Hardening source rewrite complete')
