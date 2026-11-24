const now = () => new Date().toISOString();
const clean = (v, n = 10000) => String(v ?? '').trim().slice(0, n);
const json = (x, s = 200) => new Response(JSON.stringify(x), {
  status: s,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
});

async function q(e, s, p = []) { return e.DB.prepare(s).bind(...p).all(); }
async function one(e, s, p = []) { return (await q(e, s, p)).results?.[0] || null; }
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
    // Older installations may predate the generated matrix key. Add it before
    // indexing so the repair works against both fresh and upgraded D1 schemas.
    await e.DB.prepare("ALTER TABLE product_variations ADD COLUMN options_key TEXT").run().catch(() => {});
    await e.DB.prepare("ALTER TABLE product_variations ADD COLUMN stock_mode TEXT NOT NULL DEFAULT 'untracked'").run().catch(() => {});
    await e.DB.prepare("UPDATE product_variations SET stock_mode='tracked' WHERE stock_mode='untracked' AND (COALESCE(stock,0)>0 OR status='Out of Stock')").run().catch(() => {});
    // Repair legacy duplicate active combinations before enforcing uniqueness.
    // Keep one deterministic row per product/options key and disable extras.
    await e.DB.prepare(`UPDATE product_variations
      SET status='Disabled',updated_at=CURRENT_TIMESTAMP
      WHERE id IN (
        SELECT id FROM (
          SELECT id,ROW_NUMBER() OVER (
            PARTITION BY product_id,options_key ORDER BY created_at,id
          ) AS duplicate_rank
          FROM product_variations
          WHERE status!='Disabled' AND options_key IS NOT NULL AND trim(options_key)!=''
        )
        WHERE duplicate_rank>1
      )`).run().catch(() => {});
    await e.DB.prepare(`CREATE UNIQUE INDEX IF NOT EXISTS product_variations_active_options_key_unique
      ON product_variations(product_id,options_key)
      WHERE status!='Disabled' AND options_key IS NOT NULL AND options_key!=''`).run().catch(() => {});
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
export function indexExistingVariations(rows) {
  const ordered = [...(Array.isArray(rows) ? rows : [])].sort((a, b) => {
    const aDisabled = String(a?.status || '').toLowerCase() === 'disabled' ? 1 : 0;
    const bDisabled = String(b?.status || '').toLowerCase() === 'disabled' ? 1 : 0;
    return aDisabled - bDisabled
      || String(a?.created_at || '').localeCompare(String(b?.created_at || ''))
      || String(a?.id || '').localeCompare(String(b?.id || ''));
  });
  const byKey = new Map();
  const duplicateIds = new Set();
  for (const row of ordered) {
    const key = String(row?.options_key || '').trim();
    if (!key || byKey.has(key)) {
      if (row?.id) duplicateIds.add(row.id);
      continue;
    }
    byKey.set(key, row);
  }
  return { byKey, duplicateIds };
}

function key(x) {
  return Object.entries(x).sort((a, b) => a[0].localeCompare(b[0]))
    .map(([a, b]) => `${a}=${b}`).join('|').slice(0, 1000);
}
async function product(e, id) { return one(e, 'SELECT * FROM products WHERE id=?', [id]); }
async function hydrateProductOptions(e, options) {
  const byId = new Map();
  for (const option of options) {
    option.values = [];
    byId.set(String(option.id), option);
  }
  const ids = [...byId.keys()];
  for (let i = 0; i < ids.length; i += 90) {
    const chunk = ids.slice(i, i + 90);
    const placeholders = chunk.map(() => '?').join(',');
    const rows = (await q(e,
      `SELECT * FROM option_values WHERE option_id IN (${placeholders}) ORDER BY sort_order,id`,
      chunk)).results || [];
    for (const row of rows) byId.get(String(row.option_id))?.values.push(row);
  }
}

