const now = () => new Date().toISOString();
const clean = (v, n = 10000) => String(v ?? '').trim().slice(0, n);
const json = (x, s = 200) => new Response(JSON.stringify(x), {
  status: s,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
});

async function q(e, s, p = []) { return e.DB.prepare(s).bind(...p).all(); }
async function one(e, s, p = []) { return (await q(e, s, p)).results?.[0] || null; }
// Rebuild variation links only when options_key maps unambiguously to every current option.
// Resolve all links before writing so a failed match never leaves a partial link set.
async function ensureVariationOptionLinks(e, productId, variation) {
  const parts = String(variation?.options_key || '').split('|').filter(Boolean).map(part => {
    const at = part.indexOf('=');
    return at > 0 ? [part.slice(0, at).trim(), part.slice(at + 1).trim()] : null;
  });
  if (!parts.length || parts.some(x => !x) || new Set(parts.map(x => x[0])).size !== parts.length) return false;
  const rows = (await q(e, 'SELECT po.id option_id,po.name,ov.id value_id,ov.value FROM product_options po LEFT JOIN option_values ov ON ov.option_id=po.id WHERE po.product_id=? ORDER BY po.sort_order,ov.sort_order', [productId])).results || [];
  const names = [...new Set(rows.map(x => x.name))];
  if (!names.length || names.length !== parts.length || names.some(name => !parts.some(x => x[0] === name))) return false;
  const mapped = [];
  for (const [name, value] of parts) {
    const match = rows.find(x => x.name === name && x.value === value && x.value_id);
    if (!match) return false;
    mapped.push({ option_id: match.option_id, value_id: match.value_id });
  }
  const current = (await q(e, 'SELECT option_id,option_value_id FROM variation_options WHERE variation_id=?', [variation.id])).results || [];
  if (current.length === mapped.length && mapped.every(m => current.some(c => c.option_id === m.option_id && c.option_value_id === m.value_id))) return true;
  const statements = [e.DB.prepare('DELETE FROM variation_options WHERE variation_id=?').bind(variation.id), ...mapped.map(m => e.DB.prepare('INSERT INTO variation_options(variation_id,option_id,option_value_id) VALUES(?,?,?)').bind(variation.id, m.option_id, m.value_id))];
  await e.DB.batch(statements);
  return true;
}

async function sha(v) {
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(v))))]
    .map(x => x.toString(16).padStart(2, '0')).join('');
}
function cookie(r, n) {
  for (const p of (r.headers.get('Cookie') || '').split(';')) {
    const a = p.trim().split('=');
    if (a[0] === n) return decodeURIComponent(a.slice(1).join('='));
  }
  return '';
}
async function admin(r, e) {
  const t = cookie(r, 'gz_admin_session');
  if (!t) return null;
  return one(e,
    "SELECT u.id,u.email FROM admin_sessions s JOIN admin_users u ON u.id=s.admin_user_id WHERE s.token_hash=? AND s.expires_at>?",
    [await sha(t), now()]
  );
}

let schemaPromise;
async function schema(e) {
  if (schemaPromise) return schemaPromise;
  schemaPromise = (async () => {
    for (const sql of [
      `CREATE TABLE IF NOT EXISTS product_options(id TEXT PRIMARY KEY,product_id TEXT NOT NULL,name TEXT NOT NULL,sort_order INTEGER DEFAULT 0,created_at TEXT NOT NULL,updated_at TEXT NOT NULL)`,
      `CREATE TABLE IF NOT EXISTS option_values(id TEXT PRIMARY KEY,option_id TEXT NOT NULL,value TEXT NOT NULL,sort_order INTEGER DEFAULT 0,created_at TEXT NOT NULL,updated_at TEXT NOT NULL)`,
      `CREATE TABLE IF NOT EXISTS product_variations(id TEXT PRIMARY KEY,product_id TEXT NOT NULL,sku TEXT,regular_price REAL NOT NULL DEFAULT 0,sale_price REAL,old_price REAL,stock INTEGER NOT NULL DEFAULT 0,stock_mode TEXT NOT NULL DEFAULT 'untracked',low_stock_threshold INTEGER NOT NULL DEFAULT 0,image_url TEXT,status TEXT NOT NULL DEFAULT 'Available',min_qty INTEGER NOT NULL DEFAULT 1,max_qty INTEGER,options_key TEXT NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,UNIQUE(product_id,options_key))`,
      `CREATE TABLE IF NOT EXISTS variation_options(variation_id TEXT NOT NULL,option_id TEXT NOT NULL,option_value_id TEXT NOT NULL,PRIMARY KEY(variation_id,option_id))`,
      `CREATE TABLE IF NOT EXISTS variation_images(id TEXT PRIMARY KEY,variation_id TEXT NOT NULL,image_url TEXT NOT NULL,sort_order INTEGER DEFAULT 0,created_at TEXT NOT NULL)`,
      `CREATE TABLE IF NOT EXISTS inventory_log(id TEXT PRIMARY KEY,product_id TEXT,variation_id TEXT,vendor_id TEXT,change_qty INTEGER NOT NULL,reason TEXT NOT NULL,reference_id TEXT,created_at TEXT NOT NULL)`
    ]) await e.DB.prepare(sql).run().catch(() => {});
    await e.DB.prepare("ALTER TABLE product_variations ADD COLUMN stock_mode TEXT NOT NULL DEFAULT 'untracked'").run().catch(() => {});
    await e.DB.prepare("UPDATE product_variations SET stock_mode='tracked' WHERE stock_mode='untracked' AND (COALESCE(stock,0)>0 OR status='Out of Stock')").run().catch(() => {});
  })().catch(err => { schemaPromise = null; throw err; });
  return schemaPromise;
}

