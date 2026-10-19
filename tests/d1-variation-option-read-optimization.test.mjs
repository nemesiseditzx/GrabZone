import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('variation generation builds option-value mappings in memory before a single atomic batch', () => {
  const source = readFileSync(new URL('../vendor-system-v2.mjs', import.meta.url), 'utf8');
  const start = source.indexOf("async function variations(req,e)");
  const end = source.indexOf("async function profile(", start);
  assert.ok(start >= 0 && end > start, 'variation handler exists');
  const handler = source.slice(start, end);
  assert.ok(handler.includes('const map=new Map()'), 'option-value mappings are built in memory');
  assert.ok(handler.includes("map.set(o.name+'\\u0000'+o.values[i]"), 'option values are mapped while generated');
  assert.ok(handler.includes("map.get(o.name+'\\u0000'+selected[o.name])"), 'combinations use the in-memory map');
  assert.ok(handler.includes('await e.DB.batch(statements)'), 'all matrix changes are committed atomically');
  assert.doesNotMatch(handler, /one\(e,'SELECT po\.id,ov\.id value_id FROM product_options po JOIN option_values ov ON ov\.option_id=po\.id WHERE po\.product_id=\? AND po\.name=\? AND ov\.value=\?'/, 'no per-value SELECT is issued for each combination');
});