async function hydrateVariations(e, variations) {
  const byId = new Map();
  for (const variation of variations) {
    variation.options = {};
    variation.images = [];
    byId.set(String(variation.id), variation);
  }
  const ids = [...byId.keys()];
  for (let i = 0; i < ids.length; i += 90) {
    const chunk = ids.slice(i, i + 90);
    const placeholders = chunk.map(() => '?').join(',');
    const optionRows = (await q(e,
      `SELECT vo.variation_id,po.name,ov.value
       FROM variation_options vo
       JOIN product_options po ON po.id=vo.option_id
       JOIN option_values ov ON ov.id=vo.option_value_id
       WHERE vo.variation_id IN (${placeholders})
       ORDER BY po.sort_order,ov.sort_order`,
      chunk)).results || [];
    for (const row of optionRows) {
      const variation = byId.get(String(row.variation_id));
      if (variation) variation.options[row.name] = row.value;
    }
    const imageRows = (await q(e,
      `SELECT variation_id,image_url FROM variation_images
       WHERE variation_id IN (${placeholders})
       ORDER BY sort_order,id`,
      chunk)).results || [];
    for (const row of imageRows) {
      byId.get(String(row.variation_id))?.images.push(row.image_url);
    }
  }
}

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
    await hydrateProductOptions(e, options);
    const variations = (await q(e,
      'SELECT * FROM product_variations WHERE product_id=? AND status!=\'Disabled\' ORDER BY created_at', [pid])).results || [];
    await hydrateVariations(e, variations);
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

    const existing = (await q(e,
      'SELECT id,options_key,status,created_at FROM product_variations WHERE product_id=? ORDER BY created_at,id', [pid])).results || [];
    const { byKey: oldBy, duplicateIds } = indexExistingVariations(existing);
    const t = now();

    // Prepare the complete matrix replacement before writing. D1 batch() is
    // transactional: a failed statement rolls back the option and variation
    // changes together, instead of leaving a half-rebuilt matrix.
    const statements = [];
    statements.push(e.DB.prepare(
      'DELETE FROM variation_options WHERE variation_id IN (SELECT id FROM product_variations WHERE product_id=?)'
    ).bind(pid));
    statements.push(e.DB.prepare(
      'DELETE FROM option_values WHERE option_id IN (SELECT id FROM product_options WHERE product_id=?)'
    ).bind(pid));
    statements.push(e.DB.prepare('DELETE FROM product_options WHERE product_id=?').bind(pid));

    const optionValueMap = new Map();
    for (const o of os) {
      const oid = crypto.randomUUID();
      statements.push(e.DB.prepare(
        'INSERT INTO product_options(id,product_id,name,sort_order,created_at,updated_at) VALUES(?,?,?,?,?,?)'
      ).bind(oid, pid, o.name, o.sort_order, t, t));
      for (let i = 0; i < o.values.length; i++) {
        const value = o.values[i];
        const valueId = crypto.randomUUID();
        optionValueMap.set(`${o.name}\u0000${value}`, {
          option_id: oid,
          value_id: valueId
        });
        statements.push(e.DB.prepare(
          'INSERT INTO option_values(id,option_id,value,sort_order,created_at,updated_at) VALUES(?,?,?,?,?,?)'
        ).bind(valueId, oid, value, i, t, t));
      }
    }

    const keep = new Set();
    for (const selected of rows) {
      const k = key(selected);
      keep.add(k);
      const old = oldBy.get(k);
      const id = old?.id || crypto.randomUUID();
      if (old) {
        // Reintroduced combinations reactivate their original row, retaining
        // SKU, pricing, stock, inventory mode and images.
        statements.push(e.DB.prepare(
          "UPDATE product_variations SET status=CASE WHEN status='Disabled' THEN 'Available' ELSE status END,updated_at=? WHERE id=?"
        ).bind(t, id));
      } else {
        statements.push(e.DB.prepare(
          'INSERT INTO product_variations(id,product_id,sku,regular_price,sale_price,old_price,stock,stock_mode,low_stock_threshold,image_url,status,min_qty,max_qty,options_key,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
        ).bind(id, pid, '', Number(b.default_price ?? productRow.price ?? 0), null, null, 0, 'untracked', 5, '', 'Available', 1, null, k, t, t));
      }

      for (const o of os) {
        const option = optionValueMap.get(`${o.name}\u0000${selected[o.name]}`);
        if (!option) throw new Error('Generated variation references an unknown option value.');
        statements.push(e.DB.prepare(
          'INSERT INTO variation_options(variation_id,option_id,option_value_id) VALUES(?,?,?)'
        ).bind(id, option.option_id, option.value_id));
      }
    }

    for (const x of existing) {
      if (duplicateIds.has(x.id) || !keep.has(x.options_key)) {
        statements.push(e.DB.prepare(
          "UPDATE product_variations SET status='Disabled',updated_at=? WHERE id=?"
        ).bind(t, x.id));
      }
    }

    await e.DB.batch(statements);

    const generated = (await q(e,
      "SELECT * FROM product_variations WHERE product_id=? AND status!='Disabled' ORDER BY created_at,id",
      [pid])).results || [];
    await hydrateVariations(e, generated);
    return json({ ok: true, count: rows.length, options: os, variations: generated });
  }

  if (req.method === 'PATCH') {
    const id = clean(u.pathname.split('/').pop(), 120);
    const v = await one(e, 'SELECT * FROM product_variations WHERE id=? AND product_id=?', [id, pid]);
    if (!v) return json({ error: 'Variation not found.' }, 404);
    const status = ['Available', 'Out of Stock', 'Disabled'].includes(b.status) ? b.status : v.status;
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
      console.error('Admin variations request failed',err);
      return json({ error: 'Admin variations failed' }, 500);
    }
  }
};
