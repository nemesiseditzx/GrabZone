import test from 'node:test';
import assert from 'node:assert/strict';
import { indexExistingVariations } from '../marketplace-admin-variations.mjs';

test('variation matrix keeps one deterministic active row per options key', () => {
  const rows = [
    { id: 'older-disabled', options_key: 'Color=Black', status: 'Disabled', created_at: '2026-01-01' },
    { id: 'active-first', options_key: 'Color=Black', status: 'Available', created_at: '2026-01-02' },
    { id: 'active-duplicate', options_key: 'Color=Black', status: 'Available', created_at: '2026-01-03' },
    { id: 'other', options_key: 'Color=White', status: 'Available', created_at: '2026-01-04' },
  ];

  const { byKey, duplicateIds } = indexExistingVariations(rows);
  assert.equal(byKey.get('Color=Black').id, 'active-first');
  assert.equal(byKey.get('Color=White').id, 'other');
  assert.deepEqual([...duplicateIds].sort(), ['active-duplicate', 'older-disabled']);
});

test('variation matrix treats missing legacy keys as rows to disable, not reusable combinations', () => {
  const { byKey, duplicateIds } = indexExistingVariations([
    { id: 'legacy-null', options_key: null, status: 'Available' },
    { id: 'legacy-empty', options_key: '', status: 'Available' },
    { id: 'valid', options_key: 'Size=M', status: 'Available' },
  ]);

  assert.equal(byKey.size, 1);
  assert.equal(byKey.get('Size=M').id, 'valid');
  assert.deepEqual([...duplicateIds].sort(), ['legacy-empty', 'legacy-null']);
});

test('regenerated combinations reactivate their existing disabled row', async () => {
  const source = (await import('node:fs')).readFileSync(
    new URL('../marketplace-admin-variations.mjs', import.meta.url),
    'utf8',
  );
  assert.match(
    source,
    /SET status=CASE WHEN status='Disabled' THEN 'Available' ELSE status END,updated_at=\?/,
  );
});

test('variation matrix replacement is committed as one atomic D1 batch', async () => {
  const source = (await import('node:fs')).readFileSync(
    new URL('../marketplace-admin-variations.mjs', import.meta.url),
    'utf8',
  );
  const postStart = source.indexOf("if (req.method === 'POST')");
  const postEnd = source.indexOf('const generated = (await q(e,', postStart);
  assert.ok(postStart >= 0 && postEnd > postStart, 'POST matrix handler must be present');
  const post = source.slice(postStart, postEnd);

  assert.match(post, /await e\.DB\.batch\(statements\)/);
  assert.doesNotMatch(post, /\.run\(\)/);
  assert.match(post, /DELETE FROM variation_options/);
  assert.match(post, /DELETE FROM option_values/);
  assert.match(post, /UPDATE product_variations SET status=CASE WHEN status='Disabled' THEN 'Available'/);
  assert.match(post, /INSERT INTO variation_options/);
});



