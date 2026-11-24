import test from 'node:test';
import assert from 'node:assert/strict';
import { runD1SetupOnce } from '../d1-schema-cache.mjs';

test('D1 setup is shared by concurrent requests for the same binding and key',async()=>{
  const db={};
  let calls=0;
  const setup=async()=>{calls++;await Promise.resolve();return 'ready';};
  const results=await Promise.all([
    runD1SetupOnce(db,'schema',setup),
    runD1SetupOnce(db,'schema',setup),
    runD1SetupOnce(db,'schema',setup)
  ]);
  assert.deepEqual(results,['ready','ready','ready']);
  assert.equal(calls,1);
});

test('D1 setup uses independent keys and database bindings',async()=>{
  const a={},b={};
  let calls=0;
  const setup=async()=>++calls;
  await runD1SetupOnce(a,'schema-one',setup);
  await runD1SetupOnce(a,'schema-two',setup);
  await runD1SetupOnce(b,'schema-one',setup);
  assert.equal(calls,3);
});

test('failed D1 setup is not cached and can be retried',async()=>{
  const db={};
  let calls=0;
  await assert.rejects(runD1SetupOnce(db,'schema',async()=>{calls++;throw new Error('temporary');}),/temporary/);
  const value=await runD1SetupOnce(db,'schema',async()=>{calls++;return 'recovered';});
  assert.equal(value,'recovered');
  assert.equal(calls,2);
});


test('shipping settings row initialization is cached per D1 binding and retries on failure', async () => {
  const source = (await import('node:fs')).readFileSync(
    new URL('../worker.mjs', import.meta.url),
    'utf8',
  );
  assert.match(source, /const shippingSettingSetup=new WeakMap\(\)/);
  assert.match(source, /shippingSettingSetup\.get\(env\.DB\)/);
  assert.match(source, /shippingSettingSetup\.set\(env\.DB,setup\)/);
  assert.match(source, /shippingSettingSetup\.delete\(env\.DB\)/);
  assert.doesNotMatch(source, /INSERT OR IGNORE INTO site_settings\(id,global_shipping_fee\) VALUES\(1,130\)\"\)\.run\(\)\.catch/);
});
