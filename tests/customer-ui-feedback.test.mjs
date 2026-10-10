import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const read = (name) => fs.readFileSync(path.join(process.cwd(), name), 'utf8');

test('customer variation picker uses non-blocking accessible error feedback', () => {
  const cart = read('cart.js');
  assert.ok(cart.includes('gzCustomerToastRoot'));
  assert.ok(!cart.includes('alert('));
});

test('order tracking invoice export reports failures without a blocking browser alert', () => {
  const tracking = read('track-order.js');
  assert.ok(tracking.includes('gzTrackToastRoot'));
  assert.ok(!tracking.includes('alert('));
});

test('admin product editor mirror uses non-blocking feedback', () => {
  const editor = read('admin-product-editor-mirror.js');
  assert.ok(editor.includes('gzAdminProductToastRoot'));
  assert.ok(!editor.includes('alert('));
});


test('Cloudflare Workers preview frontends call their own backend origin', async () => {
  const vm = await import('node:vm');
  const configSource = read('config.js');
  const loadConfig = (hostname, origin) => {
    const window = { location: { hostname, origin } };
    const document = {
      querySelector: () => null,
      createElement: () => ({ setAttribute() {} }),
      head: { appendChild() {} }
    };
    vm.runInNewContext(configSource, { window, document });
    return window.GRABZONE_CONFIG;
  };

  const preview = loadConfig('renovation-preview.grabzone.workers.dev', 'https://renovation-preview.grabzone.workers.dev');
  assert.equal(preview.backendUrl, 'https://renovation-preview.grabzone.workers.dev');

  const production = loadConfig('grabzone.tech', 'https://grabzone.tech');
  assert.equal(production.backendUrl, 'https://grabzone.nemesiseditzx984.workers.dev');
});
