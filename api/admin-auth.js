'use strict';

const crypto = require('crypto');

function json(res,status,body){
  res.status(status);
  res.setHeader('Content-Type','application/json');
  res.end(JSON.stringify(body));
}

function cookieValue(req,name){
  const raw=String(req.headers.cookie||'');
  for(const part of raw.split(';')){
    const [k,...rest]=part.trim().split('=');
    if(k===name)return decodeURIComponent(rest.join('='));
  }
  return '';
}

async function cfQuery(sql,params=[]){
  const account=process.env.D1_ACCOUNT_ID||process.env.R2_ACCOUNT_ID||process.env.CF_ACCOUNT_ID||process.env.CLOUDFLARE_ACCOUNT_ID;
  const database=process.env.D1_DATABASE_ID||process.env.CLOUDFLARE_D1_DATABASE_ID||'ffaa2c49-c89e-439f-9a71-89144b07dfce';
  const token=process.env.CF_API_TOKEN||process.env.CLOUDFLARE_API_TOKEN||process.env.CLOUDFLARE_API_KEY;
  if(!account||!database||!token)throw new Error('D1 is not configured.');
  const r=await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/d1/database/${database}/query`,{
    method:'POST',
    headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},
    body:JSON.stringify({sql,params})
  });
  const b=await r.json().catch(()=>({}));
  if(!r.ok||b.success===false)throw new Error(b?.errors?.map(x=>x.message).join('; ')||`D1 query failed (${r.status})`);
  return b.result?.[0]||{results:[],meta:{}};
}

async function ensureTables(){
  await cfQuery(`CREATE TABLE IF NOT EXISTS admin_users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`);
  await cfQuery(`CREATE TABLE IF NOT EXISTS admin_sessions (
    token_hash TEXT PRIMARY KEY,
    admin_user_id TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY(admin_user_id) REFERENCES admin_users(id) ON DELETE CASCADE
  )`);
  await cfQuery('CREATE INDEX IF NOT EXISTS idx_admin_sessions_expiry ON admin_sessions(expires_at)');
}

function hashPassword(password,salt){
  return crypto.scryptSync(String(password),Buffer.from(salt,'hex'),64).toString('hex');
}

function verifyPassword(password,salt,hash){
  const a=Buffer.from(hashPassword(password,salt),'hex');
  const b=Buffer.from(hash,'hex');
  return a.length===b.length&&crypto.timingSafeEqual(a,b);
}

function newToken(){
  return crypto.randomBytes(32).toString('hex');
}

function tokenHash(token){
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}
function authSecret(){
  return process.env.D1_AUTH_SECRET||process.env.CF_API_TOKEN||process.env.CLOUDFLARE_API_TOKEN||process.env.CLOUDFLARE_API_KEY||'';
}
function base64url(value){
  return Buffer.from(value).toString('base64').replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
}
function createBridgeToken(user){
  const exp=Math.floor(Date.now()/1000)+7*24*60*60;
  const payload=base64url(JSON.stringify({sub:user.id,email:user.email,exp}));
  const secret=authSecret();
  if(!secret)throw new Error('D1 authentication secret is not configured.');
  const sig=crypto.createHmac('sha256',secret).update(payload).digest('base64').replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
  return payload+'.'+sig;
}
function verifyBridgeToken(token){
  const parts=String(token||'').split('.');
  if(parts.length!==2)return null;
  const secret=authSecret();
  if(!secret)return null;
  const expected=crypto.createHmac('sha256',secret).update(parts[0]).digest('base64').replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
  const a=Buffer.from(parts[1]);
  const b=Buffer.from(expected);
  if(a.length!==b.length||!crypto.timingSafeEqual(a,b))return null;
  try{
    const payload=JSON.parse(Buffer.from(parts[0].replace(/-/g,'+').replace(/_/g,'/'),'base64').toString('utf8'));
    if(!payload?.sub||!payload?.email||Number(payload.exp||0)<=Math.floor(Date.now()/1000))return null;
    return payload;
  }catch{return null}
}

function sessionCookie(token,maxAge){
  return `gz_admin_session=${encodeURIComponent(token)}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;
}

