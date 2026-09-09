from pathlib import Path
import re
p=Path('rewards.js')
s=p.read_text()
forgot="""async function forgot(){const b=$('gzRewardsBody');forgotPinStyle();b.innerHTML='<div class=\"gz-fp-clean\"><div class=\"gz-fp-icon\">🔐</div><div class=\"gz-fp-kicker\"><i></i>SECURE PIN RECOVERY</div><h2>Forgot your PIN?</h2><p class=\"gz-fp-copy\">Recover your Rewards account securely. We will send a one-time verification code to your registered email.</p><div class=\"gz-fp-progress\"><b class=\"on\">1</b><i class=\"on\"></i><b>2</b><i></i><b>3</b></div><label class=\"gz-fp-label\" for=\"grResetEmail\">Registered Rewards email</label><input class=\"gz-fp-field\" id=\"grResetEmail\" type=\"email\" autocomplete=\"email\" placeholder=\"name@example.com\"><div class=\"gz-fp-actions\"><button type=\"button\" class=\"gz-fp-primary\" id=\"grSendCode\">Send Verification Code →</button><button type=\"button\" class=\"gz-fp-secondary\" id=\"grBackLogin\">Back to Login</button></div><div id=\"grMsg\" class=\"gz-fp-msg\"></div><div class=\"gz-fp-note\">🛡️ <span><strong>Private & secure.</strong> Your verification code is sent only to the email registered with your Rewards account.</span></div></div>';$('grSendCode').onclick=sendCode;$('grBackLogin').onclick=()=>showAuth('login');$('grResetEmail').onkeydown=e=>{if(e.key==='Enter')sendCode()};$('grResetEmail').focus()}\n"""
s=re.sub(r'^async function forgot\(\)\{.*?^\}',lambda _m:forgot,s,count=1,flags=re.M|re.S)
show="""function showVerify(email){const b=$('gzRewardsBody');forgotPinStyle();b.innerHTML='<div class=\"gz-fp-clean\"><div class=\"gz-fp-icon\">✉️</div><div class=\"gz-fp-kicker\"><i></i>EMAIL VERIFICATION</div><h2>Check your email</h2><p class=\"gz-fp-copy\">Enter the 6-digit code sent to <strong style=\"color:#fff\">'+esc(email)+'</strong>.</p><div class=\"gz-fp-progress\"><b class=\"on\">1</b><i class=\"on\"></i><b class=\"on\">2</b><i class=\"on\"></i><b>3</b></div><div class=\"gz-fp-otp\">'+Array.from({length:6},(_,i)=>'<input inputmode=\"numeric\" maxlength=\"1\" autocomplete=\"one-time-code\" aria-label=\"Verification digit '+(i+1)+'\">').join('')+'</div><div class=\"gz-fp-actions\"><button type=\"button\" class=\"gz-fp-primary\" id=\"grVerify\">Verify Code →</button><button type=\"button\" class=\"gz-fp-secondary\" id=\"grBackLogin\">Back to Login</button></div><div id=\"grMsg\" class=\"gz-fp-msg\"></div><div class=\"gz-fp-note\">📩 <span>The code expires in 10 minutes and can only be used once.</span></div></div>';const boxes=[...b.querySelectorAll('.gz-fp-otp input')],verify=$('grVerify');const syncFocus=i=>{if(boxes[i])boxes[i].focus()};boxes.forEach((x,i)=>{x.oninput=()=>{x.value=x.value.replace(/\\D/g,'').slice(0,1);if(x.value&&boxes[i+1])syncFocus(i+1)};x.onkeydown=e=>{if(e.key==='Backspace'&&!x.value&&boxes[i-1]){e.preventDefault();syncFocus(i-1)};if(e.key==='Enter')verify.click()};x.onpaste=e=>{e.preventDefault();const v=(e.clipboardData?.getData('text')||'').replace(/\\D/g,'').slice(0,6);boxes.forEach((q,j)=>q.value=v[j]||'');syncFocus(Math.max(0,Math.min(v.length,6)-1))}});verify.onclick=()=>verifyCode(email,boxes.map(x=>x.value).join(''));$('grBackLogin').onclick=()=>showAuth('login');boxes[0]?.focus()}\n"""
needle='function showVerify(email){'
positions=[]
pos=0
while True:
    i=s.find(needle,pos)
    if i<0: break
    positions.append(i); pos=i+len(needle)
if not positions:
    raise SystemExit('showVerify function not found')
first=positions[0]
first_end=s.find('\n',first)
if first_end<0: raise SystemExit('showVerify line end not found')
if 'gz-fp-clean' not in s[first:first_end]:
    s=s[:first]+show+s[first_end+1:]
# remove any later legacy showVerify definitions, from bottom to top
positions=[];pos=0
while True:
    i=s.find(needle,pos)
    if i<0: break
    positions.append(i);pos=i+len(needle)
for i in reversed(positions[1:]):
    end=s.find('\n',i)
    if end<0: end=len(s)
    s=s[:i]+s[end+1:]
if s.count('async function forgot()')!=1 or s.count('function showVerify(email)')!=1: raise SystemExit('Rewards renderer invariant failed')
p.write_text(s)
print('Rewards renderer cleanup complete')