test('worker repairs legacy active duplicates before enforcing the partial unique index', async () => {
  const worker = (await import('node:fs')).readFileSync(
    new URL('../worker.mjs', import.meta.url),
    'utf8',
  );
  assert.match(worker, /variation-matrix-duplicate-repair/);
  assert.match(worker, /ROW_NUMBER\(\) OVER \(PARTITION BY product_id,options_key/);
  assert.match(worker, /product_variations_active_options_key_unique/);
});

test('variation list hydration uses bounded bulk queries instead of per-row reads', async () => {
  const source = (await import('node:fs')).readFileSync(
    new URL('../marketplace-admin-variations.mjs', import.meta.url),
    'utf8',
  );
  assert.match(source, /async function hydrateVariations\(e, variations\)/);
  assert.match(source, /i \+= 90/);
  assert.match(source, /WHERE vo\.variation_id IN \(\$\{placeholders\}\)/);
  assert.match(source, /await hydrateVariations\(e, variations\)/);
  assert.match(source, /await hydrateVariations\(e, generated\)/);
});


test('vendor variation matrix replacement is atomic and retains existing variation data', async () => {
  const source = (await import('node:fs')).readFileSync(
    new URL('../vendor-system-v2.mjs', import.meta.url),
    'utf8',
  );
  const start = source.indexOf("if(req.method==='POST')");
  const end = source.indexOf("if(req.method==='PATCH')", start);
  assert.ok(start >= 0 && end > start, 'vendor variation POST handler must exist');
  const post = source.slice(start, end);
  assert.match(post, /await e\.DB\.batch\(statements\)/);
  assert.doesNotMatch(post, /\.run\(\)/);
  assert.match(post, /DELETE FROM variation_options/);
  assert.match(post, /DELETE FROM option_values/);
  assert.match(post, /DELETE FROM product_options/);
  assert.match(post, /Keep the original ID, SKU, stock, price, image and Disabled state/);
  assert.match(post, /duplicateIds\.has\(old\.id\)/);
  assert.match(post, /statements\.length>900/);
});

test('vendor variation option labels reject ambiguous key delimiters and bound matrix expansion', async () => {
  const source = (await import('node:fs')).readFileSync(
    new URL('../vendor-system-v2.mjs', import.meta.url),
    'utf8',
  );
  assert.match(source, /\[=\|\]/);
  assert.match(source, /rows\.length\*o\.values\.length>200/);
  assert.match(source, /keys\.some\(k=>k\.length>1000\)/);
  assert.match(source, /Default variation price must be a valid non-negative number/);
});


test('vendor schema setup retries failed D1 migrations instead of caching a false success', async () => {
  const source = (await import('node:fs')).readFileSync(
    new URL('../vendor-system-v2.mjs', import.meta.url),
    'utf8',
  );
  assert.match(source, /async function applySchemaStatement\(e,sql\)/);
  assert.match(source, /duplicate column name\|already exists/);
  assert.match(source, /schemaPromise=null;console\.error\('Vendor variation schema initialization failed:'/);
  assert.match(source, /CREATE TABLE IF NOT EXISTS vendor_product_images/);
});


test('complete vendor API replaces its variation matrix in one bounded D1 batch', async () => {
  const source = (await import('node:fs')).readFileSync(
    new URL('../vendor-marketplace-complete.mjs', import.meta.url),
    'utf8',
  );
  const route = source.indexOf("if(p==='/api/vendor/variations')");
  const start = source.indexOf("if(req.method==='POST'){", route);
  const end = source.indexOf("if(req.method==='PATCH'){", start);
  assert.ok(route >= 0 && start > route && end > start, 'complete vendor variation handlers exist');
  const post = source.slice(start, end);
  assert.match(post, /await e\.DB\.batch\(statements\)/);
  assert.doesNotMatch(post, /\.run\(\)/);
  assert.match(post, /DELETE FROM variation_options/);
  assert.match(post, /DELETE FROM option_values/);
  assert.match(post, /DELETE FROM product_options/);
  assert.match(post, /duplicateIds\.has|duplicateIds/);
  assert.match(post, /statements\.length>900/);
});

test('variation availability guards and image gallery writes are safe across all API handlers', async () => {
  for (const file of ['vendor-system-v2.mjs', 'vendor-marketplace-complete.mjs', 'marketplace-admin-variations.mjs']) {
    const source = (await import('node:fs')).readFileSync(new URL('../' + file, import.meta.url), 'utf8');
    assert.match(source, /async function ensureVariationOptionLinks\(/, file);
    assert.match(source, /Cannot mark variation Available: its option links do not match the current product options\./, file);
    assert.match(source, /slice\(0, ?30\)/, file);
  }
});

test('complete vendor variation schema setup is cached and retries actual D1 errors', async () => {
  const source = (await import('node:fs')).readFileSync(
    new URL('../vendor-marketplace-complete.mjs', import.meta.url),
    'utf8',
  );
  assert.match(source, /const vendorVariationSchemaCache=new WeakMap\(\)/);
  assert.match(source, /vendorVariationSchemaCache\.delete\(e\.DB\)/);
  assert.match(source, /Vendor variation schema setup failed:/);
});


test('vendor and public variation endpoints batch option, link and image hydration', async () => {
  const source = (await import('node:fs')).readFileSync(
    new URL('../vendor-system-v2.mjs', import.meta.url),
    'utf8',
  );
  assert.match(source, /async function hydrateOptionValues\(e,options\)/);
  assert.match(source, /async function hydrateVariationRows\(e,variations\)/);
  assert.match(source, /for\(let i=0;i<ids\.length;i\+=80\)/);
  assert.match(source, /variation\.\_optionLinks\.push/);
  const publicStart = source.indexOf('async function publicVariation(');
  const publicEnd = source.indexOf('async function orderGuard(', publicStart);
  const publicHandler = source.slice(publicStart, publicEnd);
  assert.match(publicHandler, /await hydrateVariationRows\(e,vs\)/);
  assert.doesNotMatch(publicHandler, /WHERE vo\.variation_id=\?'/);
  assert.doesNotMatch(publicHandler, /WHERE variation_id=\? ORDER BY sort_order,id/);
});

test('admin product table returns lightweight product rows without loading variation matrices', async () => {
  const source = (await import('node:fs')).readFileSync(
    new URL('../vendor-marketplace-complete.mjs', import.meta.url),
    'utf8',
  );
  const start = source.indexOf("if(p==='/api/vendor/admin/products'");
  const end = source.indexOf("if(p==='/api/vendor/admin/order-delete'", start);
  const route = source.slice(start, end);
  const getStart = route.indexOf("if(req.method==='GET'){");
  const getEnd = route.indexOf("\nlet b={};", getStart);
  const get = route.slice(getStart, getEnd);
  assert.match(get, /LIMIT \? OFFSET \?/);
  assert.match(get, /This endpoint powers the product table/);
  assert.doesNotMatch(get, /SELECT \* FROM product_variations/);
  assert.doesNotMatch(get, /FROM variation_options/);
});


test('public variation recovery batches legacy option and variation repair writes', async () => {
  const source = (await import('node:fs')).readFileSync(
    new URL('../vendor-system-v2.mjs', import.meta.url),
    'utf8',
  );
  const start = source.indexOf('async function publicVariation(');
  const end = source.indexOf('async function orderGuard(', start);
  const fn = source.slice(start, end);
  assert.match(fn, /await e\.DB\.batch\(statements\)/);
  assert.match(fn, /const linkRepairs=\[\]/);
  assert.match(fn, /await e\.DB\.batch\(linkRepairs\)/);
  assert.doesNotMatch(fn, /await e\.DB\.prepare\('INSERT OR IGNORE INTO variation_options[^\n]*\.run\(\)/);
});

test('admin variation generator validates keys and bounds D1 batch statements', async () => {
  const source = (await import('node:fs')).readFileSync(
    new URL('../marketplace-admin-variations.mjs', import.meta.url),
    'utf8',
  );
  const start = source.indexOf("if (req.method === 'POST')");
  const end = source.indexOf("if (req.method === 'PATCH')", start);
  const post = source.slice(start, end);
  assert.match(post, /generatedKeys/);
  assert.match(post, /generatedKeys\.some\(value => !value \|\| value\.length > 1000\)/);
  assert.match(post, /statements\.length > 900/);
  assert.match(post, /await e\.DB\.batch\(statements\)/);
});
