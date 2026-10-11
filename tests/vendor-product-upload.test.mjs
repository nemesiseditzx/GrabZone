import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const read = (name) => fs.readFileSync(path.join(process.cwd(), name), 'utf8');

test('vendor product editor uses the shared authenticated image uploader', () => {
  const editor = read('vendor-product-editor.js');
  const dashboard = read('vendor-dashboard.js');
  assert.ok(editor.includes("window.uploadVendorImage(f,'product-image')"));
  assert.ok(dashboard.includes('async function uploadVendorImage(file,scope)'));
  assert.ok(!editor.includes('alert('));
  assert.ok(editor.includes('const notify=(message,type=\'error\')=>'));
});

test('injected vendor upload controls report failures with non-blocking toast feedback', () => {
  const entry = read('marketplace-stable-entry.mjs');
  assert.ok(entry.includes('function toast(message)'));
  assert.ok(!entry.includes('alert('));
  const forceImageUi = read('marketplace-image-final-entry.mjs');
  const multiImageUi = read('marketplace-image-policy-entry.mjs');
  assert.ok(forceImageUi.includes('function toast(message)'));
  assert.ok(multiImageUi.includes('function toast(message)'));
  assert.ok(!forceImageUi.includes('alert('));
  assert.ok(!multiImageUi.includes('alert('));
});

test('vendor session endpoint issues a short-lived, session-bound image upload token', () => {
  const complete = read('vendor-marketplace-complete.mjs');
  const stable = read('marketplace-stable-entry.mjs');
  const dashboard = read('vendor-dashboard.js');
  assert.ok(complete.includes("scope:'vendor-upload'"));
  assert.ok(complete.includes("session_hash:await sha(session)"));
  assert.ok(complete.includes("exp:Math.floor(Date.now()/1000)+300"));
  assert.ok(stable.includes("s.token_hash=? AND s.expires_at>?"));
  assert.ok(stable.includes("!payload.session_hash"));
  assert.ok(dashboard.includes("if(!d.upload_token)throw Error('Secure image-upload authorization was not issued."));
  assert.ok(dashboard.includes("fd.append('kind',scope||'product-image')"));
  assert.ok(!dashboard.includes("d.upload_token||sessionStorage.getItem('gz_vendor_session_token')"));
});
