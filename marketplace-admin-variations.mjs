const now = () => new Date().toISOString();
const clean = (v, n = 10000) => String(v ?? '').trim().slice(0, n);
const json = (x, s = 200) => new Response(JSON.stringify(x), {
  status: s,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
});

async function q(e, s, p = []) { return e.DB.prepare(s).bind(...p).all(); }
async function one(e, s, p = []) { return (await q(e, s, p)).results?.[0] || null; }
async function ensureVariationOptionLinks(e, productId, variation) {
 const parts=String(variation?.options_key||'').split('|').filter(Boolean).map(part=>{const at=part.indexOf('=');return at>0?[part.slice(0,at).trim(),part.slice(at+1).trim()]:null});
 if(!parts.length||parts.some(x=>!x)||new Set(parts.map(x=>x[0])).size!==parts.length)return false;
 const rows=(await q(e,'SELECT po.id option_id,po.name,ov.id value_id,ov.value FROM product_options po LEFT JOIN option_values ov ON ov.option_id=po.id WHERE po.product_id=? ORDER BY po.sort_order,ov.sort_order',[productId])).results||[];
 const names=[...new Set(rows.map(x=>String(x.name)))];
 if(!names.length||names.length!==parts.length||names.some(name=>!parts.some(x=>x[0]===name)))return false;
 const mapped=[];
 for(const [name,value] of parts){const matches=rows.filter(x=>x.name===name&&x.value===value&&x.value_id);if(matches.length!==1)return false;mapped.push({option_id:matches[0].option_id,option_value_id:matches[0].value_id})}
 const current=(await q(e,'SELECT option_id,option_value_id FROM variation_options WHERE variation_id=?',[variation.id])).results||[];
 if(current.length===mapped.length&&mapped.every(m=>current.some(c=>String(c.option_id)===String(m.option_id)&&String(c.option_value_id)===String(m.option_value_id))))return true;
 await e.DB.batch([e.DB.prepare('DELETE FROM variation_options WHERE variation_id=?').bind(variation.id),...mapped.map(m=>e.DB.prepare('INSERT INTO variation_options(variation_id,option_id,option_value_id) VALUES(?,?,?)').bind(variation.id,m.option_id,m.option_value_id))]);
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
    const base = [
      `CREATE TABLE IF NOT EXISTS product_options(id TEXT PRIMARY KEY,product_id TEXT NOT NULL,name TEXT NOT NULL,sort_order INTEGER DEFAULT 0,created_at TEXT NOT NULL,updated_at TEXT NOT NULL)`,
      `CREATE TABLE IF NOT EXISTS option_values(id TEXT PRIMARY KEY,option_id TEXT NOT NULL,value TEXT NOT NULL,sort_order INTEGER DEFAULT 0,created_at TEXT NOT NULL,updated_at TEXT NOT NULL)`,
      `CREATE TABLE IF NOT EXISTS product_variations(id TEXT PRIMARY KEY,product_id TEXT NOT NULL,sku TEXT,regular_price REAL NOT NULL DEFAULT 0,sale_price REAL,old_price REAL,stock INTEGER NOT NULL DEFAULT 0,stock_mode TEXT NOT NULL DEFAULT 'untracked',low_stock_threshold INTEGER NOT NULL DEFAULT 0,image_url TEXT,status TEXT NOT NULL DEFAULT 'Available',min_qty INTEGER NOT NULL DEFAULT 1,max_qty INTEGER,options_key TEXT NOT NULL DEFAULT '',created_at TEXT NOT NULL,updated_at TEXT NOT NULL,UNIQUE(product_id,options_key))`,
      `CREATE TABLE IF NOT EXISTS variation_options(variation_id TEXT NOT NULL,option_id TEXT NOT NULL,option_value_id TEXT NOT NULL,PRIMARY KEY(variation_id,option_id))`,
      `CREATE TABLE IF NOT EXISTS variation_images(id TEXT PRIMARY KEY,variation_id TEXT NOT NULL,image_url TEXT NOT NULL,sort_order INTEGER DEFAULT 0,created_at TEXT NOT NULL)`,
      `CREATE TABLE IF NOT EXISTS inventory_log(id TEXT PRIMARY KEY,product_id TEXT,variation_id TEXT,vendor_id TEXT,change_qty INTEGER NOT NULL,reason TEXT NOT NULL,reference_id TEXT,created_at TEXT NOT NULL)`,
      `CREATE TABLE IF NOT EXISTS schema_migrations(name TEXT PRIMARY KEY,applied_at TEXT NOT NULL)`
    ];
    await e.DB.batch(base.map(sql => e.DB.prepare(sql)));

    const columns = (await e.DB.prepare("PRAGMA table_info(product_variations)").all()).results || [];
    const names = new Set(columns.map(column => String(column.name)));
    const migrations = [];
    if (!names.has('options_key')) migrations.push(e.DB.prepare("ALTER TABLE product_variations ADD COLUMN options_key TEXT"));
    if (!names.has('stock_mode')) migrations.push(e.DB.prepare("ALTER TABLE product_variations ADD COLUMN stock_mode TEXT NOT NULL DEFAULT 'untracked'"));
    if (migrations.length) await e.DB.batch(migrations);

    const t = now();
    await e.DB.batch([
      e.DB.prepare("INSERT OR IGNORE INTO schema_migrations(name,applied_at) VALUES('product-variation-stock-mode-backfill',?)").bind(t),
      e.DB.prepare("UPDATE product_variations SET stock_mode='tracked' WHERE stock_mode='untracked' AND (COALESCE(stock,0)>0 OR status='Out of Stock') AND changes()=1"),
      e.DB.prepare("INSERT OR IGNORE INTO schema_migrations(name,applied_at) VALUES('variation-matrix-duplicate-repair',?)").bind(t),
      e.DB.prepare(`UPDATE product_variations
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
        ) AND changes()=1`)
    ]);
    await e.DB.prepare(`CREATE UNIQUE INDEX IF NOT EXISTS product_variations_active_options_key_unique
      ON product_variations(product_id,options_key)
      WHERE status!='Disabled' AND options_key IS NOT NULL AND options_key!=''`).run().catch(err => console.error('Variation matrix uniqueness index unavailable', err));
  })().catch(err => { schemaPromise = null; throw err; });
  return schemaPromise;
}

