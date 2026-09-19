(()=>{'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const money=n=>'৳'+Number(n||0).toLocaleString('en-BD',{maximumFractionDigits:2});
const $=s=>document.querySelector(s);
async function api(path,opt={}){const r=await fetch(path,{credentials:'include',cache:'no-store',...opt,headers:{'Content-Type':'application/json',...(opt.headers||{})}});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||`Request failed (${r.status})`);return d}
function productId(){const u=new URL(location.href);return u.searchParams.get('id')||u.searchParams.get('product_id')||u.searchParams.get('product')||''}
function ensureStyle(){if($('#gzVariationUiStyle'))return;const s=document.createElement('style');s.id='gzVariationUiStyle';s.textContent=`.gz-customer-variations{margin:18px 0;padding:18px;border:1px solid #e4e5e1;border-radius:16px;background:#fff}.gz-cv-title{font-size:17px;font-weight:900;margin-bottom:12px}.gz-cv-row{margin:12px 0}.gz-cv-row>label{display:block;font-size:11px;font-weight:900;color:#555;margin-bottom:7px;text-transform:uppercase;letter-spacing:.06em}.gz-cv-values{display:flex;gap:7px;flex-wrap:wrap}.gz-cv-values button{border:1px solid #d9d9d5;background:#fff;border-radius:10px;padding:10px 15px;font-weight:850;cursor:pointer;transition:.15s}.gz-cv-values button.selected{border-color:#ff6b00;background:#fff7ef;box-shadow:0 0 0 2px #ff6b00 inset}.gz-cv-values button.unavailable{opacity:.32;text-decoration:line-through}.gz-cv-values button:disabled{cursor:not-allowed}.gz-cv-values .gz-cv-color{display:flex;align-items:center;gap:8px;min-width:82px;justify-content:center}.gz-cv-swatch{width:22px;height:22px;border-radius:50%;background:var(--gz-color);border:1px solid var(--gz-border);box-shadow:inset 0 0 0 2px rgba(255,255,255,.55)}.gz-cv-state{margin-top:13px;padding:11px 12px;border-radius:10px;background:#f6f6f3;font-size:12px;color:#444}.gz-cv-state.warn{background:#fff6ed;color:#9a4d00}.gz-cv-qty{display:flex;align-items:center;gap:8px;margin-top:13px}.gz-cv-qty button{width:36px;height:36px;border:1px solid #ddd;border-radius:9px;background:#fff;font-size:18px;cursor:pointer}.gz-cv-qty span{min-width:32px;text-align:center;font-weight:900}.gz-cv-actions-note{font-size:11px;color:#777;margin-top:8px}.gz-v2-panel{margin:16px 0}.gz-v2-builder,.gz-v2-bulk{border:1px solid #e7e7e2;border-radius:14px;padding:13px;margin:12px 0;background:#fafaf8}.gz-opt-row{display:grid;grid-template-columns:1fr 2fr auto;gap:8px;margin:8px 0}.gz-opt-row input,.gz-v2-table input,.gz-v2-table select,.gz-v2-bulk input{border:1px solid #ddd;border-radius:8px;padding:8px}.gz-v2-table-wrap{overflow:auto}.gz-v2-table{width:100%;border-collapse:collapse;min-width:1000px}.gz-v2-table th,.gz-v2-table td{padding:8px;border-bottom:1px solid #eee;font-size:12px;text-align:left}.gz-v2-table input{width:95px}.gz-v2-head{display:flex;justify-content:space-between;gap:10px}.gz-v2-kicker{font-size:10px;font-weight:900;color:#777;letter-spacing:.12em}.gz-v2-muted,.gz-v2-error{padding:12px;color:#777}.gz-v2-error{color:#a11;background:#fff0f0;border-radius:9px}@media(max-width:700px){.gz-opt-row{grid-template-columns:1fr}.gz-cv-values{gap:6px}}`;document.head.appendChild(s)}
async function vendorVariationManager(){
 if(!location.pathname.includes('vendor-dashboard'))return;
 const host=$('#products');
 if(!host||host.dataset.gzV2Manager)return;
 host.dataset.gzV2Manager='1';
 ensureStyle();
 const panel=document.createElement('div');
 panel.id='gzVariationPanel';
 panel.className='gz-v2-panel';
 panel.innerHTML='<div class="gz-v2-head"><div><span class="gz-v2-kicker">VARIATIONS</span><h2>Product Variations</h2><p>Generate option combinations and control SKU, price, image and status.</p></div><button type="button" class="gz-v2-close gz-btn light">Close</button></div><div id="gzV2Selected"><div class="gz-v2-muted">Select Variations on a product to begin.</div></div>';
 host.prepend(panel);
 panel.querySelector('.gz-v2-close').onclick=()=>panel.classList.remove('open');
 const addButtons=()=>{
  host.querySelectorAll('.gz-product-card').forEach(card=>{
   if(card.querySelector('.gz-v2-var-btn'))return;
   const edit=card.querySelector('button[onclick*="editProduct"]');
   if(!edit)return;
   const m=edit.getAttribute('onclick').match(/editProduct\(['"]([^'"]+)['"]\)/);
   const id=m?.[1];
   if(!id)return;
   const b=document.createElement('button');
   b.type='button';b.className='gz-btn light gz-v2-var-btn';b.textContent='Variations';
   b.onclick=()=>openVariations(id);
   edit.parentElement?.appendChild(b);
  });
 };
 const obs=new MutationObserver(addButtons);obs.observe(host,{childList:true,subtree:true});addButtons();
 async function openVariations(pid){
  panel.classList.add('open');
  const box=$('#gzV2Selected');
  box.innerHTML='<div class="gz-v2-muted">Loading variations…</div>';
  try{
   const d=await api('/api/vendor/variations?product_id='+encodeURIComponent(pid));
   const products=(await api('/api/vendor/products')).products||[];
   const product=products.find(x=>x.id===pid);
   renderVendor(pid,d,product);
  }catch(err){box.innerHTML='<div class="gz-v2-error">'+esc(err.message)+'</div>'}
 }
 function renderVendor(pid,d,product){
  const box=$('#gzV2Selected'),opts=d.options||[],vs=d.variations||[];
  const optionHtml=opts.map(o=>'<div class="gz-opt-row"><input class="gz-opt-name" value="'+esc(o.name)+'" placeholder="Option name"><input class="gz-opt-values" value="'+esc((o.values||[]).map(v=>v.value).join(', '))+'" placeholder="Values separated by commas"><button type="button" class="gz-opt-remove gz-btn light">×</button></div>').join('');
  const rows=vs.length?vs.map(v=>vendorRow(v)).join(''):'<tr><td colspan="7" class="gz-v2-muted">No variations yet. Add options and generate them.</td></tr>';
  box.innerHTML='<div class="gz-v2-builder"><b>Option setup</b><div style="font-size:12px;color:#777;margin:4px 0 10px">Example: Color = Black, White · Size = S, M, L</div><div id="gzOptRows">'+optionHtml+'</div><button type="button" id="gzAddOpt" class="gz-btn light">＋ Add option</button> <button type="button" id="gzGenerate" class="gz-btn primary">Generate / Update Variations</button></div><div class="gz-v2-bulk"><input id="gzBulkPrice" type="number" min="0" step="0.01" placeholder="Set regular price"><button id="gzApplyBulk" type="button" class="gz-btn light">Apply price to all</button></div><div class="gz-v2-table-wrap"><table class="gz-v2-table"><thead><tr><th>Options</th><th>SKU</th><th>Regular</th><th>Old</th><th>Status</th><th>Image</th><th></th></tr></thead><tbody id="gzVarRows">'+rows+'</tbody></table></div>';
  box.querySelectorAll('.gz-opt-remove').forEach(x=>x.onclick=()=>x.parentElement.remove());
  $('#gzAddOpt').onclick=()=>{
   const r=document.createElement('div');r.className='gz-opt-row';
   r.innerHTML='<input class="gz-opt-name" placeholder="Option name"><input class="gz-opt-values" placeholder="Values separated by commas"><button type="button" class="gz-opt-remove gz-btn light">×</button>';
   r.querySelector('button').onclick=()=>r.remove();$('#gzOptRows').appendChild(r);
  };
  $('#gzGenerate').onclick=async()=>{
   const options=[...document.querySelectorAll('#gzOptRows .gz-opt-row')].map(r=>({name:r.querySelector('.gz-opt-name').value,values:r.querySelector('.gz-opt-values').value.split(',').map(x=>x.trim()).filter(Boolean)})).filter(x=>x.name&&x.values.length);
   if(!options.length)return alert('Add at least one option with values.');
   try{const out=await api('/api/vendor/variations',{method:'POST',body:JSON.stringify({product_id:pid,options,default_price:Number(product?.price||0)})});alert(out.count+' variations generated.');openVariations(pid)}catch(err){alert(err.message)}
  };
  $('#gzApplyBulk').onclick=async()=>{
   const price=$('#gzBulkPrice').value;
   try{for(const row of document.querySelectorAll('#gzVarRows tr[data-id]'))if(price!=='')await api('/api/vendor/variations/'+row.dataset.id,{method:'PATCH',body:JSON.stringify({product_id:pid,regular_price:Number(price)})});openVariations(pid)}catch(err){alert(err.message)}
  };
  box.querySelectorAll('.gz-v2-save').forEach(btn=>btn.onclick=async()=>{
   const row=btn.closest('tr'),value=k=>row.querySelector('[data-f="'+k+'"]')?.value??'';
   try{await api('/api/vendor/variations/'+row.dataset.id,{method:'PATCH',body:JSON.stringify({product_id:pid,sku:value('sku'),regular_price:Number(value('regular')||0),old_price:value('old')===''?null:Number(value('old')),status:value('status'),image_url:value('image')})});btn.textContent='Saved ✓';setTimeout(()=>btn.textContent='Save',900)}catch(err){alert(err.message)}
  });
 }
 function vendorRow(v){
  const labels=Object.entries(v.options||{}).map(([k,x])=>k+': '+x).join(' · ');
  return '<tr data-id="'+esc(v.id)+'"><td><b>'+esc(labels)+'</b></td><td><input data-f="sku" value="'+esc(v.sku||'')+'"></td><td><input data-f="regular" type="number" min="0" step="0.01" value="'+Number(v.regular_price||0)+'"></td><td><input data-f="old" type="number" min="0" step="0.01" value="'+(v.old_price==null?'':Number(v.old_price))+'"></td><td><select data-f="status"><option '+(v.status==='Available'?'selected':'')+'>Available</option><option '+(v.status==='Out of Stock'?'selected':'')+'>Out of Stock</option><option '+(v.status==='Disabled'?'selected':'')+'>Disabled</option></select></td><td><input data-f="image" value="'+esc(v.image_url||'')+'"></td><td><button type="button" class="gz-btn light gz-v2-save">Save</button></td></tr>';
 }
}
function mountCustomerVariations(){
 window.__gzCustomerVariationUI=0;
 window.__gzCustomerVariationLoading=0;
 setTimeout(customerVariations,0);
}
window.GZMountCustomerVariations=mountCustomerVariations;
function boot(){
 window.addEventListener('grabzone:product-rendered',mountCustomerVariations);
 vendorVariationManager();
 customerVariations();
 let n=0;
 const t=setInterval(()=>{
   if(window.__gzCustomerVariationUI||++n>120)return clearInterval(t);
   customerVariations();
 },250);
 const detail=document.querySelector('#productDetail');
 if(detail&&window.MutationObserver)new MutationObserver(()=>{
   if(window.__gzProductRendered&&!detail.querySelector('.gz-customer-variations')&&!window.__gzCustomerVariationLoading){
     window.__gzCustomerVariationUI=0;
     customerVariations();
   }
 }).observe(detail,{childList:true,subtree:false});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();})();