import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const read=name=>fs.readFileSync(path.join(process.cwd(),name),'utf8');
test('vendor API auth falls back to a valid bearer session when a stale cookie exists',()=>{
 const complete=read('vendor-marketplace-complete.mjs');
 const v2=read('vendor-system-v2.mjs');
 assert.ok(complete.includes("for(const raw of [...new Set([cookieToken,bearer].filter(Boolean))])"));
 assert.ok(v2.includes("for(const t of [...new Set([cookieToken,bearer].filter(Boolean))])"));
 assert.ok(complete.includes("if(u)return u}return null"));
});
test('vendor upload token is issued for a verified session and the upload verifier checks that session',()=>{
 const complete=read('vendor-marketplace-complete.mjs');
 const stable=read('marketplace-stable-entry.mjs');
 assert.ok(complete.includes("scope:'vendor-upload'"));
 assert.ok(complete.includes("session_hash:await sha(sessionToken)"));
 assert.ok(complete.includes("return json({authenticated:true,user:u,upload_token})"));
 assert.ok(stable.includes("s.token_hash=? AND s.expires_at>?"));
 assert.ok(stable.includes("!payload.session_hash"));
});
test('vendor image upload obtains its short-lived token with the vendor session bearer and sends it on upload',()=>{
 const dashboard=read('vendor-dashboard.js');
 assert.ok(dashboard.includes("sessionStorage.getItem('gz_vendor_session_token')||''"));
 assert.ok(dashboard.includes("Authorization:'Bearer '+sessionToken"));
 assert.ok(dashboard.includes("headers:{Authorization:'Bearer '+token}"));
 assert.ok(dashboard.includes("fd.append('kind',scope||'product-image')"));
});
test('vendor dashboard reloads the fixed auth scripts without stale query versions',()=>{
 const html=read('vendor-dashboard.html');
 assert.ok(html.includes('/vendor-dashboard.js?v=20261011-authfix1'));
 assert.ok(html.includes('/vendor-product-editor.js?v=20261011-authfix1'));
});
