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

test('multi-image writes are atomic and product image reads use bounded chunks', () => {
  const source = fs.readFileSync('marketplace-image-policy-entry.mjs', 'utf8');
  assert.match(source, /runD1SetupOnce\(env\.DB,'vendor-product-images-schema'/);
  assert.match(source, /await env\.DB\.batch\(statements\)/);
  assert.match(source, /for\(let i=0;i<ids\.length;i\+=90\)/);
  assert.match(source, /vendor_product_images WHERE product_id IN/);
  assert.doesNotMatch(source, /for\(let i=0;i<clean\.length;i\+\+\)await env\.DB\.prepare/);
});

test('obsolete second Worker config is removed from the development deployment', () => {
  assert.equal(fs.existsSync('wrangler.vendor-preview.jsonc'), false);
  const workflow = fs.readFileSync('.github/workflows/deploy-marketplace-dev.yml', 'utf8');
  assert.equal((workflow.match(/command: deploy/g) || []).length, 1);
});


test('vendor product create and image replacement use atomic D1 batches with a 30-image cap', async () => {
  const source = (await import('node:fs')).readFileSync(
    new URL('../vendor-marketplace-complete.mjs', import.meta.url),
    'utf8',
  );
  const start = source.indexOf("if(p==='/api/vendor/products'){");
  const end = source.indexOf("if(p==='/api/vendor/profile')", start);
  assert.ok(start >= 0 && end > start, 'vendor product route must exist');
  const route = source.slice(start, end);
  assert.match(route, /await e\.DB\.batch\(statements\)/);
  assert.match(route, /\.slice\(0,30\)/);
  assert.match(route, /DELETE FROM vendor_product_images/);
  assert.match(route, /INSERT INTO vendor_product_images/);
  assert.doesNotMatch(route, /\.slice\(0,10\)/);
});
