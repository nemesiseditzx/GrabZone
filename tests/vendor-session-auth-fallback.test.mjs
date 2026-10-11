import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (name) => fs.readFileSync(name, 'utf8');

test('vendor auth checks the valid bearer session when the cookie is stale', () => {
  const complete = read('vendor-marketplace-complete.mjs');
  assert.ok(complete.includes('async function vendorSession(req,e)'));
  assert.ok(complete.includes("cookie(req,'gz_vendor_session')"));
  assert.ok(complete.includes("req.headers.get('Authorization')"));
  assert.ok(complete.includes('async function vu(req,e){return (await vendorSession(req,e))?.user||null}'));
});

test('upload token is bound to the session that actually authenticated', () => {
  const complete = read('vendor-marketplace-complete.mjs');
  assert.ok(complete.includes('const auth=await vendorSession(req,e)'));
  assert.ok(complete.includes('const u=auth.user,session=auth.token'));
  assert.ok(complete.includes("session_hash:await sha(session)"));
});

test('image upload and variation endpoints check cookie and bearer candidates', () => {
  const stable = read('marketplace-stable-entry.mjs');
  const v2 = read('vendor-system-v2.mjs');
  assert.ok(stable.includes("const candidates=[cookie(req,'gz_vendor_session')"));
  assert.ok(v2.includes("const candidates=[cookie(r,'gz_vendor_session')"));
});

test('browser requests the upload token with the saved vendor bearer session', () => {
  const dashboard = read('vendor-dashboard.js');
  assert.ok(dashboard.includes("sessionStorage.getItem('gz_vendor_session_token')||''"));
  assert.ok(dashboard.includes("Authorization:'Bearer '+sessionToken"));
  assert.ok(dashboard.includes("fetch('/api/vendor-auth',{credentials:'include',cache:'no-store',headers})"));
});

test('session verification adapts to older D1 vendor table columns', () => {
  const complete = read('vendor-marketplace-complete.mjs');
  assert.ok(complete.includes("PRAGMA table_info('+table+')"));
  assert.ok(complete.includes("uc.has('role')?'vu.role':\"'vendor_admin' role\""));
  assert.ok(complete.includes("if(uc.has('active'))checks.push('COALESCE(vu.active,1)=1')"));
  assert.ok(complete.includes("String(u.status||'').toLowerCase()!=='active'"));
});
