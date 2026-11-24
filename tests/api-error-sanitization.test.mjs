import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const files = [
  'marketplace-stable-entry.mjs',
  'marketplace-api-gateway.mjs',
  'marketplace-auth-wrapper.mjs',
  'marketplace-control-wrapper.mjs',
  'marketplace-admin-variations.mjs',
  'marketplace-schema-wrapper.mjs',
  'vendor-system-v2.mjs',
  'vendor-marketplace-router.mjs',
  'vendor-admin-api-compat.mjs',
  'worker.mjs',
  'vendor-product-media-router.mjs',
  'vendor-product-media-wrapper.mjs',
  'marketplace-runtime-fixes.mjs',
  'vendor-create-fix-wrapper.mjs',
  'admin-vendor-capabilities-wrapper.mjs',
];

test('unexpected backend exceptions are not returned to API clients', () => {
  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8');
    assert.doesNotMatch(
      source,
      /json\(\s*\{\s*error\s*:\s*err\??\.message/,
      file + ' must not return raw exception messages',
    );
    assert.doesNotMatch(
      source,
      /detail\s*:\s*String\(err\??\.message/,
      file + ' must not expose exception details',
    );
  }
});

test('public variation failures return a stable sanitized response', () => {
  const source = fs.readFileSync('marketplace-stable-entry.mjs', 'utf8');
  assert.match(source, /return json\(\{error:'Variations could not be loaded\.'\},500\)/);
  assert.doesNotMatch(source, /detail:\s*String\(err\?\.message/);
});
