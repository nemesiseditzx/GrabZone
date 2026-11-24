import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('storefront config routes every Workers preview to its own backend origin', () => {
  const config = fs.readFileSync('config.js', 'utf8');
  assert.match(config, /_gzDevWorker\s*=\s*_gzHost\.endsWith\('\.workers\.dev'\)/);
  assert.match(config, /backendUrl:\s*_gzDevWorker\s*\?\s*window\.location\.origin\s*:/);
  assert.match(config, /https:\/\/grabzone\.nemesiseditzx984\.workers\.dev/);
});

test('global config does not inject a second storefront UI layer', () => {
  const config = fs.readFileSync('config.js', 'utf8');
  assert.doesNotMatch(config, /addCss\(['"]grabzone-pro-commerce-ui\.css/);
  assert.doesNotMatch(config, /addJs\(['"]grabzone-pro-commerce-ui\.js/);
  const index = fs.readFileSync('index.html', 'utf8');
  assert.match(index, /config\.js\?v=20261015-single-ui-backend-routing/);
  assert.match(index, /var isDev=host\.endsWith\('\.workers\.dev'\)/);
});

test('vendor development deploy uses one consolidated Worker with one D1 and one R2 binding', () => {
  const config = fs.readFileSync('wrangler.marketplace-dev.jsonc', 'utf8');
  assert.match(config, /"main":\s*"\.\/marketplace-product-ui-entry\.mjs"/);
  assert.equal((config.match(/"binding":\s*"DB"/g) || []).length, 1);
  assert.equal((config.match(/"binding":\s*"ASSETS_BUCKET"/g) || []).length, 1);
  assert.match(config, /"database_name":\s*"grabzone-db-test"/);
  assert.match(config, /"bucket_name":\s*"grabzone-assets"/);

  const workflow = fs.readFileSync('.github/workflows/deploy-marketplace-dev.yml', 'utf8');
  assert.match(workflow, /deploy --config wrangler\.marketplace-dev\.jsonc/);
  assert.doesNotMatch(workflow, /wrangler\.vendor-preview\.jsonc/);
  assert.equal((workflow.match(/uses:\s*cloudflare\/wrangler-action@v4/g) || []).length, 1);
});

test('consolidated marketplace entrypoint injects vendor editor and upload auth fix', () => {
  const entry = fs.readFileSync('marketplace-product-ui-entry.mjs', 'utf8');
  assert.match(entry, /marketplace-image-final-entry\.mjs/);
  assert.match(entry, /data-gz-vendor-upload-auth-fix/);
  assert.match(entry, /vendor-control-product-editor\.js/);
  assert.match(entry, /marketplace-vendor-control-v2/);
});
