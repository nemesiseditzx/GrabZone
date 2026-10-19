import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('variation generation loads option values once instead of querying once per combination option', () => {
  const source = readFileSync(new URL('../vendor-system-v2.mjs', import.meta.url), 'utf8');
  assert.match(source, /const optionRows=\(await q\(e,'SELECT po\.id option_id,po\.name,ov\.id value_id,ov\.value FROM product_options po JOIN option_values ov ON ov\.option_id=po\.id WHERE po\.product_id=\?',\[pid\]\)\)\.results\|\|\[\]/);
  assert.match(source, /optionValueMap\.get\(o\.name\+'\\\\u0000'\+selected\[o\.name\]\)/);
  assert.doesNotMatch(source, /one\(e,'SELECT po\.id,ov\.id value_id FROM product_options po JOIN option_values ov ON ov\.option_id=po\.id WHERE po\.product_id=\? AND po\.name=\? AND ov\.value=\?'/);
});