async function supabasePasswordLogin(email,password){
  const url=String(process.env.SUPABASE_URL||'').replace(/\/$/,'');
  const key=process.env.SUPABASE_ANON_KEY||'';
  if(!url||!key)throw new Error('The existing Supabase authentication configuration is missing. Complete the D1 auth migration before removing it.');
  const r=await fetch(url+'/auth/v1/token?grant_type=password',{
    method:'POST',
    headers:{apikey:key,'Content-Type':'application/json'},
    body:JSON.stringify({email,password})
  });
  const b=await r.json().catch(()=>({}));
  if(!r.ok||!b.access_token)throw new Error(b.error_description||b.msg||'Invalid email or password.');
  return b;
}

async function createSession(user){
  const token=newToken();
  const now=new Date();
  const expires=new Date(now.getTime()+7*24*60*60*1000).toISOString();
  await cfQuery('DELETE FROM admin_sessions WHERE expires_at < ?',[now.toISOString()]);
  await cfQuery('INSERT INTO admin_sessions (token_hash,admin_user_id,expires_at,created_at) VALUES (?,?,?,?)',[tokenHash(token),user.id,expires,now.toISOString()]);
  return {token,expires};
}

async function currentSession(req){
  const cookieToken=cookieValue(req,'gz_admin_session');
  const bearer=String(req.headers.authorization||'').replace(/^Bearer\s+/i,'').trim();
  const bridgeToken=verifyBridgeToken(bearer);
  if(bridgeToken)return {id:bridgeToken.sub,email:bridgeToken.email,expires_at:new Date(bridgeToken.exp*1000).toISOString()};
  const token=cookieToken || bearer;
  if(!token)return null;
  const r=await cfQuery(`SELECT u.id,u.email,s.expires_at
    FROM admin_sessions s
    JOIN admin_users u ON u.id=s.admin_user_id
    WHERE s.token_hash=? AND s.expires_at>?
    LIMIT 1`,[tokenHash(token),new Date().toISOString()]);
  return r.results?.[0]||null;
}

module.exports=async(req,res)=>{
  if(req.method!=='POST'&&req.method!=='GET'){
    return json(res,405,{error:'Method not allowed.'});
  }
  try{
    await ensureTables();

    if(req.method==='GET'){
      const session=await currentSession(req);
      const sessionToken=cookieValue(req,'gz_admin_session');
      return json(res,200,{authenticated:Boolean(session),user:session?{id:session.id,email:session.email}:null,session_token:session?createBridgeToken({id:session.id,email:session.email}):null});
    }

    const action=String(req.body?.action||'login');

    if(action==='logout'){
      const token=cookieValue(req,'gz_admin_session');
      if(token)await cfQuery('DELETE FROM admin_sessions WHERE token_hash=?',[tokenHash(token)]);
      res.setHeader('Set-Cookie','gz_admin_session=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax');
      return json(res,200,{ok:true});
    }

    if(action!=='login')return json(res,400,{error:'Invalid auth action.'});

    const email=String(req.body?.email||'').trim().toLowerCase();
    const password=String(req.body?.password||'');
    if(!email||!password)return json(res,400,{error:'Enter your admin email and password.'});

    let r=await cfQuery('SELECT * FROM admin_users WHERE lower(email)=lower(?) LIMIT 1',[email]);
    let user=r.results?.[0]||null;

    if(user){
      if(!verifyPassword(password,user.password_salt,user.password_hash)){
        return json(res,401,{error:'Invalid email or password.'});
      }
    }else{
      /*
       * One-time migration bridge:
       * the first successful login is verified by the existing Supabase Auth,
       * then only a salted scrypt hash is stored in D1. The password itself
       * is never written to D1.
       */
      await supabasePasswordLogin(email,password);
      const id=crypto.randomUUID();
      const salt=crypto.randomBytes(16).toString('hex');
      const hash=hashPassword(password,salt);
      const now=new Date().toISOString();
      await cfQuery('INSERT INTO admin_users (id,email,password_hash,password_salt,created_at,updated_at) VALUES (?,?,?,?,?,?)',[id,email,hash,salt,now,now]);
      user={id,email};
    }

    const session=await createSession(user);
    res.setHeader('Set-Cookie',sessionCookie(session.token,7*24*60*60));
    const bridgeToken=createBridgeToken({id:user.id,email:user.email});
    return json(res,200,{ok:true,user:{id:user.id,email:user.email},expires_at:session.expires,session_token:bridgeToken});
  }catch(e){
    return json(res,500,{error:e.message||'Authentication failed.'});
  }
};
