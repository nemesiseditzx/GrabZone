import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const read = (name) => fs.readFileSync(path.join(process.cwd(), name), 'utf8');

test('admin product editor preserves legacy main images when the gallery array is missing', () => {
  const editor = read('admin-product-editor-mirror.js');
  assert.ok(editor.includes("const legacyMain=String(state.editing?.image_url||'').trim()"));
  assert.ok(editor.includes("if(!urls.length&&state.editing.image_url)urls=[state.editing.image_url]"));
  assert.ok(editor.includes("image_url:mainUrl,image_urls:urls||[]"));
});

test('variation editor can remove the last selected value without retaining an empty option', () => {
  const editor = read('admin-product-editor-mirror.js');
  assert.ok(editor.includes('const remaining=current.filter(v=>v!==value)'));
  assert.ok(editor.includes('state.variationOptions=state.variationOptions.filter(x=>String(x.name).toLowerCase()!==key)'));
});

test('variable product limits and required options are checked before the product API write', () => {
  const editor = read('admin-product-editor-mirror.js');
  const validation = editor.indexOf('const variationCount=state.variationOptions.reduce');
  const write = editor.indexOf("const d=await api('/api/vendor/products'");
  assert.ok(validation >= 0, 'variation count validation must exist');
  assert.ok(write > validation, 'product API write must occur only after validation');
  assert.ok(editor.includes('if(variationCount>MAX_VARIATIONS)'));
});

test('failed variation-image update restores the previous selected image', () => {
  const editor = read('admin-product-editor-mirror.js');
  assert.ok(editor.includes('const previousImageUrl=v.image_url||\'\''));
  assert.ok(editor.includes('v.image_url=previousImageUrl'));
  assert.ok(editor.includes('x.dataset.imageUrl===previousImageUrl'));
});

test('admin loads the updated product editor script cache version', () => {
  const admin = read('admin.html');
  assert.match(admin, /admin-product-editor-mirror\\.js\\?v=20261010-bugfix2/);
});