function opts(b) {
  const seenNames=new Set();
  return (Array.isArray(b) ? b : []).map((o, i) => {
    const name=clean(o?.name,80).normalize('NFKC');
    const seenValues=new Set();
    const values=(Array.isArray(o?.values)?o.values:[]).map(v=>clean(v,120).normalize('NFKC')).filter(v=>{
      const k=v.toLocaleLowerCase();
      if(!v||seenValues.has(k))return false;
      seenValues.add(k);
      return true;
    });
    return {name,values,sort_order:i};
  }).filter(o=>{
    const k=o.name.toLocaleLowerCase();
    if(!o.name||!o.values.length||/[=|]/.test(o.name)||o.values.some(v=>/[=|]/.test(v))||seenNames.has(k))return false;
    seenNames.add(k);
    return true;
  });
}
function combos(os) {
  let r = [{}];
  for (const o of os) {
    if (r.length * o.values.length > 200) return null;
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
    let key=String(row?.options_key||'').trim();
    if(!key&&row?.options){
      try{
        const legacy=typeof row.options==='string'?JSON.parse(row.options):row.options;
        if(legacy&&typeof legacy==='object'&&!Array.isArray(legacy)){
          const pairs=Object.entries(legacy).map(([name,value])=>[clean(name,80),clean(value,120)]).filter(([name,value])=>name&&value);
          if(pairs.length)key=pairs.sort((a,b)=>a[0].localeCompare(b[0])).map(([name,value])=>name+'='+value).join('|');
        }
      }catch{}
    }
    row.options_key=key;
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
    .map(([a, b]) => `${a}=${b}`).join('|');
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
    if (!rows || rows.length > 200) return json({ error: 'Maximum 200 generated variations per product.' }, 400);
    const generatedKeys = rows.map(key);
    if (generatedKeys.some(value => !value || value.length > 1000) || new Set(generatedKeys).size !== generatedKeys.length) return json({ error: 'Generated variation keys are invalid or duplicated.' }, 400);
    const defaultPrice=Number(b.default_price ?? productRow.price ?? 0);
    if(!Number.isFinite(defaultPrice)||defaultPrice<0)return json({error:'Default variation price must be a valid non-negative number.'},400);

    const existing = (await q(e,
      'SELECT * FROM product_variations WHERE product_id=? ORDER BY created_at,id', [pid])).results || [];
    for(const row of existing)row._original_options_key=row.options_key;
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
        ).bind(id, pid, '', defaultPrice, null, null, 0, 'untracked', 5, '', 'Available', 1, null, k, t, t));
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
      // Backfill a recoverable legacy JSON option map before the old option rows are replaced.
      if(x.options_key&&!String(x._original_options_key||'').trim()){
        statements.push(e.DB.prepare('UPDATE product_variations SET options_key=? WHERE id=?').bind(x.options_key,x.id));
      }
      if (duplicateIds.has(x.id) || !keep.has(x.options_key)) {
        statements.push(e.DB.prepare(
          "UPDATE product_variations SET status='Disabled',updated_at=? WHERE id=?"
        ).bind(t, x.id));
      }
    }

    if (statements.length > 900) return json({ error: 'This option matrix is too large for one safe database update. Reduce the number of option values.' }, 400);
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
    if(b.status!==undefined&&!['Available','Out of Stock','Disabled'].includes(b.status))return json({error:'Invalid variation status.'},400);
    const status = b.status!==undefined?b.status:v.status;
    if (status === 'Available' && !(await ensureVariationOptionLinks(e, pid, v))) return json({ error: 'Cannot mark variation Available: its option links do not match the current product options.' }, 409);
    const hasStock=b.stock!==undefined&&b.stock!==null&&b.stock!=='';
    const stockInput=hasStock?Number(b.stock):Number(v.stock||0);
    const regularPrice=Number(b.regular_price??v.regular_price);
    const salePrice=b.sale_price===undefined?v.sale_price:(b.sale_price===null||b.sale_price===''?null:Number(b.sale_price));
    const oldPrice=b.old_price===undefined?v.old_price:(b.old_price===null||b.old_price===''?null:Number(b.old_price));
    const threshold=Number(b.low_stock_threshold??v.low_stock_threshold??0);
    if(!Number.isInteger(stockInput)||stockInput<0||stockInput>1000000000)return json({error:'Stock must be a whole number between 0 and 1,000,000,000.'},400);
    if(!Number.isFinite(regularPrice)||regularPrice<0||!Number.isFinite(threshold)||threshold<0||!Number.isInteger(threshold))return json({error:'Enter valid non-negative variation price and stock threshold values.'},400);
    if(salePrice!==null&&(!Number.isFinite(salePrice)||salePrice<0))return json({error:'Sale price must be empty or a valid non-negative number.'},400);
    if(oldPrice!==null&&(!Number.isFinite(oldPrice)||oldPrice<0))return json({error:'Old price must be empty or a valid non-negative number.'},400);
    const stockMode=status==='Out of Stock'||hasStock||String(v.stock_mode||'').toLowerCase()==='tracked'?'tracked':'untracked';
    await e.DB.prepare(
      'UPDATE product_variations SET sku=?,regular_price=?,sale_price=?,old_price=?,stock=?,image_url=?,status=?,stock_mode=?,low_stock_threshold=?,min_qty=1,max_qty=NULL,updated_at=? WHERE id=? AND product_id=?'
    ).bind(
      clean(b.sku ?? v.sku, 120),
      regularPrice,
      salePrice,
      oldPrice,
      stockInput,
      clean(b.image_url ?? v.image_url, 2000),
      status,
      stockMode,
      threshold,
      now(), id, pid
    ).run();
    if (Array.isArray(b.images)) {
      const images = [...new Set(b.images.map(x => clean(x, 2000)).filter(Boolean))].slice(0, 30);
      const t = now();
      const statements = [e.DB.prepare('DELETE FROM variation_images WHERE variation_id=?').bind(id)];
      for (let i = 0; i < images.length; i++) statements.push(e.DB.prepare(
        'INSERT INTO variation_images(id,variation_id,image_url,sort_order,created_at) VALUES(?,?,?,?,?)'
      ).bind(crypto.randomUUID(), id, images[i], i, t));
      await e.DB.batch(statements);
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
