const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
let state={user:null,products:[],orders:[]};
async function api(path,opt={}){const r=await fetch(path,{credentials:'include',cache:'no-store',...opt,headers:{'Content-Type':'application/json',...(opt.headers||{})}});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||'Request failed');return d}
const money=n=>'৳'+Number(n||0).toLocaleString('en-BD',{maximumFractionDigits:2});
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
function show(id){$$('.gz-section').forEach(x=>x.classList.remove('show'));$('#'+id)?.classList.add('show');$$('.gz-nav button').forEach(x=>x.classList.toggle('active',x.dataset.section===id));if(id==='dashboard')loadDash();if(id==='products')loadProducts();if(id==='orders')loadOrders();if(id==='store')loadProfile();if(id==='settings')loadVendorSettings()}
async function loadDash(){try{const d=await api('/api/vendor/dashboard');$('#vendorName').textContent=d.vendor?.brand_name||d.vendor?.business_name||'Vendor';$('#statProducts').textContent=d.metrics?.products??0;$('#statOrders').textContent=d.metrics?.orders??0;$('#statSales').textContent=money(d.metrics?.sales);$('#statEarn').textContent=money(d.metrics?.earnings);$('#statShip').textContent=d.metrics?.open_shipments??0;const link=$('#storeLink');if(link&&d.vendor?.slug){link.href='/brand.html?slug='+encodeURIComponent(d.vendor.slug);link.textContent=location.origin+'/brand.html?slug='+d.vendor.slug}}catch(e){console.error(e)}}
async function loadProducts(){try{const d=await api('/api/vendor/products');state.products=d.products||[];renderProducts()}catch(e){$('#productList').innerHTML='<div style="padding:18px;color:#a11;font-weight:800">'+esc(e.message)+'</div>'}}
function renderProducts(){const q=($('#productSearch')?.value||'').trim().toLowerCase(),f=$('#productFilter')?.value||'all';let rows=state.products.filter(p=>{const text=[p.name,p.sku,p.category,p.tag].join(' ').toLowerCase();if(q&&!text.includes(q))return false;if(f==='published'&&!p.published)return false;if(f==='hidden'&&p.published)return false;if(f==='low'&&Number(p.stock||0)>5)return false;return true});$('#productList').innerHTML=rows.map(p=>`<div class="gz-product-card"><img src="${esc(p.image_url||'')}" alt=""><div><b>${esc(p.name)}</b><div class="gz-product-meta">${esc(p.category||'No category')} · SKU ${esc(p.sku||'—')}<br>Price <b>${money(p.price)}</b> · Stock <b>${Number(p.stock||0)}</b> · ${p.published?'Published':'Hidden'}${p.tag?' · '+esc(p.tag):''}</div></div><button class="gz-btn light" onclick="editProduct('${esc(p.id)}')">Edit Product</button></div>`).join('')||'<div class="gz-empty" style="padding:18px">No products match your search.</div>'}
async function loadOrders(){try{const d=await api('/api/vendor/orders');state.orders=d.orders||[];renderOrders()}catch(e){$('#orderList').innerHTML='<div class="gz-card" style="color:#a11;font-weight:800">'+esc(e.message)+'</div>'}}
function customerCollection(o){
  const subtotal=Number(o?.subtotal??o?.order_subtotal??0);
  const delivery=Number(o?.delivery_charge??o?.shipping_charge??0);
  // Vendor orders must show only this vendor's collectible amount, never the full marketplace order total.
  const vendorTotal=Number(o?.vendor_total);
  if(Number.isFinite(vendorTotal)&&o?.vendor_total!==null&&o?.vendor_total!==undefined&&o?.vendor_total!=='')return vendorTotal;
  return subtotal+delivery;
}
function renderOrders(){
  const q=($('#orderSearch')?.value||'').trim().toLowerCase(),f=$('#orderFilter')?.value||'all';
  let rows=state.orders.filter(o=>{
    const text=[o.order_number,o.customer_name,o.phone,o.email,o.status].join(' ').toLowerCase();
    return(!q||text.includes(q))&&(f==='all'||o.status===f)
  });
  $('#orderList').innerHTML=rows.map(o=>{
    const collect=customerCollection(o),delivery=Number(o.delivery_charge??o.shipping_charge??0);
    return `<div class="gz-order-card">
      <div class="gz-order-head">
        <div>
          <div class="gz-order-kicker">ORDER</div>
          <h3 style="margin:4px 0">${esc(o.order_number)}</h3>
          <div class="gz-customer-line">${esc(o.customer_name||'Customer')} · ${esc(o.phone||'')}</div>
        </div>
        <div class="gz-collect-mini">
          <span>Customer to collect</span>
          <strong>${money(collect)}</strong>
          <span class="gz-status">${esc(o.status||'Processing')}</span>
        </div>
      </div>
      <div class="gz-detail">
        <div class="gz-order-summary-row"><span>Products subtotal</span><b>${money(o.subtotal)}</b></div>
        <div class="gz-order-summary-row"><span>Delivery charge</span><b>+${money(delivery)}</b></div>
        <div class="gz-order-summary-total"><span>Collect from customer</span><strong>${money(collect)}</strong></div>
      </div>
      <div class="gz-detail">
        <div class="gz-order-meta">${(o.items||[]).length} item group(s) · ${(o.shipments||[]).length} shipment(s)</div>
        <div style="margin-top:8px">${(o.items||[]).slice(0,3).map(i=>`<div class="gz-item-row"><span>${esc(i.product_name)} × ${i.quantity}</span><b>${money(i.line_total)}</b></div>`).join('')}</div>
      </div>
      <div class="gz-order-actions"><button class="gz-btn primary" onclick="viewOrder('${esc(o.id)}')">View / Manage Order</button></div>
    </div>`
  }).join('')||'<div class="gz-card"><div class="gz-empty">No orders match your search.</div></div>'
}
function openModal(){ $('#modal').classList.add('show') }function closeModal(){ $('#modal').classList.remove('show');$('#productForm').style.display='block';$('#orderBody').innerHTML='' }
function newProduct(){ $('#modalTitle').textContent='Add Product';$('#productForm').reset();$('#pid').value='';$('#p_published').checked=true;$('#p_image_urls').value='';if($('#productPreview'))$('#productPreview').innerHTML='';$('#orderBody').innerHTML='';openModal() }
function editProduct(id){const p=state.products.find(x=>x.id===id);if(!p)return;$('#modalTitle').textContent='Edit Product';$('#pid').value=p.id;for(const k of ['name','category','price','old_price','tag','description','sku'])$('#p_'+k).value=p[k]??'';$('#p_stock').value=p.stock??0;$('#p_published').checked=!!p.published;$('#p_image_url').value=p.image_url||'';$('#p_image_urls').value=(p.image_urls||[p.image_url||'']).filter(Boolean).join('\\n');if($('#p_image_files'))$('#p_image_files').value='';previewExisting('productPreview',p.image_url);openModal()}
$('#productForm').addEventListener('submit',async e=>{e.preventDefault();const id=$('#pid').value;try{const files=[...($('#p_image_files')?.files||[])];if(files.length>10)throw Error('Maximum 10 images per product.');let urls=[];for(const f of files)urls.push(await uploadVendorImage(f,'product'));const existing=($('#p_image_urls').value||'').split('\\n').map(x=>x.trim()).filter(Boolean);urls=[...new Set([...existing,...urls])].slice(0,10);const b={id,name:$('#p_name').value,category:$('#p_category').value,price:$('#p_price').value,old_price:$('#p_old_price').value,stock:$('#p_stock').value,sku:$('#p_sku').value,image_url:urls[0]||$('#p_image_url').value, image_urls:urls,tag:$('#p_tag').value,description:$('#p_description').value,published:$('#p_published').checked};if(!b.image_url)throw Error('Upload at least one product image.');await api('/api/vendor/products',{method:id?'PATCH':'POST',body:JSON.stringify(b)});closeModal();await loadProducts();await loadDash()}catch(x){alert(x.message)}});
function viewOrder(id){
  const o=state.orders.find(x=>x.id===id);if(!o)return;
  const subtotal=Number(o.subtotal||0),delivery=Number(o.delivery_charge??o.shipping_charge??0),collect=customerCollection(o);
  const difference=collect-(subtotal+delivery);
  const adjustment=difference<0?'<div class="gz-collect-adjustment">Discounts / adjustments <b>'+money(difference)+'</b></div>':(difference>0?'<div class="gz-collect-adjustment">Additional order charges <b>+'+money(difference)+'</b></div>':'');
  $('#modalTitle').textContent=o.order_number+' · Order';
  $('#productForm').style.display='none';
  $('#orderBody').innerHTML=`
    <div class="gz-order">
      <div class="gz-collection-hero">
        <div><span>AMOUNT TO COLLECT FROM CUSTOMER</span><strong>${money(collect)}</strong><small>Products + delivery, after any order-level adjustments</small></div>
        <span class="gz-status">${esc(o.status||'Processing')}</span>
      </div>
      <div class="gz-editor-section">
        <div class="gz-section-title"><h3>Customer details</h3><span class="gz-info-badge">COD</span></div>
        <div class="gz-customer-card">
          <div class="gz-customer-avatar">${esc((o.customer_name||'C').trim().charAt(0).toUpperCase())}</div>
          <div><b>${esc(o.customer_name||'Customer')}</b><div>Phone: ${esc(o.phone||'—')}</div><div>Email: ${esc(o.email||'—')}</div><div>Address: ${esc(o.address||'—')}</div><div>Area: ${esc(o.upazila||'—')}, ${esc(o.district||'—')}, ${esc(o.division||'—')}</div></div>
        </div>
      </div>
      <div class="gz-editor-section">
        <div class="gz-section-title"><h3>Payment collection</h3><span class="gz-status gz-status-money">COD</span></div>
        <div class="gz-money-lines">
          <div><span>Products subtotal</span><b>${money(subtotal)}</b></div>
          <div><span>Delivery charge</span><b>+${money(delivery)}</b></div>
          ${adjustment}
          <div class="grand"><span>Customer must pay</span><strong>${money(collect)}</strong></div>
        </div>
      </div>
      <div class="gz-editor-section">
        <div class="gz-section-title"><h3>Your products in this order</h3><span class="gz-info-badge">${(o.items||[]).length} item group(s)</span></div>
        ${(o.items||[]).map(i=>`<div class="gz-item-row"><span>${esc(i.product_name)} × ${i.quantity}${i.sku?' · SKU '+esc(i.sku):''}</span><b>${money(i.line_total)}</b></div>`).join('')||'<p style="color:#888">No items found.</p>'}
      </div>
      <div class="gz-editor-section">
        <div class="gz-section-title"><h3>Shipments</h3><span class="gz-status">${esc(o.status||'Processing')}</span></div>
        ${(o.shipments||[]).map(s=>`<div class="gz-shipment-row"><div><b>${esc(s.courier||'Courier')}</b> · ${esc(s.tracking_id||'Tracking pending')}<br><span class="gz-status">${esc(s.status||'Processing')}</span>${s.tracking_url?' · <a href="'+esc(s.tracking_url)+'" target="_blank" rel="noopener">Track shipment ↗</a>':''}</div></div>`).join('')||'<p class="gz-muted">No shipment added yet.</p>'}
      </div>
      <div class="gz-order-actions"><button class="gz-btn primary" onclick="addShipment('${esc(o.id)}')">+ Add Shipment</button><button class="gz-btn light" onclick="closeModal()">Close</button></div>
    </div>`;
  openModal()
}
function addShipment(voId){const o=state.orders.find(x=>x.id===voId);if(!o)return;$('#productForm').style.display='none';$('#orderBody').innerHTML=`<form id="shipForm" class="gz-form"><div class="gz-editor-section"><h3>Shipment details</h3><div class="gz-two"><div class="gz-field"><label>Courier</label><input id="s_courier" required placeholder="Steadfast"></div><div class="gz-field"><label>Tracking ID</label><input id="s_tracking" required placeholder="STF123456"></div></div><div class="gz-two"><div class="gz-field"><label>Status</label><select id="s_status"><option>Processing</option><option>Confirmed</option><option>Shipped</option><option>Delivered</option><option>Cancelled</option></select></div><div class="gz-field"><label>Tracking URL</label><input id="s_url" placeholder="https://..."></div></div></div><div class="gz-editor-section"><h3>Products in this shipment</h3><div style="display:grid;gap:8px">${(o.items||[]).map(i=>`<label style="display:flex;align-items:center;gap:8px"><input type="checkbox" class="ship-item" value="${esc(i.order_item_id)}" data-max="${Number(i.quantity||1)}" checked> ${esc(i.product_name)} × ${i.quantity}</label>`).join('')||'<span style="color:#888">No items available.</span>'}</div></div><div class="gz-editor-section"><div class="gz-field"><label>Note</label><textarea id="s_note" rows="3" placeholder="Optional delivery note"></textarea></div></div><div class="gz-order-actions"><button class="gz-btn primary">Save shipment & notify customer</button><button type="button" class="gz-btn light" onclick="viewOrder('${esc(voId)}')">Cancel</button></div></form>`;$('#shipForm').addEventListener('submit',async e=>{e.preventDefault();try{const items=[...document.querySelectorAll('.ship-item:checked')].map(x=>({order_item_id:x.value,quantity:Number(x.dataset.max||1)}));if(!items.length)throw Error('Select at least one product for this shipment.');await api('/api/vendor/shipments',{method:'POST',body:JSON.stringify({vendor_order_id:voId,courier:$('#s_courier').value,tracking_id:$('#s_tracking').value,status:$('#s_status').value,tracking_url:$('#s_url').value,note:$('#s_note').value,items})});closeModal();await loadOrders();await loadDash();alert('Shipment saved and customer notification requested.')}catch(x){alert(x.message)}})}
async function loadProfile(){try{const d=await api('/api/vendor/profile');const v=d.vendor||{};for(const k of ['business_name','brand_name','phone','accent_color','tagline','description','announcement'])if($('#v_'+k))$('#v_'+k).value=v[k]||'';if($('#v_logo_url'))$('#v_logo_url').value=v.logo_url||'';if($('#v_banner_url'))$('#v_banner_url').value=v.banner_url||'';if($('#v_contact_info'))$('#v_contact_info').value=typeof v.contact_info==='string'?v.contact_info:JSON.stringify(v.contact_info||{},null,2);if($('#v_social_links'))$('#v_social_links').value=typeof v.social_links==='string'?v.social_links:JSON.stringify(v.social_links||{},null,2);previewExisting('logoPreview',v.logo_url);previewExisting('bannerPreview',v.banner_url);await loadSections();await loadVendorSettings()}catch(e){console.error(e)}}
async function loadSections(){
  const panel=$('#vendorSectionsPanel');
  if(!panel)return;
  try{
    const d=await api('/api/vendor/sections');
    const sections=d.sections||[];
    panel.innerHTML=`
      <div class="gz-card" style="margin-top:16px">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:12px">
          <div>
            <h2 style="margin:0">Store sections</h2>
            <p style="color:#777;margin:5px 0 0">Build extra content blocks for your storefront.</p>
          </div>
          <span class="gz-pill">${sections.length} sections</span>
        </div>
        ${sections.map(s=>`
          <div class="gz-editor-section">
            <div style="display:flex;justify-content:space-between;gap:10px;align-items:center">
              <div>
                <b>${esc(s.title||s.section_type)}</b>
                <div style="font-size:12px;color:#777">${esc(s.section_type||'section')}</div>
              </div>
              <label style="font-size:12px;font-weight:800">
                <input type="checkbox" ${s.enabled?'checked':''} data-section-toggle="${esc(s.id)}"> Visible
              </label>
            </div>
            <p style="color:#666;line-height:1.6">${esc(s.body||'')}</p>
            <div class="gz-actions">
              <button type="button" class="gz-btn light" data-section-edit="${esc(s.id)}">Edit</button>
              <button type="button" class="gz-btn danger" data-section-delete="${esc(s.id)}">Delete</button>
            </div>
          </div>
        `).join('')||'<div class="gz-empty">No custom sections yet.</div>'}
        <form id="sectionForm" class="gz-form" style="margin-top:14px">
          <div class="gz-two">
            <div class="gz-field"><label>Type</label><select id="sec_type"><option>featured</option><option>announcement</option><option>text</option><option>products</option></select></div>
            <div class="gz-field"><label>Title</label><input id="sec_title" required></div>
          </div>
          <div class="gz-field"><label>Content</label><textarea id="sec_body" rows="3"></textarea></div>
          <button class="gz-btn primary">Add Store Section</button>
        </form>
      </div>`;
    $('#sectionForm').onsubmit=async e=>{
      e.preventDefault();
      try{
        await api('/api/vendor/sections',{method:'POST',body:JSON.stringify({
          section_type:$('#sec_type').value,title:$('#sec_title').value,body:$('#sec_body').value
        })});
        e.target.reset();
        await loadSections();
      }catch(x){alert(x.message)}
    };
    panel.querySelectorAll('[data-section-toggle]').forEach(el=>el.addEventListener('change',()=>toggleSection(el.dataset.sectionToggle,el.checked)));
    panel.querySelectorAll('[data-section-edit]').forEach(el=>el.addEventListener('click',()=>editSection(el.dataset.sectionEdit)));
    panel.querySelectorAll('[data-section-delete]').forEach(el=>el.addEventListener('click',()=>deleteSection(el.dataset.sectionDelete)));
  }catch(e){
    panel.innerHTML='<div class="gz-card" style="margin-top:16px"><h2>Store sections</h2><p style="color:#a11">'+esc(e.message)+'</p></div>';
  }
}
async function toggleSection(id,enabled){try{const d=await api('/api/vendor/sections');const s=(d.sections||[]).find(x=>x.id===id);if(!s)return;await api('/api/vendor/sections',{method:'PATCH',body:JSON.stringify({id,title:s.title,body:s.body,sort_order:s.sort_order,enabled,data_json:s.data_json||{}})});loadSections()}catch(e){alert(e.message)}}
async function editSection(id){const d=await api('/api/vendor/sections');const s=(d.sections||[]).find(x=>x.id===id);if(!s)return;const title=prompt('Section title',s.title||'');if(title===null)return;const body=prompt('Section content',s.body||'');if(body===null)return;try{await api('/api/vendor/sections',{method:'PATCH',body:JSON.stringify({id,title,body,sort_order:s.sort_order,enabled:!!s.enabled,data_json:s.data_json||{}})});loadSections()}catch(e){alert(e.message)}}
async function deleteSection(id){if(!confirm('Delete this store section?'))return;try{await api('/api/vendor/sections',{method:'DELETE',body:JSON.stringify({id})});loadSections()}catch(e){alert(e.message)}}
async function uploadVendorImage(file,scope){if(!file)return'';if(file.size>1024*1024)throw Error(file.name+' is larger than 1 MB. Choose a smaller image.');if(!/^image\/(jpeg|png|webp|gif|avif)$/.test(file.type))throw Error(file.name+' is not a supported image type.');const fd=new FormData();fd.append('file',file,file.name);fd.append('scope',scope);const r=await fetch('/api/vendor/upload',{method:'POST',body:fd,credentials:'include',cache:'no-store'});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||'Image upload failed');return d.url||''}
function previewExisting(id,url){const el=$('#'+id);if(el)el.innerHTML=url?'<img src="'+esc(url)+'" alt="Current image">':''}
function previewFiles(input,id){const el=$('#'+id);if(!el)return;el.innerHTML='';[...input.files].slice(0,10).forEach(f=>{const u=URL.createObjectURL(f);const im=document.createElement('img');im.src=u;im.onload=()=>URL.revokeObjectURL(u);el.appendChild(im)})}
$('#v_logo_file')?.addEventListener('change',e=>previewFiles(e.target,'logoPreview'));$('#v_banner_file')?.addEventListener('change',e=>previewFiles(e.target,'bannerPreview'));$('#p_image_files')?.addEventListener('change',e=>{if(e.target.files.length>10){alert('Maximum 10 images per product.');e.target.value='';return}previewFiles(e.target,'productPreview')});
$('#profileForm')?.addEventListener('submit',async e=>{e.preventDefault();const msg=$('#profileMsg');msg.textContent='Saving…';try{let logo=$('#v_logo_url').value||'',banner=$('#v_banner_url').value||'';if($('#v_logo_file')?.files[0])logo=await uploadVendorImage($('#v_logo_file').files[0],'store-logo');if($('#v_banner_file')?.files[0])banner=await uploadVendorImage($('#v_banner_file').files[0],'store-banner');let contact={},social={};try{contact=JSON.parse($('#v_contact_info').value||'{}')}catch{throw Error('Contact info JSON is invalid.')}try{social=JSON.parse($('#v_social_links').value||'{}')}catch{throw Error('Social links JSON is invalid.')}const b={};for(const k of ['business_name','brand_name','phone','accent_color','tagline','description','announcement'])b[k]=$('#v_'+k).value;b.logo_url=logo;b.banner_url=banner;b.contact_info=contact;b.social_links=social;await api('/api/vendor/profile',{method:'PATCH',body:JSON.stringify(b)});msg.textContent='Saved successfully ✓';await loadDash();await loadProfile()}catch(x){msg.textContent=x.message}});
$('#logout').onclick=async()=>{await api('/api/vendor-auth',{method:'POST',body:JSON.stringify({action:'logout'})});location.href='/vendor-login.html'};
$$('.gz-nav button').forEach(b=>b.onclick=()=>show(b.dataset.section));
(async()=>{try{const d=await api('/api/vendor-auth');if(!d.authenticated)throw Error('not logged');state.user=d.user;$('#vendorEmail').textContent=d.user.email;show('dashboard')}catch(e){location.href='/vendor-login.html'}})();
async function loadVendorSettings(){try{const d=await api('/api/vendor/settings');const s=d.settings||{};if($('#setShowPhone'))$('#setShowPhone').checked=s.show_phone!==false;if($('#setShowAnnouncement'))$('#setShowAnnouncement').checked=s.show_announcement!==false;if($('#setShowContact'))$('#setShowContact').checked=s.show_contact!==false}catch(e){console.error(e)}}
async function saveVendorSettings(){try{await api('/api/vendor/settings',{method:'PATCH',body:JSON.stringify({show_phone:$('#setShowPhone').checked,show_announcement:$('#setShowAnnouncement').checked,show_contact:$('#setShowContact').checked})});$('#settingsMsg').textContent='Preferences saved ✓'}catch(e){$('#settingsMsg').textContent=e.message}}
async function changeVendorPassword(){const msg=$('#passwordMsg');const current=$('#currentPassword').value,newp=$('#newPassword').value,confirm=$('#confirmPassword').value;if(!current||!newp)return msg.textContent='Enter your current and new password.';if(newp.length<8)return msg.textContent='New password must be at least 8 characters.';if(newp!==confirm)return msg.textContent='New passwords do not match.';try{await api('/api/vendor/account/password',{method:'PATCH',body:JSON.stringify({current_password:current,new_password:newp})});msg.textContent='Password updated ✓';$('#currentPassword').value='';$('#newPassword').value='';$('#confirmPassword').value=''}catch(e){msg.textContent=e.message}}
