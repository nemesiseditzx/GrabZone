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
});
