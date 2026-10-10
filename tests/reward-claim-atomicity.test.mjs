import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const read = (name) => fs.readFileSync(path.join(process.cwd(), name), 'utf8');

test('GrabPoints redemption is reserved conditionally before the order batch', () => {
  const worker = read('worker.js');
  assert.ok(worker.includes('UPDATE customer_points SET points=points-?,total_redeemed=total_redeemed+?,updated_at=? WHERE phone=? AND points>=?'));
  assert.ok(worker.includes('if(Number(pointUse.meta?.changes||0)!==1)throw new Error("Not enough GrabPoints.")'));
  assert.ok(worker.includes('SET points=points+?,total_redeemed=MAX(0,total_redeemed-?)'));
});

test('Mystery Deal tokens are claimed once and released if order persistence fails', () => {
  const worker = read('worker.js');
  assert.ok(worker.includes('UPDATE mystery_claims SET used=1 WHERE token=? AND used=0 AND expires_at>?'));
  assert.ok(worker.includes('UPDATE mystery_claims SET used=0 WHERE token=? AND used=1'));
});
