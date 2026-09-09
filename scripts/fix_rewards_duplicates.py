from pathlib import Path
import re
p=Path('rewards.js')
s=p.read_text()
clean="""async function forgot(){const b=$('gzRewardsBody');forgotPinStyle();b.innerHTML='<div class=\"gz-fp-clean\"><div class=\"gz-fp-icon\">🔐</div><div class=\"gz-fp-kicker\"><i></i>SECURE PIN RECOVERY</div><h2>Forgot your PIN?</h2><p class=\"gz-fp-copy\">Recover your Rewards account securely. We will send a one-time verification code to your registered email.</p><div class=\"gz-fp-progress\"><b class=\"on\">1</b><i class=\"on\"></i><b>2</b><i></i><b>3</b></div><label class=\"gz-fp-label\" for=\"grResetEmail\">Registered Rewards email</label><input class=\"gz-fp-field\" id=\"grResetEmail\" type=\"email\" autocomplete=\"email\" placeholder=\"name@example.com\"><div class=\"gz-fp-actions\"><button type=\"button\" class=\"gz-fp-primary\" id=\"grSendCode\">Send Verification Code →</button><button type=\"button\" class=\"gz-fp-secondary\" id=\"grBackLogin\">Back to Login</button></div><div id=\"grMsg\" class=\"gz-fp-msg\"></div><div class=\"gz-fp-note\">🛡️ <span><strong>Private & secure.</strong> Your verification code is sent only to the email registered with your Rewards account.</span></div></div>';$('grSendCode').onclick=sendCode;$('grBackLogin').onclick=()=>showAuth('login');$('grResetEmail').onkeydown=e=>{if(e.key==='Enter')sendCode()};$('grResetEmail').focus()}\n"""
s,n=re.subn(r'^async function forgot\(\)\{.*?^\}',lambda _m:clean,s,count=1,flags=re.M|re.S)
if n!=1: raise SystemExit('forgot renderer not found')
seen=0
def keep_first(m):
    global seen
    seen+=1
    return m.group(0) if seen==1 else ''
s=re.sub(r'^function showVerify\(email\)\{.*?^\}\n',keep_first,s,flags=re.M|re.S)
if seen!=2: raise SystemExit(f'expected 2 showVerify renderers, found {seen}')
if s.count('async function forgot()')!=1 or s.count('function showVerify(email)')!=1: raise SystemExit('duplicate cleanup invariant failed')
p.write_text(s)
print('Rewards duplicate renderer cleanup complete')
