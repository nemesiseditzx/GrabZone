import app from './marketplace-runtime-fixes.mjs';

const now=()=>new Date().toISOString();
const json=(x,s=200,h={})=>new Response(JSON.stringify(x),{status:s,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...h}});
const clean=(v,n=10000)=>String(v??'').trim().slice(0,n);

async function sha(v){
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(String(v))))].map(x=>x.toString(16).padStart(2,'0')).join('');
}
async function pbkdf(password,salt){
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(String(password)),'PBKDF2',false,['deriveBits']);
  const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt:new TextEncoder().encode(String(salt)),iterations:100000,hash:'SHA-256'},key,256);
  return [...new Uint8Array(bits)].map(x=>x.toString(16).padStart(2,'0')).join('');
}
function cookie(req,name){
  for(const part of (req.headers.get('Cookie')||'').split(';')){
    const bits=part.trim().split('=');
    if(bits[0]===name)return decodeURIComponent(bits.slice(1).join('='));
  }
  return '';
}
function bearer(req){
  const auth=req.headers.get('Authorization')||'';
  if(/^Bearer\s+/i.test(auth))return auth.replace(/^Bearer\s+/i,'').trim();
  return req.headers.get('X-GrabZone-Token')||'';
}
async function one(e,sql,p=[]){return (await e.DB.prepare(sql).bind(...p).all()).results?.[0]||null}
async function adminForToken(e,token){
  if(!token)return null;
  return one(e,"SELECT u.id,u.email,s.expires_at FROM admin_sessions s JOIN admin_users u ON u.id=s.admin_user_id WHERE s.token_hash=? AND s.expires_at>?",[await sha(token),now()]);
}
function b64(b){let s='';for(const x of b)s+=String.fromCharCode(x);return btoa(s).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_')}
function ub64(s){s=String(s).replace(/-/g,'+').replace(/_/g,'/');while(s.length%4)s+='=';return Uint8Array.from(atob(s),c=>c.charCodeAt(0))}
async function hmac(secret,data){const k=await crypto.subtle.importKey('raw',new TextEncoder().encode(String(secret)),{name:'HMAC',hash:'SHA-256'},false,['sign']);return new Uint8Array(await crypto.subtle.sign('HMAC',k,new TextEncoder().encode(data)))}
async function verifySigned(token,secret){
  if(!token||!secret)return null;
  const a=String(token).split('.');if(a.length!==2)return null;
  const expected=await hmac(secret,a[0]);const got=ub64(a[1]);
  if(expected.length!==got.length)return null;let diff=0;for(let i=0;i<expected.length;i++)diff|=expected[i]^got[i];if(diff)return null;
  try{const p=JSON.parse(new TextDecoder().decode(ub64(a[0])));return p.exp>Date.now()/1000?p:null}catch{return null}
}
const authSecret=e=>String(e.MARKETPLACE_AUTH_SECRET||e.D1_AUTH_SECRET||e.GRABZONE_ADMIN_PASSWORD||'');
async function signedAdmin(e,token){
  const p=await verifySigned(token,authSecret(e));
  if(!p?.sub)return null;
  return one(e,'SELECT id,email FROM admin_users WHERE id=? OR lower(email)=lower(?)',[p.sub,p.email||'']);
}
async function ensureSession(e,token,user){
  if(!token||!user)return null;
  const expires=new Date(Date.now()+7*24*60*60*1000).toISOString();
  await e.DB.prepare('INSERT OR REPLACE INTO admin_sessions(token_hash,admin_user_id,expires_at,created_at) VALUES(?,?,?,?)').bind(await sha(token),user.id,expires,now()).run();
  return expires;
}
async function currentAdmin(req,e){
  const token=cookie(req,'gz_admin_session')||bearer(req);
  if(!token)return null;
  const dbUser=await adminForToken(e,token);
  if(dbUser)return {user:dbUser,token};
  const user=await signedAdmin(e,token);
  if(!user)return null;
  const expires_at=await ensureSession(e,token,user);
  return {user:{...user,expires_at},token};
}
function cookieHeaders(token,maxAge=604800){
  return {'Set-Cookie':`gz_admin_session=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`};
}
async function adminAuth(req,e){
  await e.DB.prepare("CREATE TABLE IF NOT EXISTS admin_users(id TEXT PRIMARY KEY,email TEXT NOT NULL UNIQUE,password_hash TEXT NOT NULL,password_salt TEXT NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL)").run();
  await e.DB.prepare("CREATE TABLE IF NOT EXISTS admin_sessions(token_hash TEXT PRIMARY KEY,admin_user_id TEXT NOT NULL,expires_at TEXT NOT NULL,created_at TEXT NOT NULL)").run();
  if(req.method==='GET'){
    const cur=await currentAdmin(req,e);
    if(!cur?.user)return json({authenticated:false},200);
    return json({authenticated:true,session_token:cur.token,user:{id:cur.user.id,email:cur.user.email},expires_at:cur.user.expires_at},200,cookieHeaders(cur.token));
  }
  if(req.method!=='POST')return json({error:'Method not allowed'},405);
  const body=await req.clone().json().catch(()=>({}));
  if(body.action==='logout'){
    const token=cookie(req,'gz_admin_session')||bearer(req);
    if(token)await e.DB.prepare('DELETE FROM admin_sessions WHERE token_hash=?').bind(await sha(token)).run().catch(()=>{});
    return json({ok:true},200,{'Set-Cookie':'gz_admin_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0'});
  }
  const email=clean(body.email,320).toLowerCase();
  const password=String(body.password||'');
  if(!email||!password)return json({error:'Email and password are required.'},400);
  const user=await one(e,'SELECT id,email,password_hash,password_salt FROM admin_users WHERE lower(email)=?', [email]);
  if(!user)return json({error:'Invalid email or password.'},401);
  const hash=await pbkdf(password,user.password_salt);
  if(hash!==user.password_hash)return json({error:'Invalid email or password.'},401);
  const token=crypto.randomUUID();
  const expires=new Date(Date.now()+7*24*60*60*1000).toISOString();
  await e.DB.prepare('INSERT INTO admin_sessions(token_hash,admin_user_id,expires_at,created_at) VALUES(?,?,?,?)').bind(await sha(token),user.id,expires,now()).run();
  return json({ok:true,authenticated:true,session_token:token,user:{id:user.id,email:user.email},expires_at:expires},200,cookieHeaders(token));
}

async function normalizeAdminRequest(req,e){
  if((new URL(req.url).pathname).startsWith('/api/admin-auth'))return req;
  if(req.headers.get('Cookie')?.match(/(?:^|;)\s*gz_admin_session=/))return req;
  const token=bearer(req);
  if(!token)return req;
  const dbUser=await adminForToken(e,token);
  const user=dbUser||await signedAdmin(e,token);
  if(!user)return req;
  if(!dbUser)await ensureSession(e,token,user);
  const h=new Headers(req.headers);
  h.set('Cookie',`gz_admin_session=${encodeURIComponent(token)}`);
  return new Request(req.url,{method:req.method,headers:h,body:['GET','HEAD'].includes(req.method)?undefined:req.body,redirect:'manual'});
}

export default {fetch:async(req,e,ctx)=>{
  try{
    const path=new URL(req.url).pathname;
    if(path==='/api/admin-auth')return adminAuth(req,e);
    const normalized=await normalizeAdminRequest(req,e);
    return app.fetch(normalized,e,ctx);
  }catch(err){
    return json({error:err?.message||'Internal server error',source:'marketplace-auth-wrapper'},500);
  }
}};
