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


test('vendor admin product listing is paginated and supports server-side search', async () => {
  const source = (await import('node:fs')).readFileSync(
    new URL('../vendor-marketplace-complete.mjs', import.meta.url),
    'utf8',
  );
  const start = source.indexOf("if(p==='/api/vendor/admin/products'");
  const end = source.indexOf("if(p==='/api/vendor/admin/order-delete'", start);
  assert.ok(start >= 0 && end > start, 'vendor admin product route exists');
  const route = source.slice(start, end);
  assert.match(route, /searchParams\.get\('page'\)/);
  assert.match(route, /searchParams\.get\('limit'\)/);
  assert.match(route, /searchParams\.get\('search'\)/);
  assert.match(route, /COUNT\(\*\) n FROM products/);
  assert.match(route, /LIMIT \? OFFSET \?/);
  assert.match(route, /pages:Math\.max\(1,Math\.ceil\(count\/limit\)\)/);
});

test('vendor product editor loads bounded pages and exposes next/previous navigation', async () => {
  const source = (await import('node:fs')).readFileSync(
    new URL('../vendor-control-product-editor.js', import.meta.url),
    'utf8',
  );
  assert.match(source, /limit:'50'/);
  assert.match(source, /search:.*gzFpmSearch/);
  assert.match(source, /gzFpmPrev/);
  assert.match(source, /gzFpmNext/);
  assert.match(source, /Page '\+currentPage\+' of '\+totalPages/);
});


test('vendor product deletion removes dependent variation and option rows in one atomic batch', async () => {
  const source = (await import('node:fs')).readFileSync(
    new URL('../vendor-marketplace-complete.mjs', import.meta.url),
    'utf8',
  );
  const start = source.indexOf("if(p==='/api/vendor/admin/products'");
  const end = source.indexOf("if(p==='/api/vendor/admin/order-delete'", start);
  const route = source.slice(start, end);
  const deletion = route.slice(route.indexOf("if(req.method==='DELETE')"), route.indexOf("if(req.method==='PATCH')"));
  assert.match(deletion, /await e\.DB\.batch\(statements\)/);
  for (const table of ['variation_images','variation_options','product_variations','option_values','product_options','product_images','vendor_product_images','products']) {
    assert.match(deletion, new RegExp('DELETE FROM ' + table));
  }
  assert.doesNotMatch(deletion, /\.run\(\)\.catch/);
});

test('vendor variation DELETE accepts an empty request body while enforcing vendor ownership', async () => {
  const source = (await import('node:fs')).readFileSync(
    new URL('../vendor-system-v2.mjs', import.meta.url),
    'utf8',
  );
  assert.match(source, /req\.method!=='DELETE'&&!parsed/);
  assert.match(source, /productOwner\(e,pid,u\.vendor_id\)/);
  assert.match(source, /if\(req\.method==='DELETE'\)/);
});


test('legacy vendor product endpoint paginates and filters records in D1', async () => {
  const source = (await import('node:fs')).readFileSync(
    new URL('../vendor-marketplace-complete.mjs', import.meta.url),
    'utf8',
  );
  const start = source.indexOf("if(p==='/api/vendor/products'){");
  const end = source.indexOf("if(p==='/api/vendor/profile')", start);
  const route = source.slice(start, end);
  assert.match(route, /searchParams\.get\('page'\)/);
  assert.match(route, /searchParams\.get\('limit'\)/);
  assert.match(route, /searchParams\.get\('search'\)/);
  assert.match(route, /searchParams\.get\('filter'\)/);
  assert.match(route, /COUNT\(\*\) n FROM products/);
  assert.match(route, /LIMIT \? OFFSET \?/);
  assert.match(route, /pages:Math\.max\(1,Math\.ceil\(total\/limit\)\)/);
});

test('legacy vendor dashboard uses paginated search and filter controls', async () => {
  const js = (await import('node:fs')).readFileSync(
    new URL('../vendor-dashboard.js', import.meta.url),
    'utf8',
  );
  const html = (await import('node:fs')).readFileSync(
    new URL('../vendor-dashboard.html', import.meta.url),
    'utf8',
  );
  assert.match(js, /limit:'50'/);
  assert.match(js, /scheduleProductSearch\(\)/);
  assert.match(js, /gzProductsPrev/);
  assert.match(js, /gzProductsNext/);
  assert.match(html, /oninput="scheduleProductSearch\(\)"/);
  assert.match(html, /onchange="loadProducts\(1\)"/);
});


test('admin product gallery create and replace operations commit atomically with a 30-image cap', async () => {
  const source = (await import('node:fs')).readFileSync(
    new URL('../vendor-marketplace-complete.mjs', import.meta.url),
    'utf8',
  );
  const routeStart = source.indexOf("if(p==='/api/vendor/admin/products'");
  const routeEnd = source.indexOf("if(p==='/api/vendor/admin/order-delete'", routeStart);
  const route = source.slice(routeStart, routeEnd);
  assert.match(route, /const imageUrls=\[\.\.\.new Set\(b\.image_urls\.map/);
  assert.match(route, /\.slice\(0,30\)/);
  assert.match(route, /if\(statements\.length\)await e\.DB\.batch\(statements\)/);
  assert.match(route, /await e\.DB\.batch\(productStatements\)/);
  assert.doesNotMatch(route, /CREATE TABLE IF NOT EXISTS product_images[^\n]*\.catch/);
});

test('legacy product variation saves preserve matching rows and commit as one batch', async () => {
  const source = (await import('node:fs')).readFileSync(
    new URL('../vendor-marketplace-complete.mjs', import.meta.url),
    'utf8',
  );
  const start = source.indexOf('async function saveVariations(');
  const end = source.indexOf("if(p==='/api/vendor/admin/order-delete'", start);
  const fn = source.slice(start, end);
  assert.match(fn, /await e\.DB\.batch\(statements\)/);
  assert.match(fn, /SELECT id,options_key,status,created_at,sku,regular_price/);
  assert.match(fn, /DELETE FROM variation_options/);
  assert.match(fn, /DELETE FROM option_values/);
  assert.match(fn, /DELETE FROM product_options/);
  assert.match(fn, /UPDATE product_variations SET sku=\?,regular_price/);
  assert.match(fn, /statements\.length>900/);
  assert.doesNotMatch(fn, /DELETE FROM product_variations WHERE product_id/);
});
