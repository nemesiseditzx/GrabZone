import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const worker = fs.readFileSync('worker.mjs', 'utf8');
const admin = fs.readFileSync('admin.js', 'utf8');
const html = fs.readFileSync('admin.html', 'utf8');

test('membership tier settings validate and batch-save thresholds and cashback rates', () => {
  assert.ok(worker.includes('Submit every membership tier together.'));
  assert.ok(worker.includes('Tier thresholds must be non-negative whole GP values.'));
  assert.ok(worker.includes('Tier cashback must be between 0% and 100%.'));
  assert.ok(worker.includes('Each higher membership tier must require more qualifying GP.'));
  assert.ok(worker.includes('env.DB.batch(current.map(row=>'));
  assert.ok(worker.includes('cashback_percent=?'));
});

test('admin growth panel exposes editable membership thresholds and cashback', () => {
  assert.ok(html.includes('id="growthTierEditor"'));
  assert.ok(html.includes('gzSaveGrowthTiers()'));
  assert.ok(html.includes('Historical orders and previously earned points are not recalculated'));
  assert.ok(admin.includes('data-tier-min'));
  assert.ok(admin.includes('data-tier-cashback'));
  assert.ok(admin.includes('async function gzSaveGrowthTiers()'));
});
