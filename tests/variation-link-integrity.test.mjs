import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const files = [
  'vendor-marketplace-complete.mjs',
  'vendor-system-v2.mjs',
  'marketplace-admin-variations.mjs'
];

test('all variation PATCH handlers validate option links before enabling a variation', () => {
  for (const file of files) {
    const source = readFileSync(new URL('../' + file, import.meta.url), 'utf8');
    assert.ok(source.includes('async function ensureVariationOptionLinks('), file + ': integrity helper exists');
    assert.ok(source.includes('status===\'Available\'') || source.includes("status === 'Available'"), file + ': availability guard exists');
    assert.ok(source.includes('Cannot mark variation Available'), file + ': invalid mapping returns conflict');
  }
});

test('integrity helper resolves all option values before changing existing links', () => {
  for (const file of files) {
    const source = readFileSync(new URL('../' + file, import.meta.url), 'utf8');
    const start = source.indexOf('async function ensureVariationOptionLinks(');
    const end = source.indexOf('\n}', start);
    assert.ok(start >= 0 && end > start, file + ': helper can be isolated');
    const helper = source.slice(start, end);
    const resolveAll = helper.indexOf('for (const [name, value] of parts)');
    const firstWrite = helper.indexOf("DELETE FROM variation_options");
    assert.ok(resolveAll >= 0 && firstWrite > resolveAll, file + ': validate mappings before replacing links');
    assert.ok(helper.includes('if (!match) return false'), file + ': reject missing/ambiguous values');
    assert.ok(helper.includes('await e.DB.batch(statements)'), file + ': replace links in one D1 batch');
  }
});
