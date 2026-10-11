import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('checkout order guard receives the continuation callback, not the execution context', () => {
  const source = readFileSync(new URL('../vendor-system-v2.mjs', import.meta.url), 'utf8');
  assert.match(source, /async function orderGuard\(req,e,next\)/);
  assert.ok(source.includes('return orderGuard(req,e,next)'));
  assert.ok(!source.includes('return orderGuard(req,e,ctx,next)'));
});
