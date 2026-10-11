import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const read = (name) => fs.readFileSync(path.join(process.cwd(), name), 'utf8');

test('vendor sidebar navigation validates sections and explicitly hides every inactive section', () => {
  const js = read('vendor-dashboard.js');
  assert.ok(js.includes("const allowed=new Set(qAll('.gz-nav button[data-section]').map(b=>b.dataset.section))"));
  assert.ok(js.includes("section.style.display=active?'block':'none'"));
  assert.ok(js.includes("section.setAttribute('aria-hidden',active?'false':'true')"));
  assert.ok(js.includes("button.classList.toggle('active',active)"));
  assert.ok(js.includes("window.scrollTo({top:0,left:0,behavior:'auto'})"));
  assert.ok(js.includes("document.querySelector('.gz-nav')?.addEventListener('click'"));
  assert.ok(!js.includes("qAll('.gz-nav button').forEach(b=>b.onclick=()=>show(b.dataset.section))"));
});

test('every sidebar button points to an existing top-level vendor section', () => {
  const html = read('vendor-dashboard.html');
  const js = read('vendor-dashboard.js');
  const buttonIds = [...html.matchAll(/<button[^>]*data-section="([^"]+)"/g)].map(m => m[1]);
  const sectionIds = [...html.matchAll(/<section[^>]*id="([^"]+)"[^>]*class="gz-section/g)].map(m => m[1]);
  assert.deepEqual(buttonIds, sectionIds);
  assert.ok(js.includes("if(!allowed.has(id)||!document.getElementById(id)?.classList.contains('gz-section'))return false"));
});
