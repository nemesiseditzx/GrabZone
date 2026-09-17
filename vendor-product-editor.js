(()=>{
  'use strict';
  const MB=1024*1024,MAX=10;
  const $=s=>document.querySelector(s);
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const money=n=>'৳'+Number(n||0).toLocaleString('en-BD',{maximumFractionDigits:2});
  const state={products:[],editing:null,files:[],mainIndex:0};
  async function api(path,opt={}){const r=await fetch(path,{credentials:'include',cache:'no-store',...opt,headers:{'Content-Type':'application/json',...(opt.headers||{})}});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||`Request failed (${r.status})`);return d}
  function message(text,ok=false){const el=$('#vpMsg');if(!el)return;el.textContent=text;el.className='vp-message '+(ok?'ok':'err')}
  function build(){
    const sec=$('#products');if(!sec||sec.dataset.vpReady)return;sec.dataset.vpReady='1';
    sec.innerHTML=`
      <div class="vp-top">
        <div><span class="vp-kicker"><i></i> CATALOG</span><h1>Products</h1><p>Add up to 10 images to each product. Each image must be 1 MB or smaller. Click an image to make it the main image.</p></div>
        <button class="gz-btn primary" id="vpNewTop" type="button">＋ Add Product</button>
      </div>
      <div class="vp-panel vp-form-panel">
        <div class="vp-title"><h2 id="vpFormTitle">＋ Add new product</h2><button class="gz-btn light" id="vpCancel" type="button" hidden>Cancel edit</button></div>
        <form id="vpForm" class="vp-form">
          <input id="vpId" type="hidden">
          <div class="vp-fields">
            <div class="vp-field"><label>Product name *</label><input id="vpName" required placeholder="Portable Electric Kettle"></div>
            <div class="vp-field"><label>Category *</label><input id="vpCategory" required placeholder="Smart Gadgets"></div>
            <div class="vp-field"><label>Price *</label><input id="vpPrice" type="number" min="0" step="0.01" required placeholder="500"></div>
            <div class="vp-field"><label>Old price</label><input id="vpOldPrice" type="number" min="0" step="0.01" placeholder="700"></div>
            <div class="vp-field"><label>SKU</label><input id="vpSku" placeholder="Optional SKU"></div>
            <div class="vp-field"><label>Stock</label><input id="vpStock" type="number" min="0" step="1" value="0"></div>
            <div class="vp-field vp-full"><label>Tag</label><input id="vpTag" placeholder="New / Hot Deal"></div>
            <div class="vp-field vp-full"><label>Description</label><textarea id="vpDescription" rows="4" placeholder="Tell customers what this product does..."></textarea></div>
            <div class="vp-field vp-full vp-publish"><label><input id="vpPublished" type="checkbox" checked> Publish this product on the GrabZone marketplace</label></div>
          </div>
          <div class="vp-media">
            <div class="vp-preview" id="vpPreview">No images selected</div>
            <label class="vp-file-button">📷 Choose up to 10 product images<input id="vpFiles" type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif,image/avif"></label>
            <div class="vp-file-note" id="vpFileNote">Maximum 10 images · Maximum 1 MB per image.</div>
            <div class="vp-gallery" id="vpGallery"></div>
            <button class="gz-btn primary vp-submit" id="vpSubmit" type="submit">Upload &amp; Save Product</button>
          </div>
        </form>
        <div id="vpMsg" class="vp-message"></div>
      </div>
      <div class="vp-panel">
        <div class="vp-title"><div><h2>Your products</h2><p>Manage only products belonging to this vendor.</p></div><button class="gz-btn light" id="vpRefresh" type="button">↻ Refresh</button></div>
        <div class="vp-toolbar"><input id="vpSearch" placeholder="Search your products…"><select id="vpFilter"><option value="all">All products</option><option value="published">Published</option><option value="hidden">Hidden</option><option value="low">Low stock</option></select></div>
        <div id="vpProductList" class="vp-product-list"></div>
      </div>`;
    $('#vpNewTop').onclick=()=>newProduct();$('#vpCancel').onclick=resetForm;$('#vpRefresh').onclick=loadProducts;$('#vpSearch').oninput=renderProducts;$('#vpFilter').onchange=renderProducts;$('#vpFiles').onchange=handleFiles;$('#vpForm').onsubmit=saveProduct;
    resetForm();loadProducts();
  }
  function resetForm(){state.editing=null;state.files=[];state.mainIndex=0;$('#vpForm').reset();$('#vpId').value='';$('#vpPublished').checked=true;$('#vpFormTitle').textContent='＋ Add new product';$('#vpSubmit').textContent='Upload & Save Product';$('#vpCancel').hidden=true;$('#vpFiles').value='';renderMedia() ;message('')}
  function newProduct(){if(!$('#vpForm'))return;resetForm();$('#vpName').focus()}
  function editProduct(id){const p=state.products.find(x=>String(x.id)===String(id));if(!p)return;state.editing=p;state.files=[];state.mainIndex=0;$('#vpId').value=p.id;$('#vpName').value=p.name||'';$('#vpCategory').value=p.category||'';$('#vpPrice').value=p.price??'';$('#vpSalePrice').value=p.sale_price??'';$('#vpOldPrice').value=p.old_price??'';$('#vpSku').value=p.sku||'';$('#vpStock').value=p.stock??0;$('#vpLowStock').value=p.low_stock_threshold??5;$('#vpMinQty').value=p.min_qty??1;$('#vpMaxQty').value=p.max_qty??'';$('#vpProductType').value=p.product_type||'simple';$('#vpTag').value=p.tag||'';$('#vpDescription').value=p.description||'';$('#vpPublished').checked=!!p.published;$('#vpFormTitle').textContent='✎ Edit product';$('#vpSubmit').textContent='Save Product Changes';$('#vpCancel').hidden=false;renderMedia();window.scrollTo({top:$('#products').getBoundingClientRect().top+window.scrollY-20,behavior:'smooth'})}
  function handleFiles(){const files=[...($('#vpFiles').files||[])];if(files.length>MAX){alert('Maximum 10 images per product.');$('#vpFiles').value='';state.files=[];renderMedia();return}const bad=files.find(f=>f.size>MB);if(bad){alert(`${bad.name} is larger than 1 MB. Maximum is 1 MB per image.`);$('#vpFiles').value='';state.files=[];renderMedia();return}state.files=files;state.mainIndex=0;renderMedia()}
  function renderMedia(){const preview=$('#vpPreview'),gallery=$('#vpGallery'),note=$('#vpFileNote');if(!preview||!gallery)return;gallery.innerHTML='';if(state.files.length){note.textContent=state.files.map((f,i)=>`${i===state.mainIndex?'★ ':''}${f.name} (${Math.ceil(f.size/1024)} KB)`).join(' • ');state.files.forEach((file,i)=>{const item=document.createElement('button');item.type='button';item.className='vp-thumb '+(i===state.mainIndex?'main':'');item.title='Click to make main image';const img=document.createElement('img');img.alt='';img.src=URL.createObjectURL(file);item.appendChild(img);item.onclick=()=>{state.mainIndex=i;renderMedia()};gallery.appendChild(item)});const url=URL.createObjectURL(state.files[state.mainIndex]);preview.innerHTML=`<img alt="" src="${url}"><span class="vp-main-label">MAIN IMAGE</span>`;return}
    const existing=(state.editing?.image_urls||[]).filter(Boolean);if(existing.length){note.textContent='Existing images. Choose new files above to replace the gallery.';existing.forEach((url,i)=>{const item=document.createElement('button');item.type='button';item.className='vp-thumb '+(i===0?'main':'');item.title=i===0?'Current main image':'Current gallery image';const img=document.createElement('img');img.alt='';img.src=url;item.appendChild(img);gallery.appendChild(item)});preview.innerHTML=`<img alt="" src="${esc(existing[0])}"><span class="vp-main-label">MAIN IMAGE</span>`}else{note.textContent='Maximum 10 images · Maximum 1 MB per image.';preview.textContent='No images selected'}}
  async function upload(file){if(file.size>MB)throw Error(`${file.name} is larger than 1 MB.`);const fd=new FormData();fd.append('file',file,file.name);fd.append('kind','product-image');const r=await fetch('/api/vendor/upload',{method:'POST',credentials:'include',body:fd});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||'Image upload failed');return d.url}
  async function saveProduct(e){e.preventDefault();const btn=$('#vpSubmit');btn.disabled=true;message('Saving product…',true);try{const id=$('#vpId').value.trim();let urls=null,mainUrl=null;if(state.files.length){if(state.files.length>MAX)throw Error('Maximum 10 images per product.');const uploaded=[];for(const f of state.files)uploaded.push(await upload(f));urls=uploaded;mainUrl=uploaded[state.mainIndex]||uploaded[0]}else if(state.editing){urls=(state.editing.image_urls||[]).filter(Boolean);mainUrl=urls[0]||state.editing.image_url||''}else{throw Error('Please choose at least one product image.')}const body={name:$('#vpName').value.trim(),category:$('#vpCategory').value.trim(),price:Number($('#vpPrice').value),sale_price:$('#vpSalePrice').value===''?null:Number($('#vpSalePrice').value),old_price:$('#vpOldPrice').value===''?null:Number($('#vpOldPrice').value),low_stock_threshold:Number($('#vpLowStock').value||0),min_qty:Number($('#vpMinQty').value||1),max_qty:$('#vpMaxQty').value===''?null:Number($('#vpMaxQty').value),product_type:$('#vpProductType').value,sku:$('#vpSku').value.trim(),stock:Number($('#vpStock').value||0),tag:$('#vpTag').value.trim(),description:$('#vpDescription').value,published:$('#vpPublished').checked,image_url:mainUrl,image_urls:urls};if(id)body.id=id;const d=await api('/api/vendor/products',{method:id?'PATCH':'POST',body:JSON.stringify(body)});message(id?'Product updated successfully.':'Product added successfully.',true);if(d.product){state.editing=d.product}await loadProducts();if(typeof window.loadDash==='function')window.loadDash();if(!id)resetForm()}catch(err){message(err.message||'Could not save product.')}finally{btn.disabled=false}}
  async function loadProducts(){try{const d=await api('/api/vendor/products');state.products=Array.isArray(d.products)?d.products:[];renderProducts()}catch(err){const list=$('#vpProductList');if(list)list.innerHTML=`<div class="vp-error">${esc(err.message)}</div>`}}
  function renderProducts(){const q=($('#vpSearch')?.value||'').trim().toLowerCase(),f=$('#vpFilter')?.value||'all';const rows=state.products.filter(p=>{const text=[p.name,p.sku,p.category,p.tag].join(' ').toLowerCase();if(q&&!text.includes(q))return false;if(f==='published'&&!p.published)return false;if(f==='hidden'&&p.published)return false;if(f==='low'&&Number(p.stock||0)>5)return false;return true});const list=$('#vpProductList');if(!list)return;list.innerHTML=rows.map(p=>{const imgs=(p.image_urls||[]).filter(Boolean);const src=imgs[0]||p.image_url||'';return `<article class="vp-product-card"><div class="vp-card-image">${src?`<img src="${esc(src)}" alt="">`:'<span>No image</span>'}</div><div class="vp-card-info"><h3>${esc(p.name)}</h3><div class="vp-meta">${esc(p.category||'No category')} · SKU ${esc(p.sku||'—')}</div><div class="vp-meta">Price <b>${money(p.price)}</b> · Stock <b>${Number(p.stock||0)}</b> · ${p.published?'Published':'Hidden'}</div><div class="vp-meta">${imgs.length||p.image_url?'📷 '+(imgs.length||1)+' image'+((imgs.length||1)>1?'s':''): 'No image'}${p.tag?' · '+esc(p.tag):''}</div></div><button class="gz-btn light vp-edit" type="button" data-id="${esc(p.id)}">Edit Product</button></article>`}).join('')||'<div class="vp-empty">No products match your search.</div>';list.querySelectorAll('.vp-edit').forEach(b=>b.onclick=()=>editProduct(b.dataset.id))}
  window.newProduct=newProduct;window.editProduct=editProduct;window.loadProducts=loadProducts;window.renderProducts=renderProducts;
  const start=()=>{build();};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