function opts(b) {
  const seen=new Set();
  return (Array.isArray(b) ? b : []).map((o, i) => ({
    name: clean(o?.name, 80),
    values: [...new Set((Array.isArray(o?.values) ? o.values : []).map(v => clean(v, 120)).filter(Boolean))],
    sort_order: i
  })).filter(o => o.name && o.values.length && !seen.has(o.name) && seen.add(o.name));
}
function combos(os) {
  let r = [{}];
  for (const o of os) {
    const n = [];
    for (const x of r) for (const v of o.values) n.push({ ...x, [o.name]: v });
    r = n;
  }
  return r;
}
function key(x) {
  return Object.entries(x).sort((a, b) => a[0].localeCompare(b[0]))
    .map(([a, b]) => `${a}=${b}`).join('|').slice(0, 1000);
}
function validateVariationInput(options, rows, makeKey) {
  if (!Array.isArray(options) || !options.length || options.some(o => !o.name || /[=|]/.test(o.name) || o.values.some(v => !v || /[=|]/.test(v)))) return false;
  const rawKeys = rows.map(row => Object.entries(row).sort((a,b)=>a[0].localeCompare(b[0])).map(([k,v])=>k+'='+v).join('|'));
  return rawKeys.every(k => k.length <= 1000) && new Set(rawKeys).size === rawKeys.length && new Set(rows.map(makeKey)).size === rows.length;
}

async function product(e, id) { return one(e, 'SELECT * FROM products WHERE id=?', [id]); }
async function load(e, id) {
  const v = await one(e, 'SELECT * FROM product_variations WHERE id=?', [id]);
  if (!v) return null;
  v.options = {};
  for (const x of (await q(e,
    'SELECT po.name,ov.value FROM variation_options vo JOIN product_options po ON po.id=vo.option_id JOIN option_values ov ON ov.id=vo.option_value_id WHERE vo.variation_id=? ORDER BY po.sort_order,ov.sort_order',
    [id])).results || []) v.options[x.name] = x.value;
  v.images = (await q(e,
    'SELECT image_url FROM variation_images WHERE variation_id=? ORDER BY sort_order,id',
    [id])).results?.map(x => x.image_url) || [];
  return v;
}

