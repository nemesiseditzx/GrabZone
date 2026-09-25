(()=>{
'use strict';
const MB=1024*1024,MAX=10,MAX_VARIATIONS=200;const VP_SIZES=['XS','S','M','L','XL','XXL','3XL'];
const VP_COLORS=['Black','White','Grey','Brown','Beige','Tan','Cream','Khaki','Off White','Charcoal Black','Light Grey','Camel','Charcoal Grey','Dark Grey','Bronze','Mauve Brown','Mustard Grey','Pale Grey','Peach Beige','Rust Brown','Red','Maroon','Deep Red','Crimson','Rust','Wine','Wine Maroon','Pink','Magenta','Rose','Peach','Light Pink','Mauve Pink','Coral Pink','Dusty Pink','Dusty Rose','Magenta Pink','Raspberry Pink','Purple','Lavender','Mauve','Plum','Deep Purple','Light Purple','Violet','Blue','Sky Blue','Navy Blue','Navy','Light Blue','Denim','Royal Blue','Steel Blue','Dark Navy','Light Blue Denim','Dark Blue Denim','Teal Blue','Cornflower Blue','Dark Teal Blue','Denim Blue','Light Denim Blue','Pale Blue','Slate Blue','Teal','Aqua','Mint Aqua','Teal Green','Aqua Green','Green','Olive','Olive Green','Sage Green','Dark Green','Mint','Mint Green','Sea Green','Light Green','Pale Sage','Lime Green','Pale Mint','Sage','Mint Pista','Yellow','Orange','Mustard','Gold','Mustard Yellow','Pale Yellow','Multi'];

const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const money=n=>'৳'+Number(n||0).toLocaleString('en-BD',{maximumFractionDigits:2});
const state={products:[],editing:null,files:[],mainIndex:0,variationOptions:[],variations:[],variationLoading:false,categories:[]};
async function api(path,opt={}){const method=(opt.method||'GET').toUpperCase();const url=new URL(path,location.origin);
  const body=opt.body?JSON.parse(opt.body):null;
  if(path.startsWith('/api/vendor/categories')){
    const r=await fetch('/api/vendor/admin/categories',{credentials:'include',cache:'no-store'});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||`Request failed (${r.status})`);return d;
  }
  if(path.startsWith('/api/vendor/variations')){
    const pid=url.searchParams.get('product_id')||body?.product_id||'';
    const parts=path.split('/').filter(Boolean);const variationId=parts[parts.length-1]&&parts[parts.length-1]!=='variations'?parts[parts.length-1]:'';
    const target=variationId?('/api/marketplace/admin/variations/'+encodeURIComponent(variationId)+'?product_id='+encodeURIComponent(pid)):('/api/marketplace/admin/variations?product_id='+encodeURIComponent(pid));
    const r=await fetch(target,{method,credentials:'include',cache:'no-store',headers:{'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
    const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||`Request failed (${r.status})`);return d;
  }
  if(path.startsWith('/api/vendor/products')){
    if(method==='GET'){
      const {data,error}=await sb.from('products').select('*').order('created_at',{ascending:false});if(error)throw error;
      const products=[];
      for(const p of (data||[])){
        const {data:imgs}=await sb.from('product_images').select('*').eq('product_id',p.id).order('sort_order');
        let productType='simple';
        try{const {data:vars}=await sb.from('product_variations').select('id').eq('product_id',p.id);if((vars||[]).length)productType='variable'}catch{}
        products.push({...p,product_type:productType,image_urls:(imgs||[]).map(x=>x.image_url).filter(Boolean)});
      }
      return {products};
    }
    const b=body||{};let product;
    if(method==='PATCH'&&b.id){
      const id=b.id;const payload={name:b.name,category:b.category,price:Number(b.price||0),old_price:b.old_price==null?null:Number(b.old_price),tag:b.tag||null,description:b.description||'',published:!!b.published,image_url:b.image_url||'',sku:b.sku||null,category_id:b.category_id||null,updated_at:new Date().toISOString()};
      const {error}=await sb.from('products').update(payload).eq('id',id);if(error)throw error;
      const {data}=await sb.from('products').select('*').eq('id',id).single();if(!data)throw Error('Product not found after save.');product=data;
      if(Array.isArray(b.image_urls)){
        const {error:de}=await sb.from('product_images').delete().eq('product_id',id);if(de)throw de;
        if(b.image_urls.length){const rows=b.image_urls.slice(0,10).map((u,i)=>({id:crypto.randomUUID(),product_id:id,image_url:u,sort_order:i,is_main:i===0,created_at:new Date().toISOString()}));const {error:ie}=await sb.from('product_images').insert(rows);if(ie)throw ie;}
      }
    }else{
      const id=b.id||crypto.randomUUID();const payload={id,name:b.name,category:b.category,price:Number(b.price||0),old_price:b.old_price==null?null:Number(b.old_price),tag:b.tag||null,description:b.description||'',published:!!b.published,image_url:b.image_url||'',sku:b.sku||null,category_id:b.category_id||null,created_at:new Date().toISOString(),updated_at:new Date().toISOString()};
      const {data,error}=await sb.from('products').insert(payload).select().single();if(error)throw error;product=data;
      if(Array.isArray(b.image_urls)&&b.image_urls.length){const rows=b.image_urls.slice(0,10).map((u,i)=>({id:crypto.randomUUID(),product_id:id,image_url:u,sort_order:i,is_main:i===0,created_at:new Date().toISOString()}));const {error:ie}=await sb.from('product_images').insert(rows);if(ie)throw ie;}
    }
    return {id:product.id,product};
  }
  throw Error('Unsupported admin product-editor request.');
}
function message(text,ok=false){const el=$('#vpMsg');if(!el)return;el.textContent=text||'';el.className='vp-message '+(ok?'ok':'err')}
function build(){
 const sec=$('#tab-products');if(!sec||sec.dataset.vpReady)return;sec.dataset.vpReady='1';
 sec.innerHTML=`
  <div class="vp-top"><div><span class="vp-kicker"><i></i> CATALOG</span><h1>Products</h1><p>Create simple products or variable products with Color, Size, Material and any combination you need.</p></div><button class="gz-btn primary" id="vpNewTop" type="button">＋ Add Product</button></div>
  <div class="vp-panel vp-form-panel">
   <div class="vp-title"><h2 id="vpFormTitle">＋ Add new product</h2><button class="gz-btn light" id="vpCancel" type="button" hidden>Cancel edit</button></div>
   <form id="vpForm" class="vp-form">
    <input id="vpId" type="hidden">
    <div class="vp-fields">
     <div class="vp-field"><label>Product name *</label><input id="vpName" required placeholder="Portable Electric Kettle"></div>
     <div class="vp-field"><label>Category *</label><select id="vpCategory" required><option value="">Select a category</option></select></div>
     <div class="vp-field"><label>Product type *</label><select id="vpProductType"><option value="simple">Simple product</option><option value="variable">Variable product</option></select></div>
     <div class="vp-field"><label>SKU</label><input id="vpSku" placeholder="Optional SKU"></div>
     <div class="vp-field"><label>Regular price *</label><input id="vpPrice" type="number" min="0" step="0.01" required placeholder="500"></div>
     <div class="vp-field"><label>Old price</label><input id="vpOldPrice" type="number" min="0" step="0.01" placeholder="700"></div>
     <div class="vp-field vp-full"><label>Tag</label><input id="vpTag" placeholder="New / Hot Deal"></div>
     <div class="vp-field vp-full"><label>Description</label><textarea id="vpDescription" rows="4" placeholder="Tell customers what this product does..."></textarea></div>
     <div class="vp-field vp-full vp-publish"><label><input id="vpPublished" type="checkbox" checked> Publish this product on the GrabZone marketplace</label></div>
    </div>
    <div class="vp-media">
     <div class="vp-preview" id="vpPreview">No images selected</div>
     <label class="vp-file-button">📷 Choose up to 10 product images<input id="vpFiles" type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif,image/avif"></label>
     <div class="vp-file-note" id="vpFileNote">Maximum 10 images · Maximum 1 MB per image.</div>
     <div class="vp-gallery" id="vpGallery"></div>
    </div>
    <section id="vpVariationPanel" class="vp-variation-panel" hidden>
     <div class="vp-var-head"><div><span class="vp-kicker"><i></i> VARIABLE PRODUCT</span><h3>Options & variations</h3><p>Select Size, Color or custom options, then generate every exact combination.</p></div><button type="button" class="gz-btn light" id="vpAddOption">＋ Add option</button></div>
     <div class="vp-easy-setup"><b>Easy setup</b><div class="vp-setup-steps"><span>① Select Size values.</span><span>② Select common Colors or add another option.</span><span>③ Generate variations.</span></div></div><div id="vpPresetOptions"></div><div id="vpOptions"></div>
     <div class="vp-var-actions"><button type="button" class="gz-btn primary" id="vpGenerateVariations">Generate / Update Variations</button><input id="vpBulkPrice" type="number" min="0" step="0.01" placeholder="Apply regular price to all"><button type="button" class="gz-btn light" id="vpApplyBulk">Apply price to all</button></div>
     <div id="vpVariationMsg" class="vp-var-msg"></div>
     <div class="vp-variation-table-wrap"><table class="vp-variation-table"><thead><tr><th>Variation</th><th>SKU</th><th>Regular</th><th>Old</th><th>Status</th><th>Product Image</th><th></th></tr></thead><tbody id="vpVariationRows"></tbody></table></div>
    </section>
    <div class="vp-actions"><button class="gz-btn primary" id="vpSubmit" type="submit">Upload &amp; Save Product</button><button type="button" class="gz-btn light" onclick="resetProductEditor()">Reset</button></div>
   </form>
   <div id="vpMsg" class="vp-message"></div>
  </div>
  <div class="vp-panel"><div class="vp-title"><div><h2>Your products</h2><p>Manage only products belonging to this vendor.</p></div><button class="gz-btn light" id="vpRefresh" type="button">↻ Refresh</button></div><div class="vp-toolbar"><input id="vpSearch" placeholder="Search your products…"><select id="vpFilter"><option value="all">All products</option><option value="published">Published</option><option value="hidden">Hidden</option><option value="low">Low stock</option></select></div><div id="vpProductList" class="vp-product-list"></div></div>`;
 $('#vpNewTop').onclick=()=>newProduct();$('#vpCancel').onclick=resetForm;$('#vpRefresh').onclick=loadProducts;$('#vpSearch').oninput=renderProducts;$('#vpFilter').onchange=renderProducts;$('#vpFiles').onchange=handleFiles;$('#vpProductType').onchange=toggleVariationPanel;$('#vpAddOption').onclick=()=>addOptionRow();$('#vpGenerateVariations').onclick=generateVariations;$('#vpApplyBulk').onclick=applyBulkPrice;$('#vpForm').onsubmit=saveProduct;
 resetForm();loadCategories();loadProducts();
}
function resetForm(){state.editing=null;state.files=[];state.mainIndex=0;state.variationOptions=[];state.variations=[];$('#vpForm').reset();$('#vpId').value='';$('#vpPublished').checked=true;$('#vpProductType').value='simple';$('#vpFormTitle').textContent='＋ Add new product';$('#vpSubmit').textContent='Upload & Save Product';$('#vpCancel').hidden=true;$('#vpFiles').value='';renderMedia();renderOptionRows();renderVariationRows();toggleVariationPanel();message('')}
function resetProductEditor(){resetForm();window.scrollTo({top:document.querySelector('#products')?.getBoundingClientRect().top+window.scrollY-20||0,behavior:'smooth'})}
async function newProduct(){if(!$('#vpForm'))return;resetForm();$('#vpName').focus()}
async function editProduct(id){
 const p=state.products.find(x=>String(x.id)===String(id));if(!p)return;
 if(!state.categories.length)await loadCategories();
 state.editing=p;state.files=[];state.mainIndex=0;
 $('#vpId').value=p.id;$('#vpName').value=p.name||'';$('#vpCategory').value=p.category||'';$('#vpProductType').value=p.product_type==='variable'?'variable':'simple';$('#vpPrice').value=p.price??'';$('#vpOldPrice').value=p.old_price??'';$('#vpSku').value=p.sku||'';$('#vpTag').value=p.tag||'';$('#vpDescription').value=p.description||'';$('#vpPublished').checked=!!p.published;
 $('#vpFormTitle').textContent='✎ Edit product';$('#vpSubmit').textContent='Save Product Changes';$('#vpCancel').hidden=false;renderMedia();toggleVariationPanel();
 if(p.product_type==='variable'){await loadVariations(p.id)}else{state.variationOptions=[];state.variations=[];renderOptionRows();renderVariationRows()}
 window.scrollTo({top:$('#products').getBoundingClientRect().top+window.scrollY-20,behavior:'smooth'});
}
function handleFiles(){const files=[...($('#vpFiles').files||[])];if(files.length>MAX){alert('Maximum 10 images per product.');$('#vpFiles').value='';state.files=[];renderMedia();return}const bad=files.find(f=>f.size>MB||!/^image\/(jpeg|png|webp|gif|avif)$/i.test(f.type));if(bad){alert(`${bad.name} is not a supported image or is larger than 1 MB.`);$('#vpFiles').value='';state.files=[];renderMedia();return}state.files=files;state.mainIndex=0;renderMedia()}
function renderMedia(){const preview=$('#vpPreview'),gallery=$('#vpGallery'),note=$('#vpFileNote');if(!preview||!gallery)return;gallery.innerHTML='';if(state.files.length){note.textContent=state.files.map((f,i)=>`${i===state.mainIndex?'★ ':''}${f.name} (${Math.ceil(f.size/1024)} KB)`).join(' • ');state.files.forEach((file,i)=>{const item=document.createElement('button');item.type='button';item.className='vp-thumb '+(i===state.mainIndex?'main':'');item.title='Click to make main image';const img=document.createElement('img');img.alt='';img.src=URL.createObjectURL(file);item.appendChild(img);item.onclick=()=>{state.mainIndex=i;renderMedia()};gallery.appendChild(item)});preview.innerHTML=`<img alt="" src="${URL.createObjectURL(state.files[state.mainIndex])}"><span class="vp-main-label">MAIN IMAGE</span>`;return}
 const existing=(state.editing?.image_urls||[]).filter(Boolean);if(existing.length){note.textContent='Existing images. Choose new files above to replace the gallery.';existing.forEach((url,i)=>{const item=document.createElement('button');item.type='button';item.className='vp-thumb '+(i===0?'main':'');item.title=i===0?'Current main image':'Current gallery image';const img=document.createElement('img');img.alt='';img.src=url;item.appendChild(img);gallery.appendChild(item)});preview.innerHTML=`<img alt="" src="${esc(existing[0])}"><span class="vp-main-label">MAIN IMAGE</span>`}else{note.textContent='Maximum 10 images · Maximum 1 MB per image.';preview.textContent='No images selected'}}
async function upload(file){if(file.size>MB)throw Error(`${file.name} is larger than 1 MB.`);const {data:{session},error}=await sb.auth.getSession();if(error)throw error;if(!session)throw Error('Admin session expired. Please sign in again.');const fd=new FormData();fd.append('file',file,file.name);const r=await (window.gzAuthFetch||fetch)((window.GRABZONE_CONFIG?.backendUrl||'')+'/api/r2-upload',{method:'POST',headers:{Authorization:'Bearer '+session.access_token},body:fd});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||'Image upload failed');return d.publicUrl;}
function toggleVariationPanel(){const on=$('#vpProductType')?.value==='variable';const panel=$('#vpVariationPanel');if(panel)panel.hidden=!on}
function vpValues(name){return (state.variationOptions.find(x=>x.name.toLowerCase()===name.toLowerCase())||{}).values||[]}
function vpSet(name,values){const clean=[...new Set(values.map(String).map(x=>x.trim()).filter(Boolean))];state.variationOptions=state.variationOptions.filter(x=>x.name.toLowerCase()!==name.toLowerCase());if(clean.length)state.variationOptions.push({name,values:clean});renderOptionRows()}
function vpToggle(name,value,checked){const cur=vpValues(name);vpSet(name,checked?cur.concat(value):cur.filter(x=>x!==value))}
function vpPreset(name,values){
 const active=new Set(vpValues(name));
 const chips=values.map(v=>'<label class="vp-chip"><input type="checkbox" data-vp-opt="'+esc(name)+'" value="'+esc(v)+'" '+(active.has(v)?'checked':'')+'><span>'+esc(v)+'</span></label>').join('');
 return '<div class="vp-preset-card"><div class="vp-preset-head"><b>'+esc(name)+'</b><span>'+values.length+(name==='Color'?' colors':' values')+'</span></div>'+(name==='Color'?'<input class="vp-color-search" placeholder="Search color...">':'')+'<div class="vp-chip-grid">'+chips+'</div>'+(name==='Size'?'<div class="vp-custom-size-entry" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px"><input class="vp-numeric-size-input" inputmode="decimal" placeholder="Type sizes: 24, 27, 30" aria-label="Custom numeric sizes" style="flex:1;min-width:180px;padding:10px 12px;border:1px solid #ddd;border-radius:10px"><button type="button" class="gz-btn light vp-add-numeric-sizes">＋ Add sizes</button></div><small style="display:block;margin-top:7px;color:#777">Keep XS–3XL or add numeric sizes. Separate multiple sizes with commas.</small>':'')+'</div>';
}
function addOptionRow(o={name:'',values:[]}){const n=o.name.trim();if(!n)return;vpSet(n,o.values||[])}
function renderOptionRows(){
 const box=$('#vpPresetOptions');if(!box)return;
 const custom=state.variationOptions.filter(x=>!['size','color'].includes(x.name.toLowerCase()));
 const savedSizes=vpValues('Size');const sizeChoices=[...VP_SIZES,...savedSizes.filter(v=>!VP_SIZES.includes(v))];
 box.innerHTML=vpPreset('Size',sizeChoices)+vpPreset('Color',VP_COLORS)+custom.map(o=>'<div class="vp-preset-card"><div class="vp-preset-head"><b>'+esc(o.name)+'</b></div><div class="vp-chip-grid">'+o.values.map(v=>'<label class="vp-chip"><input type="checkbox" data-vp-opt="'+esc(o.name)+'" value="'+esc(v)+'" checked><span>'+esc(v)+'</span></label>').join('')+'</div></div>').join('');
 box.querySelectorAll('[data-vp-opt]').forEach(i=>i.onchange=()=>vpToggle(i.dataset.vpOpt,i.value,i.checked));
 box.querySelectorAll('.vp-color-search').forEach(input=>input.oninput=()=>{const card=input.closest('.vp-preset-card'),q=input.value.toLowerCase();card.querySelectorAll('.vp-chip').forEach(x=>x.style.display=x.textContent.toLowerCase().includes(q)?'inline-flex':'none')});
 box.querySelectorAll('.vp-add-numeric-sizes').forEach(btn=>{const input=btn.parentElement.querySelector('.vp-numeric-size-input');const add=()=>{const values=input.value.split(',').map(x=>x.trim()).filter(Boolean);if(!values.length)return;vpSet('Size',vpValues('Size').concat(values));};btn.onclick=add;input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();add();}});});
 const oldAdd=box.querySelector('.vp-add-another');if(!oldAdd){const btn=document.createElement('button');btn.type='button';btn.className='gz-btn light vp-add-another';btn.textContent='＋ Add Another Option';btn.onclick=()=>{const wrap=document.createElement('div');wrap.className='vp-custom-inline';wrap.innerHTML='<input placeholder="Option name"><input placeholder="Values separated by commas"><button type="button" class="gz-btn light">Add</button>';box.appendChild(wrap);wrap.querySelector('button').onclick=()=>{const ins=wrap.querySelectorAll('input'),n=ins[0].value.trim(),vs=ins[1].value.split(',').map(x=>x.trim()).filter(Boolean);if(n&&vs.length)vpSet(n,vs)}};box.appendChild(btn)}
}
function collectOptionRows(){}
async function loadVariations(pid){
 const msg=$('#vpVariationMsg');if(msg)msg.textContent='Loading variations…';
 try{const d=await api('/api/vendor/variations?product_id='+encodeURIComponent(pid));state.variationOptions=(d.options||[]).map(o=>({name:o.name,values:(o.values||[]).map(v=>v.value)}));state.variations=d.variations||[];renderOptionRows();renderVariationRows();if(msg)msg.textContent=state.variations.length?`${state.variations.length} variations loaded.`:'No variations yet. Add options and generate combinations.'}
 catch(e){state.variationOptions=[];state.variations=[];renderOptionRows();renderVariationRows();if(msg)msg.textContent='⚠ '+e.message}
}
async function generateVariations(){
 collectOptionRows();if(!state.variationOptions.length)return alert('Add at least one option with values.');
 let count=1;for(const o of state.variationOptions)count*=o.values.length;if(count>MAX_VARIATIONS)return alert(`This will create ${count} variations. Maximum is ${MAX_VARIATIONS}.`);
 const pid=$('#vpId').value.trim();if(!pid){message('Save the product first, then generate variations.',false);return}
 const msg=$('#vpVariationMsg');msg.textContent='Generating combinations…';
 try{const d=await api('/api/vendor/variations?product_id='+encodeURIComponent(pid),{method:'POST',body:JSON.stringify({options:state.variationOptions})});state.variations=d.variations||[];renderVariationRows();msg.textContent=`✓ ${d.count} variations generated.`;$('#vpProductType').value='variable'}catch(e){msg.textContent='⚠ '+e.message}
}
function getVariationProductImages(){
 const urls=(state.editing?.image_urls||[]).filter(Boolean);
 if(urls.length)return urls;
 const p=state.products.find(x=>String(x.id)===String($('#vpId')?.value||''));
 return (p?.image_urls||[]).filter(Boolean);
}
function renderVariationRows(){
 const body=$('#vpVariationRows');if(!body)return;
 if(!state.variations.length){body.innerHTML='<tr><td colspan="7" class="vp-var-empty">No variations generated yet.</td></tr>';return}
 const productImages=getVariationProductImages();
 body.innerHTML=state.variations.map(v=>{
   const labels=Object.entries(v.options||{}).map(([k,x])=>k+': '+x).join(' · ');
   const selected=v.image_url||'';
   const thumbs=productImages.length?productImages.map((url,i)=>'<button type="button" class="vp-var-image-choice '+(selected===url?'selected':'')+'" data-image-url="'+esc(url)+'" title="Use image '+(i+1)+'"><img src="'+esc(url)+'" alt="Product image '+(i+1)+'"><span>'+(i+1)+'</span></button>').join(''):'<span class="vp-no-images">No product images available</span>';
   return '<tr data-variation-id="'+esc(v.id)+'"><td class="vp-var-name"><b>'+esc(labels||'Variation')+'</b></td><td><input data-v="sku" value="'+esc(v.sku||'')+'"></td><td><input data-v="regular" type="number" min="0" step="0.01" value="'+Number(v.regular_price??0)+'"></td><td><input data-v="old" type="number" min="0" step="0.01" value="'+(v.old_price??'')+'"></td><td><select data-v="status"><option '+(v.status==='Available'||!v.status?'selected':'')+'>Available</option><option '+(v.status==='Out of Stock'?'selected':'')+'>Out of Stock</option><option '+(v.status==='Disabled'?'selected':'')+'>Disabled</option></select></td><td><div class="vp-var-image-picker"><div class="vp-var-image-grid">'+thumbs+'</div><small>Select one of the product images for this variation.</small></div></td><td><button type="button" class="gz-btn light vp-save-variation">Save</button></td></tr>';
 }).join('');
 body.querySelectorAll('.vp-var-image-choice').forEach(btn=>btn.onclick=async()=>{
   const row=btn.closest('tr'),id=row?.dataset.variationId,url=btn.dataset.imageUrl,v=state.variations.find(x=>String(x.id)===String(id));
   if(!v)return;
   v.image_url=url;
   row.querySelectorAll('.vp-var-image-choice').forEach(x=>x.classList.remove('selected'));
   btn.classList.add('selected');
   btn.disabled=true;
   try{
     await api('/api/vendor/variations/'+encodeURIComponent(id)+'?product_id='+encodeURIComponent($('#vpId').value),{method:'PATCH',body:JSON.stringify({image_url:url})});
     btn.classList.add('saved');
   }catch(err){
     btn.classList.remove('selected');alert(err.message);
   }finally{btn.disabled=false}
 });
 body.querySelectorAll('.vp-save-variation').forEach(btn=>btn.onclick=saveVariation);
}
async function saveVariation(e){
 const row=e.currentTarget.closest('tr'),id=row?.dataset.variationId;if(!id)return;
 const val=k=>row.querySelector('[data-v="'+k+'"]')?.value??'',btn=e.currentTarget;
 const v=state.variations.find(x=>String(x.id)===String(id));if(!v)return;
 btn.disabled=true;
 try{
   await api('/api/vendor/variations/'+encodeURIComponent(id)+'?product_id='+encodeURIComponent($('#vpId').value),{method:'PATCH',body:JSON.stringify({sku:val('sku'),regular_price:Number(val('regular')||0),old_price:val('old')===''?null:Number(val('old')),status:val('status'),image_url:v.image_url||''})});
   v.sku=val('sku');v.regular_price=Number(val('regular')||0);v.old_price=val('old')===''?null:Number(val('old'));v.status=val('status');
   btn.textContent='Saved ✓';setTimeout(()=>btn.textContent='Save',900);
 }catch(err){alert(err.message)}finally{btn.disabled=false}
}
async function applyBulkPrice(){
 const price=$('#vpBulkPrice').value;if(price==='')return alert('Enter a regular price first.');
 const rows=[...document.querySelectorAll('#vpVariationRows tr[data-variation-id]')];if(!rows.length)return alert('Generate variations first.');
 try{for(const row of rows){await api('/api/vendor/variations/'+encodeURIComponent(row.dataset.variationId)+'?product_id='+encodeURIComponent($('#vpId').value),{method:'PATCH',body:JSON.stringify({regular_price:Number(price)})})}await loadVariations($('#vpId').value);$('#vpBulkPrice').value=''}catch(e){alert(e.message)}
}
async function saveProduct(e){
 e.preventDefault();const btn=$('#vpSubmit');btn.disabled=true;message('Saving product…',true);
 try{
  const id=$('#vpId').value.trim();let urls=null,mainUrl=null;
  if(state.files.length){if(state.files.length>MAX)throw Error('Maximum 10 images per product.');const uploaded=[];for(const f of state.files)uploaded.push(await upload(f));urls=uploaded;mainUrl=uploaded[state.mainIndex]||uploaded[0]}
  else if(state.editing){urls=(state.editing.image_urls||[]).filter(Boolean);mainUrl=urls[0]||state.editing.image_url||''}
  else throw Error('Please choose at least one product image.');
  const body={name:$('#vpName').value.trim(),category:$('#vpCategory').value.trim(),price:Number($('#vpPrice').value),old_price:$('#vpOldPrice').value===''?null:Number($('#vpOldPrice').value),product_type:$('#vpProductType').value,category_id:$('#vpCategory option:checked').dataset.categoryId||'',sku:$('#vpSku').value.trim(),tag:$('#vpTag').value.trim(),description:$('#vpDescription').value,published:$('#vpPublished').checked,image_url:mainUrl,image_urls:urls};
  if(id)body.id=id;
  const d=await api('/api/vendor/products',{method:id?'PATCH':'POST',body:JSON.stringify(body)});
  const productId=id||d.id||d.product?.id;
  if(!productId)throw Error('Product was saved but no product ID was returned.');
  if($('#vpProductType').value==='variable'){
   collectOptionRows();
   if(!state.variationOptions.length)throw Error('Variable product needs at least one option with values.');
   const vr=await api('/api/vendor/variations?product_id='+encodeURIComponent(productId),{method:'POST',body:JSON.stringify({options:state.variationOptions})});
   state.variations=vr.variations||[];
   state.editing={...(d.product||{}),id:productId,image_urls:urls||[]};
   renderVariationRows();
   message(id?'Product updated and variations regenerated.':'Product added. Variations generated successfully.',true);
  }else{
   message(id?'Product updated successfully.':'Product added successfully.',true);
  }
  await loadProducts();if(typeof window.loadDash==='function')window.loadDash();if(!id){state.editing=d.product||{id:productId,image_urls:urls||[]};$('#vpId').value=productId;$('#vpFormTitle').textContent='✎ Edit product';$('#vpSubmit').textContent='Save Product Changes';$('#vpCancel').hidden=false}
 }catch(err){message(err.message||'Could not save product.')}finally{btn.disabled=false}
}
async function loadCategories(){
 try{
   const d=await api('/api/vendor/categories');
   state.categories=Array.isArray(d.categories)?d.categories:[];
   const sel=$('#vpCategory');if(!sel)return;
   const current=sel.value;
   sel.innerHTML='<option value="">Select a category</option>'+state.categories.map(c=>'<option value="'+esc(c.name)+'" data-category-id="'+esc(c.id)+'">'+esc(c.name)+'</option>').join('');
   if(current)sel.value=current;
   if(!state.categories.length)sel.innerHTML='<option value="">No categories available — ask Admin to add one</option>';
 }catch(err){
   const sel=$('#vpCategory');if(sel)sel.innerHTML='<option value="">Could not load categories</option>';
   console.error('Vendor categories:',err);
 }
}
async function loadProducts(){try{const d=await api('/api/vendor/products');state.products=Array.isArray(d.products)?d.products:[];renderProducts()}catch(err){const list=$('#vpProductList');if(list)list.innerHTML=`<div class="vp-error">${esc(err.message)}</div>`}}
function renderProducts(){const q=($('#vpSearch')?.value||'').trim().toLowerCase(),f=$('#vpFilter')?.value||'all';const rows=state.products.filter(p=>{const text=[p.name,p.sku,p.category,p.tag].join(' ').toLowerCase();if(q&&!text.includes(q))return false;if(f==='published'&&!p.published)return false;if(f==='hidden'&&p.published)return false;if(f==='low'&&Number(p.stock||0)>5)return false;return true});const list=$('#vpProductList');if(!list)return;list.innerHTML=rows.map(p=>{const imgs=(p.image_urls||[]).filter(Boolean),src=imgs[0]||p.image_url||'';return `<article class="vp-product-card vp-clickable-product" data-product-id="${esc(p.id)}" title="Click to edit product"><div class="vp-card-image">${src?`<img src="${esc(src)}" alt="">`:'<span>No image</span>'}</div><div class="vp-card-info"><h3>${esc(p.name)}</h3><div class="vp-meta">${esc(p.category||'No category')} · SKU ${esc(p.sku||'—')}</div><div class="vp-meta">${p.product_type==='variable'?'Variable':'Simple'} · Price <b>${money(p.price)}</b> · Stock <b>${Number(p.stock||0)}</b> · ${p.published?'Published':'Hidden'}</div><div class="vp-meta">${imgs.length||p.image_url?'📷 '+(imgs.length||1)+' image'+((imgs.length||1)>1?'s':''):'No image'}${p.tag?' · '+esc(p.tag):''}</div></div><button class="gz-btn light vp-edit" type="button" data-id="${esc(p.id)}">Edit Product</button></article>`}).join('')||'<div class="vp-empty">No products match your search.</div>';list.querySelectorAll('.vp-product-card').forEach(card=>card.onclick=e=>{if(e.target.closest('button,a,input,select,textarea'))return;editProduct(card.dataset.productId)});list.querySelectorAll('.vp-edit').forEach(b=>b.onclick=e=>{e.stopPropagation();editProduct(b.dataset.id)})}
window.gzAdminVendorMirrorNewProduct=newProduct;window.gzAdminVendorMirrorEditProduct=editProduct;window.gzAdminVendorMirrorLoadProducts=loadProducts;window.gzAdminVendorMirrorReset=resetProductEditor;window.gzAdminOpenVendorEditor=()=>{newProduct();document.querySelector('#vpForm')?.scrollIntoView({behavior:'smooth',block:'start'});};window.gzAdminOpenVendorEdit=(id)=>editProduct(id);
const start=()=>{build()};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();