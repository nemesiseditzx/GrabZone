(()=>{
'use strict';
if(window.__gzAdminVariationUI)return;
window.__gzAdminVariationUI=1;

const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

async function api(url,opt={}){
  const r=await fetch(url,{credentials:'include',cache:'no-store',...opt,headers:{'Content-Type':'application/json',...(opt.headers||{})}});
  const d=await r.json().catch(()=>({}));
  if(!r.ok)throw Error(d.error||`Request failed (${r.status})`);
  return d;
}

function ensureCss(){
  if($('#gzAdminVarCSS'))return;
  const s=document.createElement('style');
  s.id='gzAdminVarCSS';
  s.textContent=`
  #gzAdminVarManager{border:2px solid #ff6b00;background:#fffaf5;border-radius:16px;padding:16px;margin-top:18px}
  .gz-av-entry-title{font-size:18px;font-weight:900}.gz-av-entry-sub{font-size:12px;color:#666;margin:5px 0 12px}
  .gz-av-entry-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.gz-av-entry select{border:1px solid #ddd;border-radius:9px;padding:10px;min-width:300px;background:#fff}
  .gz-av-entry-note{font-size:11px;color:#777;margin-top:8px}.gz-av-empty{padding:10px 0;color:#777;font-size:12px}
  #gzAdminVarModal{display:none;position:fixed;inset:0;z-index:100000}.gz-av-modal-open{display:block!important}
  .gz-av-backdrop{position:absolute;inset:0;background:rgba(0,0,0,.58);backdrop-filter:blur(4px)}
  .gz-av-box{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(1250px,96vw);max-height:92vh;overflow:auto;background:#fff;border-radius:22px;padding:22px;box-shadow:0 30px 100px rgba(0,0,0,.35)}
  .gz-av-head{display:flex;justify-content:space-between;gap:14px;align-items:flex-start;margin-bottom:15px}.gz-av-kicker{font-size:10px;font-weight:900;letter-spacing:.14em;color:#777}.gz-av-head h2{margin:4px 0}.gz-av-head p{margin:0;color:#777;font-size:13px}
  .gz-av-builder,.gz-av-bulk{border:1px solid #e7e7e2;border-radius:16px;padding:14px;margin-bottom:14px;background:#fafaf8}.gz-av-opt{display:grid;grid-template-columns:1fr 2fr auto;gap:8px;margin:8px 0}
  .gz-av-opt input,.gz-av-table input,.gz-av-table select,.gz-av-bulk input{border:1px solid #ddd;border-radius:9px;padding:9px;min-width:0}.gz-av-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.gz-av-bulk{display:flex;gap:8px;flex-wrap:wrap}
  .gz-av-table-wrap{overflow:auto;border:1px solid #e7e7e2;border-radius:14px}.gz-av-table{width:100%;border-collapse:collapse;min-width:1200px}.gz-av-table th,.gz-av-table td{padding:9px;border-bottom:1px solid #eee;text-align:left;vertical-align:middle;font-size:12px}.gz-av-table th{background:#f7f7f4;font-size:11px}.gz-av-table input{width:105px}.gz-av-table .opt-label{font-weight:900;white-space:nowrap}.gz-av-muted{color:#777;padding:14px}.gz-av-error{color:#a11;font-weight:800;padding:12px;background:#fff4f4;border-radius:10px}
  @media(max-width:700px){.gz-av-box{width:94vw;padding:15px}.gz-av-opt{grid-template-columns:1fr}.gz-av-head{flex-direction:column}.gz-av-entry select{min-width:0;width:100%}}
  `;
  document.head.appendChild(s);
}

function productIdFromRow(row){
  const el=row?.querySelector?.('.productEdit,[data-id].productEdit,[data-product-id]');
  return el?.getAttribute('data-id')||el?.getAttribute('data-product-id')||row?.querySelector?.('[data-id]')?.getAttribute('data-id')||'';
}

function ensureModal(){
  if($('#gzAdminVarModal'))return $('#gzAdminVarModal');
  const m=document.createElement('div');
  m.id='gzAdminVarModal';
  m.innerHTML='<div class="gz-av-backdrop"></div><div class="gz-av-box"><div class="gz-av-head"><div><div class="gz-av-kicker">PRODUCT VARIATIONS</div><h2 id="gzAvTitle">Variations</h2><p id="gzAvSub">Create exact option combinations and control price, SKU, stock, quantity limits and status.</p></div><button id="gzAvClose" type="button" class="gz-btn light">Close</button></div><div id="gzAvBody"></div></div>';
  document.body.appendChild(m);
  $('#gzAvClose').onclick=()=>m.classList.remove('gz-av-modal-open');
  m.querySelector('.gz-av-backdrop').onclick=()=>m.classList.remove('gz-av-modal-open');
  return m;
}

function getProducts(){
  return [...document.querySelectorAll('#productRows tr')].map(r=>{
    const id=productIdFromRow(r);
    const first=r.querySelector('td');
    const name=(first?.querySelector('b')?.textContent||first?.textContent||'Product').trim().split('\n')[0];
    return id?{id,name}:null;
  }).filter(Boolean);
}

function refreshManager(){
  const box=$('#gzAdminVarManager');
  if(!box)return;
  const select=$('#gzAvProductSelect');
  if(!select)return;
  const previous=select.value;
  const products=getProducts();
  select.innerHTML='<option value="">Select a product…</option>'+products.map(p=>`<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('');
  if(products.some(p=>p.id===previous))select.value=previous;
  select.disabled=!products.length;
  const note=box.querySelector('.gz-av-entry-note');
  if(note)note.textContent=products.length?'Choose a product, then Manage Variations. You can return here after adding more products.':'Add a product first. The variation manager will appear here automatically after the product is created.';
}

function addRowVariationButtons(){
  document.querySelectorAll('#productRows tr').forEach(row=>{
    if(row.querySelector('.gz-admin-var-btn'))return;
    const id=productIdFromRow(row); if(!id)return;
    const edit=row.querySelector('.productEdit');
    const b=document.createElement('button');
    b.type='button';b.className='gz-btn light gz-admin-var-btn';b.textContent='Variations';
    b.onclick=()=>openVariationManager(id,row.querySelector('td b')?.textContent||'Product');
    (edit?.parentElement||row.lastElementChild||row).appendChild(b);
  });
}

function ensureManager(){
  ensureCss();
  const productsSection=$('#products');
  const addCard=productsSection?.querySelector('.gz-card');
  const form=$('#productForm');
  if(!addCard||!form)return;
  let box=$('#gzAdminVarManager');
  if(!box){
    box=document.createElement('div');
    box.id='gzAdminVarManager';
    box.innerHTML='<div class="gz-av-entry-title">⚙ Product Variations</div><div class="gz-av-entry-sub">Set up Color, Size, Material or any other option. Generate every exact combination, then control each variation separately.</div><div class="gz-av-entry-row"><select id="gzAvProductSelect"><option value="">Select a product…</option></select><button type="button" id="gzAvManage" class="gz-btn primary">Manage Variations</button></div><div class="gz-av-entry-note"></div>';
    form.insertAdjacentElement('afterend',box);
    $('#gzAvManage').onclick=()=>{
      const id=$('#gzAvProductSelect')?.value;
      if(!id)return alert('Select a product first.');
      const name=$('#gzAvProductSelect')?.selectedOptions?.[0]?.textContent||'Product';
      openVariationManager(id,name);
    };
  }
  refreshManager();
}

async function openVariationManager(pid,name){
  ensureCss();
  const modal=ensureModal();
  modal.classList.add('gz-av-modal-open');
  $('#gzAvTitle').textContent=(name||'Product')+' · Variations';
  $('#gzAvBody').innerHTML='<div class="gz-av-muted">Loading variations…</div>';
  try{
    const d=await api('/api/marketplace/admin/variations?product_id='+encodeURIComponent(pid));
    renderVariationEditor(pid,d,name);
  }catch(e){
    $('#gzAvBody').innerHTML='<div class="gz-av-error">'+esc(e.message)+'</div>';
  }
}

function renderVariationEditor(pid,d,name){
  const body=$('#gzAvBody');
  const opts=d.options||[],vs=d.variations||[];
  body.innerHTML='<div class="gz-av-builder"><b>Option setup</b><div style="font-size:12px;color:#777;margin:4px 0 10px">Example: Color → Black, White · Size → S, M, L. Regenerating combinations keeps existing matching variation data.</div><div id="gzAvOpts">'+opts.map(o=>optionRow(o)).join('')+'</div><div class="gz-av-actions"><button type="button" id="gzAvAdd" class="gz-btn light">＋ Add Option</button><button type="button" id="gzAvGenerate" class="gz-btn primary">Generate / Update Variations</button></div></div><div class="gz-av-bulk"><input id="gzAvPrice" type="number" min="0" step="0.01" placeholder="Regular price for all"><input id="gzAvSale" type="number" min="0" step="0.01" placeholder="Sale price for all"><input id="gzAvStock" type="number" min="0" step="1" placeholder="Stock for all"><button id="gzAvBulk" type="button" class="gz-btn light">Apply to all</button></div><div class="gz-av-table-wrap"><table class="gz-av-table"><thead><tr><th>Variation</th><th>SKU</th><th>Regular</th><th>Sale</th><th>Old</th><th>Stock</th><th>Low stock</th><th>Status</th><th>Min Qty</th><th>Max Qty</th><th>Image URL</th><th></th></tr></thead><tbody>'+ (vs.length?vs.map(v=>variationRow(v)).join(''):'<tr><td colspan="12" class="gz-av-muted">No variations yet. Add an option and its values, then click Generate / Update Variations.</td></tr>')+'</tbody></table></div>';
  body.querySelectorAll('.gz-av-remove').forEach(b=>b.onclick=()=>b.parentElement.remove());
  $('#gzAvAdd').onclick=()=>{
    const row=document.createElement('div');row.className='gz-av-opt';row.innerHTML='<input class="gz-av-name" placeholder="Option name"><input class="gz-av-values" placeholder="Values separated by commas"><button type="button" class="gz-btn light gz-av-remove">×</button>';row.querySelector('.gz-av-remove').onclick=()=>row.remove();$('#gzAvOpts').appendChild(row);
  };
  $('#gzAvGenerate').onclick=async()=>{
    const options=[...document.querySelectorAll('#gzAvOpts .gz-av-opt')].map(r=>({name:r.querySelector('.gz-av-name').value,values:r.querySelector('.gz-av-values').value.split(',').map(x=>x.trim()).filter(Boolean)})).filter(x=>x.name&&x.values.length);
    if(!options.length)return alert('Add at least one option with values.');
    try{
      const r=await api('/api/marketplace/admin/variations',{method:'POST',body:JSON.stringify({product_id:pid,options})});
      alert(`${r.count} variations generated.`);await openVariationManager(pid,name);
    }catch(e){alert(e.message)}
  };
  $('#gzAvBulk').onclick=async()=>{
    const regular=$('#gzAvPrice').value,sale=$('#gzAvSale').value,stock=$('#gzAvStock').value;
    const rows=[...body.querySelectorAll('.gz-av-table tbody tr[data-id]')];
    if(!rows.length)return alert('There are no variations to update.');
    try{
      for(const tr of rows){
        const b={product_id:pid};
        if(regular!=='')b.regular_price=Number(regular);
        if(sale!=='')b.sale_price=Number(sale);
        if(stock!=='')b.stock=Number(stock);
        await api('/api/marketplace/admin/variations/'+encodeURIComponent(tr.dataset.id),{method:'PATCH',body:JSON.stringify(b)});
      }
      await openVariationManager(pid,name);
    }catch(e){alert(e.message)}
  };
  body.querySelectorAll('.gz-av-save').forEach(button=>button.onclick=async()=>{
    const tr=button.closest('tr');
    const value=k=>tr.querySelector('[data-k="'+k+'"]')?.value??'';
    const payload={product_id:pid,sku:value('sku'),regular_price:Number(value('regular')||0),sale_price:value('sale')===''?null:Number(value('sale')),old_price:value('old')===''?null:Number(value('old')),stock:Number(value('stock')||0),low_stock_threshold:Number(value('low')||0),status:value('status'),min_qty:Number(value('min')||1),max_qty:value('max')===''?null:Number(value('max')),image_url:value('image')};
    try{await api('/api/marketplace/admin/variations/'+encodeURIComponent(tr.dataset.id),{method:'PATCH',body:JSON.stringify(payload)});button.textContent='Saved ✓';setTimeout(()=>button.textContent='Save',900)}catch(e){alert(e.message)}
  });
}

function optionRow(o){
  return '<div class="gz-av-opt"><input class="gz-av-name" value="'+esc(o?.name||'')+'" placeholder="Option name"><input class="gz-av-values" value="'+esc((o?.values||[]).map(x=>x.value).join(', '))+'" placeholder="Values separated by commas"><button type="button" class="gz-btn light gz-av-remove">×</button></div>';
}

function variationRow(v){
  const labels=Object.entries(v.options||{}).map(([k,x])=>k+': '+x).join(' · ');
  return '<tr data-id="'+esc(v.id)+'"><td class="opt-label">'+esc(labels)+'</td><td><input data-k="sku" value="'+esc(v.sku||'')+'"></td><td><input data-k="regular" type="number" min="0" step="0.01" value="'+Number(v.regular_price||0)+'"></td><td><input data-k="sale" type="number" min="0" step="0.01" value="'+(v.sale_price==null?'':Number(v.sale_price))+'"></td><td><input data-k="old" type="number" min="0" step="0.01" value="'+(v.old_price==null?'':Number(v.old_price))+'"></td><td><input data-k="stock" type="number" min="0" step="1" value="'+Number(v.stock||0)+'"></td><td><input data-k="low" type="number" min="0" step="1" value="'+Number(v.low_stock_threshold||0)+'"></td><td><select data-k="status"><option '+(v.status==='Available'?'selected':'')+'>Available</option><option '+(v.status==='Out of Stock'?'selected':'')+'>Out of Stock</option><option '+(v.status==='Disabled'?'selected':'')+'>Disabled</option></select></td><td><input data-k="min" type="number" min="1" step="1" value="'+Number(v.min_qty||1)+'"></td><td><input data-k="max" type="number" min="1" step="1" value="'+(v.max_qty==null?'':Number(v.max_qty))+'"></td><td><input data-k="image" value="'+esc(v.image_url||'')+'" placeholder="/api/vendor/media/..."></td><td><button type="button" class="gz-btn light gz-av-save">Save</button></td></tr>';
}

function boot(){
  if(!/\/marketplace-vendor-control-v2(?:\.html)?$/i.test(location.pathname))return;
  ensureCss();
  const run=()=>{ensureManager();addRowVariationButtons();refreshManager()};
  run();
  const root=$('#app')||document.body;
  if(window.MutationObserver)new MutationObserver(run).observe(root,{childList:true,subtree:true});
  setInterval(run,1000);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();