async function handle(req, e) {
  const p = new URL(req.url).pathname;
  if (!p.startsWith('/api/marketplace/admin/variations')) return null;
  const a = await admin(req, e);
  if (!a) return json({ error: 'Unauthorized' }, 401);
  await schema(e);

  const u = new URL(req.url);
  if (req.method === 'GET') {
    const pid = clean(u.searchParams.get('product_id'), 120);
    if (!pid) return json({ error: 'product_id is required.' }, 400);
    const productRow = await product(e, pid);
    if (!productRow) return json({ error: 'Product not found.' }, 404);
    const options = (await q(e,
      'SELECT * FROM product_options WHERE product_id=? ORDER BY sort_order,id', [pid])).results || [];
    for (const o of options) o.values = (await q(e,
      'SELECT * FROM option_values WHERE option_id=? ORDER BY sort_order,id', [o.id])).results || [];
    const variations = (await q(e,
      'SELECT * FROM product_variations WHERE product_id=? AND status!=\'Disabled\' ORDER BY created_at', [pid])).results || [];
    for (const v of variations) {
      v.options = {};
      for (const x of (await q(e,
        'SELECT po.name,ov.value FROM variation_options vo JOIN product_options po ON po.id=vo.option_id JOIN option_values ov ON ov.id=vo.option_value_id WHERE vo.variation_id=?',
        [v.id])).results || []) v.options[x.name] = x.value;
      v.images = (await q(e,
        'SELECT image_url FROM variation_images WHERE variation_id=? ORDER BY sort_order,id', [v.id])).results?.map(x => x.image_url) || [];
    }
    return json({ product: productRow, enabled: options.length > 0 || variations.length > 0, options, variations });
  }

  const b = await req.clone().json().catch(() => ({}));
  const pid = clean(b.product_id || u.searchParams.get('product_id'), 120);
  const productRow = await product(e, pid);
  if (!productRow) return json({ error: 'Product not found.' }, 404);

  if (req.method === 'POST') {
    const os = opts(b.options);
    if (!os.length) return json({ error: 'Add at least one option with values.' }, 400);
    const rows = combos(os);
    if (rows.length > 200) return json({ error: 'Maximum 200 generated variations per product.' }, 400);
    if (!validateVariationInput(os, rows, key)) return json({ error: 'Option names and values cannot contain = or |, and generated option keys must be unique and at most 1000 characters.' }, 400);

    const existing = (await q(e, 'SELECT id,options_key FROM product_variations WHERE product_id=?', [pid])).results || [];
    const oldBy = new Map(existing.map(x => [x.options_key, x]));
    const t = now(), keep = new Set(), statements = [];
    const oldOptions = (await q(e, 'SELECT id FROM product_options WHERE product_id=?', [pid])).results || [];
    const oldOptionIds = oldOptions.map(x => x.id);
    statements.push(e.DB.prepare('DELETE FROM variation_options WHERE variation_id IN (SELECT id FROM product_variations WHERE product_id=?)').bind(pid));
    if (oldOptionIds.length) {
      const placeholders = oldOptionIds.map(() => '?').join(',');
      statements.push(e.DB.prepare('DELETE FROM option_values WHERE option_id IN (' + placeholders + ')').bind(...oldOptionIds));
      statements.push(e.DB.prepare('DELETE FROM product_options WHERE product_id=?').bind(pid));
    }

    const map = new Map();
    for (const o of os) {
      const oid = crypto.randomUUID();
      statements.push(e.DB.prepare('INSERT INTO product_options(id,product_id,name,sort_order,created_at,updated_at) VALUES(?,?,?,?,?,?)').bind(oid, pid, o.name, o.sort_order, t, t));
      for (let i = 0; i < o.values.length; i++) {
        const valueId = crypto.randomUUID();
        statements.push(e.DB.prepare('INSERT INTO option_values(id,option_id,value,sort_order,created_at,updated_at) VALUES(?,?,?,?,?,?)').bind(valueId, oid, o.values[i], i, t, t));
        map.set(o.name + '\u0000' + o.values[i], { option_id: oid, value_id: valueId });
      }
    }

    for (const selected of rows) {
      const k = key(selected);
      keep.add(k);
      const old = oldBy.get(k);
      const id = old?.id || crypto.randomUUID();
      if (old) {
        statements.push(e.DB.prepare("UPDATE product_variations SET status=CASE WHEN status='Disabled' THEN 'Disabled' ELSE status END,updated_at=? WHERE id=?").bind(t, id));
      } else {
        statements.push(e.DB.prepare('INSERT INTO product_variations(id,product_id,sku,regular_price,sale_price,old_price,stock,stock_mode,low_stock_threshold,image_url,status,min_qty,max_qty,options_key,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(id, pid, '', Number(b.default_price ?? productRow.price ?? 0), null, null, 0, 'untracked', 5, '', 'Available', 1, null, k, t, t));
      }
      for (const o of os) {
        const m = map.get(o.name + '\u0000' + selected[o.name]);
        if (!m) return json({ error: 'Could not resolve every option value; no changes were saved.' }, 409);
        statements.push(e.DB.prepare('INSERT INTO variation_options(variation_id,option_id,option_value_id) VALUES(?,?,?)').bind(id, m.option_id, m.value_id));
      }
    }
    for (const x of existing) if (!keep.has(x.options_key)) statements.push(e.DB.prepare("UPDATE product_variations SET status='Disabled',updated_at=? WHERE id=?").bind(t, x.id));
    if (statements.length > 950) return json({ error: 'This option set is too large to save safely in one atomic batch.' }, 400);
    try {
      await e.DB.batch(statements);
    } catch (err) {
      console.error('admin variation generation batch failed', err);
      return json({ error: 'Variation options could not be saved; no partial generation was committed.' }, 500);
    }

    const generated = (await q(e, "SELECT * FROM product_variations WHERE product_id=? AND status!='Disabled' ORDER BY created_at,id", [pid])).results || [];
    for (const v of generated) {
      v.options = {};
      for (const x of (await q(e, 'SELECT po.name,ov.value FROM variation_options vo JOIN product_options po ON po.id=vo.option_id JOIN option_values ov ON ov.id=vo.option_value_id WHERE vo.variation_id=? ORDER BY po.sort_order,ov.sort_order', [v.id])).results || []) v.options[x.name] = x.value;
      v.images = (await q(e, 'SELECT image_url FROM variation_images WHERE variation_id=? ORDER BY sort_order,id', [v.id])).results?.map(x => x.image_url) || [];
    }
    return json({ ok: true, count: rows.length, options: os, variations: generated });
  }

  if (req.method === 'PATCH') {
    const id = clean(u.pathname.split('/').pop(), 120);
    const v = await one(e, 'SELECT * FROM product_variations WHERE id=? AND product_id=?', [id, pid]);
    if (!v) return json({ error: 'Variation not found.' }, 404);
    const status = ['Available', 'Out of Stock', 'Disabled'].includes(b.status) ? b.status : v.status;
    if (status === 'Available' && !(await ensureVariationOptionLinks(e, pid, v))) return json({ error: 'Cannot mark variation Available: its options_key does not match every current product option. Correct the product options first.' }, 409);
    const hasStock=b.stock!==undefined&&b.stock!==null&&b.stock!=='';
    const stock=hasStock?Math.max(0,Math.floor(Number(b.stock))):Number(v.stock||0);
    await e.DB.prepare(
      'UPDATE product_variations SET sku=?,regular_price=?,sale_price=?,old_price=?,stock=?,image_url=?,status=?,stock_mode=?,low_stock_threshold=?,min_qty=1,max_qty=NULL,updated_at=? WHERE id=?'
    ).bind(
      clean(b.sku ?? v.sku, 120),
      Math.max(0, Number(b.regular_price ?? v.regular_price)),
      b.sale_price === null || b.sale_price === '' ? null : Math.max(0, Number(b.sale_price)),
      b.old_price === null || b.old_price === '' ? null : Math.max(0, Number(b.old_price)),
      stock,
      clean(b.image_url ?? v.image_url, 2000),
      status,
      (status === 'Out of Stock' || (hasStock && stock > 0)) ? 'tracked' : 'untracked',
      (status === 'Out of Stock' || (hasStock && stock > 0)) ? 0 : Number(v.low_stock_threshold||0),
      now(), id
    ).run();
    if (Array.isArray(b.images)) {
      await e.DB.prepare('DELETE FROM variation_images WHERE variation_id=?').bind(id).run();
      for (let i = 0; i < Math.min(10, b.images.length); i++) await e.DB.prepare(
        'INSERT INTO variation_images(id,variation_id,image_url,sort_order,created_at) VALUES(?,?,?,?,?)'
      ).bind(crypto.randomUUID(), id, clean(b.images[i], 2000), i, now()).run();
    }
    return json({ ok: true, variation: await load(e, id) });
  }
  if (req.method === 'DELETE') {
    const id = clean(u.pathname.split('/').pop(), 120);
    await e.DB.prepare("UPDATE product_variations SET status='Disabled',updated_at=? WHERE id=? AND product_id=?")
      .bind(now(), id, pid).run();
    return json({ ok: true });
  }
  return json({ error: 'Method not allowed' }, 405);
}

export default {
  fetch: async (req, e, ctx, next) => {
    try {
      const r = await handle(req, e);
      if (r) return r;
      return next(req);
    } catch (err) {
      return json({ error: err?.message || 'Admin variations failed' }, 500);
    }
  }
};
