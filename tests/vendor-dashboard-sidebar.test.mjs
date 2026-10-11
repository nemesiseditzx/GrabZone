import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read = (name) => fs.readFileSync(name, 'utf8');

test('vendor dashboard navigation has six explicit, matching sections', () => {
  const html = read('vendor-dashboard.html');
  const sections = ['dashboard','products','orders','coupons','store','settings'];
  for (const id of sections) {
    assert.ok(html.includes('data-section="'+id+'"'), 'missing nav button '+id);
    assert.ok(html.includes('id="'+id+'" class="gz-section'), 'missing section '+id);
  }
  assert.ok(html.includes('vendor-dashboard.js?v=20261011-exclusive-sections4'));
});

test('sidebar navigation binds click handlers directly and exposes section switching', () => {
  const js = read('vendor-dashboard.js');
  assert.ok(js.includes('window.gzShowVendorSection=show'));
  assert.ok(js.includes("qAll('.gz-nav button[data-section]').forEach(button=>"));
  assert.ok(js.includes("button.addEventListener('click',event=>"));
  assert.ok(js.includes("section.style.display=active?'block':'none'"));
});

test('all six sidebar icons match their current order and content fits its grid column', () => {
  const css = read('vendor.css');
  for (let i=1;i<=6;i++) assert.ok(css.includes('.gz-nav button:nth-child('+i+'):before'));
  assert.ok(css.includes('grid-template-columns:220px minmax(0,1fr)'));
  assert.ok(css.includes('.gz-main{box-sizing:border-box;min-width:0;width:100%;max-width:none}'));
});

test('only the selected top-level vendor section is visible', () => {
  const html = read('vendor-dashboard.html');
  const js = read('vendor-dashboard.js');
  const css = read('vendor.css');
  for (const id of ['products','orders','coupons','store','settings']) {
    assert.ok(html.includes('id="'+id+'" class="gz-section" hidden aria-hidden="true" inert'));
  }
  assert.ok(js.includes("qAll('main.gz-main > .gz-section')"));
  assert.ok(js.includes("section.hidden=!active"));
  assert.ok(js.includes("section.style.setProperty('display',active?'block':'none','important')"));
  assert.ok(css.includes('main.gz-main > .gz-section[hidden]{display:none!important}'));
});
