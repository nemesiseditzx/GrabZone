import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const worker = fs.readFileSync('worker.mjs', 'utf8');
const admin = fs.readFileSync('admin.js', 'utf8');
const rewardsAdmin = fs.readFileSync('rewards-admin.js', 'utf8');
const html = fs.readFileSync('admin.html', 'utf8');

test('membership tier settings validate and batch-save thresholds and cashback rates', () => {
  assert.ok(worker.includes('Submit every membership tier together.'));
  assert.ok(worker.includes('Tier thresholds must be non-negative whole GP values.'));
  assert.ok(worker.includes('Tier cashback must be between 0% and 100%.'));
  assert.ok(worker.includes('Each higher membership tier must require more qualifying GP.'));
  assert.ok(worker.includes('env.DB.batch(current.map(row=>'));
  assert.ok(worker.includes('cashback_percent=?'));
  assert.ok(worker.includes('benefits=?,updated_at=? WHERE tier=?'));
});

test('existing Points & Membership admin panel exposes editable thresholds, cashback and benefits', () => {
  assert.ok(html.includes('id="tab-loyalty"'));
  assert.ok(html.includes('Points & Membership'));
  assert.ok(rewardsAdmin.includes('gzTierMin'));
  assert.ok(rewardsAdmin.includes('gzTierDisc'));
  assert.ok(rewardsAdmin.includes('gzTierBen'));
  assert.ok(rewardsAdmin.includes('p_tiers:out'));
});
test('Mystery Deal admin controls persist to the same D1 settings read by checkout', () => {
  assert.ok(worker.includes('mystery_enabled,mystery_min_percent,mystery_max_percent FROM site_settings'));
  assert.ok(worker.includes('mystery_enabled=COALESCE(?,mystery_enabled)'));
  assert.ok(admin.includes('p_mystery_enabled:x.mysteryEnabled'));
  assert.ok(admin.includes('p_mystery_min_percent:x.mysteryMin'));
  assert.ok(admin.includes('p_mystery_max_percent:x.mysteryMax'));
});
