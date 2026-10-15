const setupCache = new WeakMap();

/**
 * Run a D1 schema/setup operation once per database binding per Worker isolate.
 * Concurrent requests share the same promise. Failed setup is evicted so a later
 * request can retry instead of permanently caching a transient failure.
 */
export async function runD1SetupOnce(db, key, setup) {
  if (!db || (typeof db !== 'object' && typeof db !== 'function')) {
    return setup();
  }
  let entries = setupCache.get(db);
  if (!entries) {
    entries = new Map();
    setupCache.set(db, entries);
  }
  if (entries.has(key)) return entries.get(key);

  const pending = Promise.resolve().then(setup);
  entries.set(key, pending);
  try {
    return await pending;
  } catch (error) {
    if (entries.get(key) === pending) entries.delete(key);
    throw error;
  }
}
