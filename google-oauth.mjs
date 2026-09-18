const REDIRECT_URI="https://vendor-system-dev-grabzone.nemesiseditzx984.workers.dev/api/google/oauth/callback";
const SCOPES=["https://www.googleapis.com/auth/gmail.send","https://www.googleapis.com/auth/spreadsheets"];

const clean=v=>String(v??"").replace(/[<>&"]/g,"");
const json=(x,s=200)=>new Response(JSON.stringify(x),{status:s,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}});
const page=(title,body,clear=false)=>new Response("<!doctype html><html><head><meta charset='UTF-8'><meta name='viewport' content='width=device-width,initial-scale=1'><title>"+title+"</title><style>body{margin:0;background:#f4f5f7;font-family:Arial,sans-serif;color:#16161a}.card{max-width:760px;margin:70px auto;background:#fff;border:1px solid #e5e7eb;border-radius:18px;padding:28px;box-shadow:0 12px 40px rgba(0,0,0,.08)}h1{margin:0 0 10px;font-size:24px}p{line-height:1.6;color:#555}code{display:block;white-space:pre-wrap;word-break:break-all;background:#f6f7f9;border:1px solid #e5e7eb;border-radius:12px;padding:14px;font-size:13px}.warn{margin-top:16px;padding:14px;border-radius:12px;background:#fff7ed;color:#9a3412;font-weight:700}</style></head><body><div class='card'>"+body+"</div></body></html>",{headers:{"Content-Type":"text/html; charset=utf-8","Cache-Control":"no-store",...(clear?{"Set-Cookie":"gz_google_oauth_state=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax"}:{})}});
function stateCookie(req){for(const p of(req.headers.get("Cookie")||"").split(";")){const a=p.trim().split("=");if(a[0]==="gz_google_oauth_state")return decodeURIComponent(a.slice(1).join("="))}return ""}
async function start(req,env){
 if(req.method!=="GET")return json({error:"Method not allowed."},405);
 const missing=["GOOGLE_CLIENT_ID","GOOGLE_CLIENT_SECRET"].filter(k=>!String(env[k]||"").trim());
 if(missing.length)return json({error:"Google OAuth client credentials are not configured.",missing},503);
 const state=crypto.randomUUID()+"."+Date.now().toString(36),u=new URL("https://accounts.google.com/o/oauth2/v2/auth");
 u.searchParams.set("client_id",env.GOOGLE_CLIENT_ID);u.searchParams.set("redirect_uri",REDIRECT_URI);u.searchParams.set("response_type","code");u.searchParams.set("access_type","offline");u.searchParams.set("prompt","consent");u.searchParams.set("include_granted_scopes","true");u.searchParams.set("login_hint",env.GMAIL_FROM_EMAIL||"grabzonesupport@gmail.com");u.searchParams.set("scope",SCOPES.join(" "));
 return new Response(null,{status:302,headers:{"Location":u.toString(),"Set-Cookie":"gz_google_oauth_state="+encodeURIComponent(state)+"; Max-Age=600; Path=/; HttpOnly; Secure; SameSite=Lax","Cache-Control":"no-store"}});
}
async function callback(req,env){
 if(req.method!=="GET")return json({error:"Method not allowed."},405);
 const u=new URL(req.url),code=u.searchParams.get("code"),returned=u.searchParams.get("state"),saved=stateCookie(req);
 if(u.searchParams.get("error"))return page("GrabZone Gmail authorization failed","<h1>Google authorization was not completed</h1><p>"+clean(u.searchParams.get("error_description")||u.searchParams.get("error"))+"</p>",true);
 if(!code)return page("GrabZone Gmail authorization failed","<h1>Missing authorization code</h1><p>Start the authorization flow again.</p>",true);
 if(!saved||!returned||saved!==returned)return page("GrabZone Gmail authorization failed","<h1>Security check failed</h1><p>The OAuth state did not match. Start the authorization flow again.</p>",true);
 const body=new URLSearchParams({code,client_id:env.GOOGLE_CLIENT_ID||"",client_secret:env.GOOGLE_CLIENT_SECRET||"",redirect_uri:REDIRECT_URI,grant_type:"authorization_code"});
 const r=await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body}),d=await r.json().catch(()=>({}));
 if(!r.ok||!d.refresh_token)return page("GrabZone Gmail authorization failed","<h1>Google token exchange failed</h1><p>"+clean(d.error_description||d.error||"No refresh token was returned.")+"</p>",true);
 return page("GrabZone Gmail authorization complete","<h1>Authorization complete ✅</h1><p>Google returned a new refresh token for <b>"+clean(env.GMAIL_FROM_EMAIL||"grabzonesupport@gmail.com")+"</b>.</p><p>Copy the token below and update the existing Cloudflare Worker secret named <b>GOOGLE_REFRESH_TOKEN</b>. Do not share this token with anyone.</p><code>"+clean(d.refresh_token)+"</code><div class='warn'>After updating the Cloudflare secret, redeploy the vendor-system-dev Worker and place a test order. This authorization includes Gmail sending and Google Sheets access.</div>",true);
}
export default async function fetchGoogleOAuth(req,env){
 const p=new URL(req.url).pathname;
 if(p==="/api/google/oauth/status"){
   return json({
     ok:true,
     client_id_configured:!!String(env.GOOGLE_CLIENT_ID||"").trim(),
     client_secret_configured:!!String(env.GOOGLE_CLIENT_SECRET||"").trim(),
     refresh_token_configured:!!String(env.GOOGLE_REFRESH_TOKEN||"").trim(),
     sheets_id_configured:!!String(env.GOOGLE_SHEETS_SPREADSHEET_ID||"").trim(),
     sender:String(env.GMAIL_FROM_EMAIL||"grabzonesupport@gmail.com")
   });
 }
 if(p==="/api/google/oauth/start")return start(req,env);
 if(p==="/api/google/oauth/callback")return callback(req,env);
 return null;
}
