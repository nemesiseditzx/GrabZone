(()=>{'use strict';
const cfg=window.GRABZONE_CONFIG||{},base=String(cfg.backendUrl||'').replace(/\/$/,'');
const $=id=>document.getElementById(id);
const esc=x=>String(x??'').replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
const val=x=>esc(x??'');
const api=async(path,opt={})=>{
  const r=await window.gzAuthFetch(base+path,{...opt,headers:{'Content-Type':'application/json',...(opt.headers||{})}});
  const d=await r.json().catch(()=>({}));
  if(!r.ok)throw Error(d.error||'Marketplace request failed');
  return d;
};
let activeVendor=null, vendorData=null, categories=[];
const msg=(t,ok=true)=>{
  const e=$('gzMarketplaceMessage');
  if(e){e.textContent=t||'';e.style.color=ok?'#176b2c':'#a00';if(t)setTimeout(()=>{if(e.textContent===t)e.textContent=''},5000)}
};
const injectStyles=()=>{
 if($('gz-marketplace-admin-css'))return;
 const s=document.createElement('style');s.id='gz-marketplace-admin-css';
 s.textContent=`
.gzmp-shell{display:grid;gap:16px}
.gzmp-tabs{display:flex;gap:7px;flex-wrap:wrap;border-bottom:1px solid #e6e6e2;padding-bottom:10px;position:sticky;top:0;background:#fff;z-index:5}
.gzmp-tab{border:1px solid #ddd;background:#fff;border-radius:999px;padding:9px 13px;font-weight:800;font-size:12px;cursor:pointer}
.gzmp-tab.active{background:#111;color:#fff;border-color:#111}
.gzmp-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
.gzmp-stat{border:1px solid #e5e5e1;border-radius:16px;padding:15px;background:#fff}
.gzmp-stat b{display:block;font-size:24px}.gzmp-stat small{color:#777}
.gzmp-toolbar{display:flex;gap:8px;align-items:center;justify-content:space-between;flex-wrap:wrap}
.gzmp-actions{display:flex;gap:7px;flex-wrap:wrap}
.gzmp-btn{border:1px solid #ddd;border-radius:10px;padding:9px 12px;background:#fff;font-weight:800;cursor:pointer}
.gzmp-btn.primary{background:#111;color:#fff;border-color:#111}
.gzmp-btn.danger{color:#a00;border-color:#e2bcbc;background:#fff}
.gzmp-btn.small{padding:7px 9px;font-size:11px}
.gzmp-card{border:1px solid #e4e4df;border-radius:16px;padding:15px;background:#fff}
.gzmp-list{display:grid;gap:10px}
.gzmp-vendor{display:grid;grid-template-columns:1fr auto;gap:12px;align-items:center}
.gzmp-vendor-main{display:flex;gap:12px;align-items:center;min-width:0}
.gzmp-avatar{width:48px;height:48px;border-radius:13px;background:#f1f1ee;object-fit:cover;flex:none}
.gzmp-vendor-name{font-weight:900}.gzmp-muted{color:#777;font-size:12px}
.gzmp-pill{display:inline-flex;padding:4px 8px;border-radius:999px;font-size:10px;font-weight:900;background:#f1f1ee}
.gzmp-pill.on{background:#e8f6eb;color:#176b2c}.gzmp-pill.off{background:#fbeaea;color:#a00}
.gzmp-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:11px}
.gzmp-form .full{grid-column:1/-1}
.gzmp-form label{font-size:11px;font-weight:800;color:#555}
.gzmp-form input,.gzmp-form select,.gzmp-form textarea{display:block;width:100%;box-sizing:border-box;margin-top:5px;padding:10px 11px;border:1px solid #ddd;border-radius:10px;background:#fff;color:#111}
.gzmp-form textarea{min-height:95px;resize:vertical}
.gzmp-section-title{margin:0 0 4px}.gzmp-section-sub{margin:0;color:#777;font-size:12px}
.gzmp-table{width:100%;border-collapse:collapse}.gzmp-table th,.gzmp-table td{padding:10px 8px;border-bottom:1px solid #eee;text-align:left;font-size:12px;vertical-align:middle}.gzmp-table th{font-size:10px;text-transform:uppercase;color:#777}
.gzmp-product{display:flex;gap:10px;align-items:center}.gzmp-product img{width:44px;height:44px;border-radius:9px;object-fit:cover;background:#eee}
.gzmp-modal{position:fixed;inset:0;z-index:100000;display:none;background:rgba(0,0,0,.58);backdrop-filter:blur(5px);padding:18px;box-sizing:border-box}
.gzmp-modal.open{display:flex;align-items:center;justify-content:center}
.gzmp-dialog{width:min(1180px,100%);max-height:94vh;overflow:auto;background:#fff;border-radius:22px;box-shadow:0 30px 100px rgba(0,0,0,.3);padding:20px}
.gzmp-dialog-head{display:flex;justify-content:space-between;gap:15px;align-items:flex-start;margin-bottom:15px;position:sticky;top:-20px;background:#fff;padding:2px 0 12px;z-index:3}
.gzmp-close{border:0;background:#f1f1ee;width:38px;height:38px;border-radius:50%;font-size:20px;cursor:pointer}
.gzmp-subtabs{display:flex;gap:6px;overflow:auto;padding-bottom:10px;border-bottom:1px solid #eee;margin-bottom:14px}
.gzmp-subtab{border:0;background:#f3f3f0;border-radius:9px;padding:9px 12px;font-weight:800;white-space:nowrap;cursor:pointer}
.gzmp-subtab.active{background:#111;color:#fff}
.gzmp-hidden{display:none!important}
.gzmp-row-actions{display:flex;gap:6px;flex-wrap:wrap}
.gzmp-product-editor{display:grid;gap:14px}
.gzmp-variation-row{display:grid;grid-template-columns:1.5fr .8fr .8fr .8fr 1fr auto;gap:6px;align-items:end;border:1px solid #eee;border-radius:10px;padding:9px}
.gzmp-variation-row input{width:100%;box-sizing:border-box;padding:8px;border:1px solid #ddd;border-radius:8px}
.gzmp-empty{padding:24px;text-align:center;color:#777;border:1px dashed #ddd;border-radius:14px}
.gzmp-order{border:1px solid #e5e5e1;border-radius:14px;padding:13px;display:grid;gap:9px}
.gzmp-order-head{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap}
.gzmp-items{display:grid;gap:6px}.gzmp-item{display:flex;justify-content:space-between;gap:10px;padding:7px 0;border-top:1px solid #eee}
.gzmp-shipment{background:#fafaf8;border-radius:11px;padding:10px}
.gzmp-note{font-size:11px;color:#777}
@media(max-width:900px){.gzmp-grid{grid-template-columns:repeat(2,1fr)}.gzmp-form{grid-template-columns:1fr}.gzmp-form .full{grid-column:auto}.gzmp-vendor{grid-template-columns:1fr}.gzmp-table{min-width:720px}.gzmp-table-wrap{overflow:auto}}
@media(max-width:560px){.gzmp-grid{grid-template-columns:1fr 1fr}.gzmp-dialog{padding:14px;border-radius:17px}.gzmp-modal{padding:8px}.gzmp-variation-row{grid-template-columns:1fr 1fr}.gzmp-variation-row input:first-child{grid-column:1/-1}}
`;
 document.head.appendChild(s);
};
const shell=()=>{
 const tab=$('tab-marketplace'); if(!tab)return;
 tab.innerHTML=`
 <div class="page-title"><div><div class="eyebrow">MULTI-VENDOR MARKETPLACE</div><h1>Marketplace Control</h1><p>Manage the marketplace, vendors, products, orders, categories and store pages from one place.</p></div><div class="gzmp-actions"><a class="gzmp-btn" href="marketplace.html" target="_blank" rel="noopener">View Marketplace ↗</a><button class="gzmp-btn" id="gzmpRefresh">↻ Refresh</button></div></div>
 <div id="gzMarketplaceMessage" class="save-message"></div>
 <div class="gzmp-shell">
  <div class="gzmp-tabs">
   <button class="gzmp-tab active" data-mp-tab="overview">Overview</button>
   <button class="gzmp-tab" data-mp-tab="vendors">Vendors / Stores</button>
   <button class="gzmp-tab" data-mp-tab="products">All Products</button>
   <button class="gzmp-tab" data-mp-tab="orders">Orders</button>
   <button class="gzmp-tab" data-mp-tab="categories">Categories</button>
  </div>
  <div id="gzmp-pane-overview"></div><div id="gzmp-pane-vendors" class="gzmp-hidden"></div><div id="gzmp-pane-products" class="gzmp-hidden"></div><div id="gzmp-pane-orders" class="gzmp-hidden"></div><div id="gzmp-pane-categories" class="gzmp-hidden"></div>
 </div>
 <div id="gzmpModal" class="gzmp-modal"><div class="gzmp-dialog"><div id="gzmpModalBody"></div></div></div>`;
 $('gzmpRefresh').onclick=loadAll;
 document.querySelectorAll('[data-mp-tab]').forEach(b=>b.onclick=()=>showMpTab(b.dataset.mpTab));
 $('gzmpModal').addEventListener('click',e=>{if(e.target.id==='gzmpModal')closeModal()});
};
const showMpTab=t=>{
 document.querySelectorAll('[data-mp-tab]').forEach(b=>b.classList.toggle('active',b.dataset.mpTab===t));
 ['overview','vendors','products','orders','categories'].forEach(x=>$('gzmp-pane-'+x)?.classList.toggle('gzmp-hidden',x!==t));
 if(t==='overview')renderOverview(); if(t==='vendors')renderVendors(); if(t==='products')loadAllProducts(); if(t==='orders')loadAllOrders(); if(t==='categories')renderCategories();
};
const openModal=(html)=>{$('gzmpModalBody').innerHTML=html;$('gzmpModal').classList.add('open');document.body.style.overflow='hidden'};
const closeModal=()=>{$('gzmpModal').classList.remove('open');document.body.style.overflow=''};
const closeButton='<button class="gzmp-close" type="button" data-close>×</button>';
const loadSettings=async()=>{const d=await api('/api/vendor/admin/settings');return d.settings||{}};
const loadVendors=async()=>{const d=await api('/api/vendor/admin/vendors');return d.vendors||[]};
const loadCategories=async()=>{const d=await api('/api/vendor/admin/categories');categories=d.categories||[];return categories};
const renderOverview=async()=>{
 const [s,vs,cs]=await Promise.all([loadSettings(),loadVendors(),loadCategories()]);
 $('gzmp-pane-overview').innerHTML=`
 <div class="gzmp-grid">
  <div class="gzmp-stat"><b>${vs.length}</b><small>Total vendors</small></div><div class="gzmp-stat"><b>${vs.filter(v=>v.status==='Active').length}</b><small>Active vendors</small></div><div class="gzmp-stat"><b>${cs.length}</b><small>Categories</small></div><div class="gzmp-stat"><b>${Number(s.enabled)!==0?'ON':'OFF'}</b><small>Marketplace status</small></div>
 </div>
 <div class="gzmp-card"><div class="gzmp-toolbar"><div><h2 class="gzmp-section-title">Marketplace settings</h2><p class="gzmp-section-sub">Global customer-facing controls.</p></div><button class="gzmp-btn primary" id="gzmpSaveSettings">Save changes</button></div>
 <div class="gzmp-form" style="margin-top:13px">
  <label>Marketplace status<select id="gzmpEnabled"><option value="true">Enabled</option><option value="false">Disabled</option></select></label>
  <label>Default shipping fee<input id="gzmpShipping" type="number" min="0" step="1"></label>
  <label>Show brands<select id="gzmpBrands"><option value="true">Show</option><option value="false">Hide</option></select></label>
  <label>Show vendor badges<select id="gzmpBadges"><option value="true">Show</option><option value="false">Hide</option></select></label>
 </div></div>
 <div class="gzmp-card"><div class="gzmp-toolbar"><div><h2 class="gzmp-section-title">Quick actions</h2><p class="gzmp-section-sub">Jump directly to the management area you need.</p></div></div><div class="gzmp-actions" style="margin-top:12px"><button class="gzmp-btn" data-jump="vendors">Manage vendors</button><button class="gzmp-btn" data-jump="products">Manage products</button><button class="gzmp-btn" data-jump="orders">Manage orders</button><button class="gzmp-btn" data-jump="categories">Manage categories</button><button class="gzmp-btn primary" id="gzmpAddVendorQuick">＋ Add vendor</button></div></div>`;
 $('gzmpEnabled').value=String(Number(s.enabled)!==0);$('gzmpShipping').value=Number(s.default_shipping??130);$('gzmpBrands').value=String(Number(s.show_brands)!==0);$('gzmpBadges').value=String(Number(s.show_vendor_badges)!==0);
 $('gzmpSaveSettings').onclick=async()=>{try{await api('/api/vendor/admin/settings',{method:'PATCH',body:JSON.stringify({enabled:$('gzmpEnabled').value==='true',default_shipping:Number($('gzmpShipping').value||0),show_brands:$('gzmpBrands').value==='true',show_vendor_badges:$('gzmpBadges').value==='true'})});msg('✓ Marketplace settings saved.');renderOverview()}catch(e){msg('⚠ '+e.message,false)}};
 document.querySelectorAll('[data-jump]').forEach(b=>b.onclick=()=>showMpTab(b.dataset.jump));
 $('gzmpAddVendorQuick').onclick=()=>openVendorEditor();
};
const renderVendors=async()=>{
 const vs=await loadVendors();
 $('gzmp-pane-vendors').innerHTML=`
 <div class="gzmp-card"><div class="gzmp-toolbar"><div><h2 class="gzmp-section-title">Vendors / Stores</h2><p class="gzmp-section-sub">Open a vendor's full control panel to manage profile, products, orders, store sections and security.</p></div><div class="gzmp-actions"><button class="gzmp-btn primary" id="gzmpAddVendor">＋ Add vendor</button><button class="gzmp-btn" id="gzmpVendorRefresh">↻ Refresh</button></div></div><div id="gzmpVendorList" class="gzmp-list" style="margin-top:13px"></div></div>`;
 const box=$('gzmpVendorList');
 box.innerHTML=vs.map(v=>`<div class="gzmp-card gzmp-vendor"><div class="gzmp-vendor-main"><img class="gzmp-avatar" src="${val(v.logo_url||'')}" onerror="this.style.visibility='hidden'"><div style="min-width:0"><div class="gzmp-vendor-name">${val(v.brand_name||v.business_name)}</div><div class="gzmp-muted">${val(v.email||'No store email')} · ${Number(v.product_count||0)} products · ${Number(v.order_count||0)} orders</div><div class="gzmp-muted" style="margin-top:3px"><b>Vendor ID:</b> <code>${val(v.id)}</code></div><div class="gzmp-muted" style="margin-top:3px"><b>Login:</b> ${val(v.login_email||'Not configured')} · ${val(v.login_status||'No account')}</div><div style="margin-top:6px"><span class="gzmp-pill ${v.status==='Active'?'on':'off'}">${val(v.status)}</span> <span class="gzmp-pill">${Number(v.homepage_visible)!==0?'Homepage visible':'Hidden'}</span> <span class="gzmp-pill">${Number(v.featured)!==0?'Featured':'Standard'}</span></div></div></div><div class="gzmp-actions"><button class="gzmp-btn primary small" data-manage-vendor="${val(v.id)}">Manage vendor →</button>${Number(v.product_count||0)===0&&Number(v.order_count||0)===0?`<button class="gzmp-btn danger small" data-delete-vendor="${val(v.id)}">Delete account</button>`:''}</div></div>`).join('')||'<div class="gzmp-empty">No vendors found.</div>';
 box.querySelectorAll('[data-manage-vendor]').forEach(b=>b.onclick=()=>openVendorPanel(b.dataset.manageVendor));
 box.querySelectorAll('[data-delete-vendor]').forEach(b=>b.onclick=async()=>{const v=vs.find(x=>x.id===b.dataset.deleteVendor);if(!v)return;if(!confirm(`Delete vendor account "${v.brand_name||v.business_name}" permanently? This is only available because it has no products or orders. The vendor login and store profile will be removed.`))return;try{await api('/api/vendor/admin/vendors/'+encodeURIComponent(v.id),{method:'DELETE'});msg('✓ Vendor account deleted.');renderVendors()}catch(e){msg('⚠ '+e.message,false)}});
 $('gzmpAddVendor').onclick=()=>openVendorEditor();$('gzmpVendorRefresh').onclick=renderVendors;
};
const openVendorEditor=(v={})=>{
 openModal(`<div class="gzmp-dialog-head"><div><div class="eyebrow">VENDOR SETUP</div><h2 style="margin:3px 0">Add vendor</h2><p class="gzmp-section-sub">Create the vendor account and store in one step.</p></div>${closeButton}</div>
 <form id="gzmpVendorCreate" class="gzmp-form"><label>Business name<input name="business_name" required value="${val(v.business_name)}"></label><label>Brand / store name<input name="brand_name" required value="${val(v.brand_name)}"></label><label>Store / contact email<input name="email" type="email" required value="${val(v.email)}"></label><label>Vendor login email<input name="login_email" type="email" required value="${val(v.login_email||v.email)}"></label><label>Initial password<input name="password" type="password" minlength="8" required placeholder="At least 8 characters"></label><label>Phone<input name="phone" value="${val(v.phone)}"></label><label>Shipping fee<input name="shipping_fee" type="number" min="0" value="${Number(v.shipping_fee||130)}"></label><label>Commission type<select name="commission_type"><option value="percentage">Percentage</option><option value="fixed">Fixed</option></select></label><label>Commission value<input name="commission_value" type="number" min="0" step="0.01" value="${Number(v.commission_value||10)}"></label><label>Homepage visibility<select name="homepage_visible"><option value="true">Visible</option><option value="false">Hidden</option></select></label><label>Featured store<select name="featured"><option value="false">No</option><option value="true">Yes</option></select></label><label class="full">Logo URL<input name="logo_url" value="${val(v.logo_url)}"></label><label class="full">Banner URL<input name="banner_url" value="${val(v.banner_url)}"></label><label class="full">Tagline<input name="tagline" value="${val(v.tagline)}"></label><label class="full">Description<textarea name="description">${val(v.description)}</textarea></label><div class="full gzmp-actions"><button type="button" class="gzmp-btn" data-close>Cancel</button><button class="gzmp-btn primary" type="submit">Create vendor</button></div><div id="gzmpVendorCreateMsg" class="full gzmp-muted"></div></form>`);
 $('gzmpModalBody').querySelectorAll('[data-close]').forEach(b=>b.onclick=closeModal);
 $('gzmpVendorCreate').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.currentTarget),b=Object.fromEntries(f.entries());b.shipping_fee=Number(b.shipping_fee||0);b.commission_value=Number(b.commission_value||0);b.homepage_visible=b.homepage_visible==='true';b.featured=b.featured==='true';try{const d=await api('/api/vendor/admin/vendors',{method:'POST',body:JSON.stringify(b)});msg('✓ Vendor created.');closeModal();renderVendors();openVendorPanel(d.vendor.id)}catch(err){$('gzmpVendorCreateMsg').textContent='⚠ '+err.message;$('gzmpVendorCreateMsg').style.color='#a00'}};
};
const openVendorPanel=async id=>{
 activeVendor=id;openModal('<div class="gzmp-empty">Loading vendor control panel…</div>');
 try{
  const d=await api('/api/vendor/admin/vendor-data?vendor_id='+encodeURIComponent(id));vendorData=d;
  const v=d.vendor;
  openModal(`<div class="gzmp-dialog-head"><div><div class="eyebrow">VENDOR CONTROL CENTER</div><h2 style="margin:3px 0">${val(v.brand_name||v.business_name)}</h2><p class="gzmp-section-sub">${val(v.email)} · ${Number(d.products?.length||0)} products · ${Number(d.orders?.length||0)} orders</p></div>${closeButton}</div>
  <div class="gzmp-subtabs"><button class="gzmp-subtab active" data-vsub="profile">Store & settings</button><button class="gzmp-subtab" data-vsub="products">Products</button><button class="gzmp-subtab" data-vsub="orders">Orders</button><button class="gzmp-subtab" data-vsub="sections">Store sections</button><button class="gzmp-subtab" data-vsub="security">Security</button></div>
  <div id="gzmp-vpane-profile"></div><div id="gzmp-vpane-products" class="gzmp-hidden"></div><div id="gzmp-vpane-orders" class="gzmp-hidden"></div><div id="gzmp-vpane-sections" class="gzmp-hidden"></div><div id="gzmp-vpane-security" class="gzmp-hidden"></div>`);
  $('gzmpModalBody').querySelectorAll('[data-close]').forEach(b=>b.onclick=closeModal);
  document.querySelectorAll('[data-vsub]').forEach(b=>b.onclick=()=>showVendorSub(b.dataset.vsub));
  renderVendorProfile(v);renderVendorProducts(d.products||[]);renderVendorOrders(d.orders||[]);await renderVendorSections();ensureSecurity();
  showVendorSub('profile');
 }catch(e){openModal(`<div class="gzmp-dialog-head"><h2>Error</h2>${closeButton}</div><div class="gzmp-empty">${val(e.message)}</div>`);$('gzmpModalBody').querySelector('[data-close]').onclick=closeModal}
};
const showVendorSub=t=>{document.querySelectorAll('[data-vsub]').forEach(b=>b.classList.toggle('active',b.dataset.vsub===t));['profile','products','orders','sections','security'].forEach(x=>$('gzmp-vpane-'+x)?.classList.toggle('gzmp-hidden',x!==t));};
const renderVendorProfile=v=>{
 $('gzmp-vpane-profile').innerHTML=`<form id="gzmpVendorProfileForm" class="gzmp-form"><label>Business name<input name="business_name" value="${val(v.business_name)}"></label><label>Brand / store name<input name="brand_name" value="${val(v.brand_name)}"></label><label>Store / contact email<input name="email" type="email" value="${val(v.email)}"></label><label>Vendor login email<input value="${val(v.login_email||'Not configured')}" disabled></label><label>Phone<input name="phone" value="${val(v.phone)}"></label><label>Shipping fee<input name="shipping_fee" type="number" min="0" value="${Number(v.shipping_fee||0)}"></label><label>Commission type<select name="commission_type"><option value="percentage" ${v.commission_type==='percentage'?'selected':''}>Percentage</option><option value="fixed" ${v.commission_type==='fixed'?'selected':''}>Fixed</option></select></label><label>Commission value<input name="commission_value" type="number" min="0" step="0.01" value="${Number(v.commission_value||0)}"></label><label>Status<select name="status"><option ${v.status==='Active'?'selected':''}>Active</option><option ${v.status==='Inactive'?'selected':''}>Inactive</option><option ${v.status==='Suspended'?'selected':''}>Suspended</option></select></label><label>Homepage visibility<select name="homepage_visible"><option value="true" ${Number(v.homepage_visible)!==0?'selected':''}>Visible</option><option value="false" ${Number(v.homepage_visible)===0?'selected':''}>Hidden</option></select></label><label>Featured<select name="featured"><option value="true" ${Number(v.featured)!==0?'selected':''}>Featured</option><option value="false" ${Number(v.featured)===0?'selected':''}>Standard</option></select></label><label class="full">Logo URL<input name="logo_url" value="${val(v.logo_url)}"></label><label class="full">Banner URL<input name="banner_url" value="${val(v.banner_url)}"></label><label class="full">Tagline<input name="tagline" value="${val(v.tagline)}"></label><label class="full">Announcement<input name="announcement" value="${val(v.announcement)}"></label><label class="full">Description<textarea name="description">${val(v.description)}</textarea></label><label>Accent color<input name="accent_color" type="color" value="${/^#[0-9a-f]{6}$/i.test(v.accent_color||'')?v.accent_color:'#ff6b00'}"></label><label class="full">Social links JSON<textarea name="social_links">${val(typeof v.social_links==='string'?v.social_links:JSON.stringify(v.social_links||{},null,2))}</textarea></label><label class="full">Contact info JSON<textarea name="contact_info">${val(typeof v.contact_info==='string'?v.contact_info:JSON.stringify(v.contact_info||{},null,2))}</textarea></label><div class="full gzmp-actions"><button class="gzmp-btn primary" type="submit">Save store settings</button><a class="gzmp-btn" href="marketplace-store.html?slug=${encodeURIComponent(v.slug)}" target="_blank">Open store ↗</a></div><div id="gzmpProfileMsg" class="full gzmp-muted"></div></form>`;
 $('gzmpVendorProfileForm').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.currentTarget),b=Object.fromEntries(f.entries());b.shipping_fee=Number(b.shipping_fee||0);b.commission_value=Number(b.commission_value||0);b.homepage_visible=b.homepage_visible==='true';b.featured=b.featured==='true';for(const k of ['social_links','contact_info']){try{b[k]=JSON.parse(b[k]||'{}')}catch{$('gzmpProfileMsg').textContent='⚠ '+k+' must be valid JSON.';return}}try{await api('/api/vendor/admin/vendors/'+encodeURIComponent(activeVendor),{method:'PATCH',body:JSON.stringify(b)});msg('✓ Vendor settings saved.');$('gzmpProfileMsg').textContent='Saved successfully.';$('gzmpProfileMsg').style.color='#176b2c'}catch(err){$('gzmpProfileMsg').textContent='⚠ '+err.message;$('gzmpProfileMsg').style.color='#a00'}};
};
const productForm=(p={},isNew=false)=>{
 const variations=Array.isArray(p.variations)?p.variations:[];
 return `<form id="gzmpProductForm" class="gzmp-product-editor"><div class="gzmp-form"><label>Product name<input name="name" required value="${val(p.name)}"></label><label>SKU<input name="sku" value="${val(p.sku)}"></label><label>Product type<select name="product_type"><option value="simple" ${p.product_type!=='variable'?'selected':''}>Simple</option><option value="variable" ${p.product_type==='variable'?'selected':''}>Variable</option></select></label><label>Category<select name="category_id"><option value="">General</option>${categories.map(c=>`<option value="${val(c.id)}" ${p.category_id===c.id?'selected':''}>${val(c.name)}</option>`).join('')}</select></label><label>Regular price<input name="price" type="number" min="0" step="0.01" required value="${Number(p.price||0)}"></label><label>Sale price<input name="sale_price" type="number" min="0" step="0.01" value="${p.sale_price??''}"></label><label>Old price<input name="old_price" type="number" min="0" step="0.01" value="${p.old_price??''}"></label><label>Stock<input name="stock" type="number" min="0" step="1" value="${Number(p.stock||0)}"></label><label>Low stock alert<input name="low_stock_threshold" type="number" min="0" value="${Number(p.low_stock_threshold??5)}"></label><label>Minimum quantity<input name="min_qty" type="number" min="1" value="${Number(p.min_qty??1)}"></label><label>Maximum quantity<input name="max_qty" type="number" min="1" value="${p.max_qty??''}"></label><label>Published<select name="published"><option value="true" ${Number(p.published)!==0?'selected':''}>Published</option><option value="false" ${Number(p.published)===0?'selected':''}>Draft</option></select></label><label class="full">Main image URL<input name="image_url" value="${val(p.image_url)}"></label><label class="full">Gallery image URLs (one per line)<textarea name="image_urls">${val((p.image_urls||[]).join('\n'))}</textarea></label><label class="full">Short tag<input name="tag" value="${val(p.tag)}"></label><label class="full">Description<textarea name="description" style="min-height:150px">${val(p.description)}</textarea></label></div><div class="gzmp-card"><div class="gzmp-toolbar"><div><h3 class="gzmp-section-title">Variations</h3><p class="gzmp-section-sub">Use options like <b>Color: Red, Size: M</b>. Each row is one purchasable combination.</p></div><button type="button" class="gzmp-btn small" id="gzmpAddVariation">＋ Add variation</button></div><div id="gzmpVariationList" style="display:grid;gap:7px;margin-top:10px"></div></div><div class="gzmp-actions"><button type="button" class="gzmp-btn" data-close>Cancel</button><button type="submit" class="gzmp-btn primary">${isNew?'Create product':'Save product'}</button></div><div id="gzmpProductMsg" class="gzmp-muted"></div></form>`;
};
const variationRows=(rows)=>{
 const box=$('gzmpVariationList'); if(!box)return;
 box.innerHTML=(rows.length?rows:[{}]).map((x,i)=>`<div class="gzmp-variation-row" data-variation-row><input data-vopt placeholder="Color: Red, Size: M" value="${val(typeof x.options==='object'?Object.entries(x.options||{}).map(([k,v])=>k+': '+v).join(', '):(x.options||''))}"><input data-vsku placeholder="SKU" value="${val(x.sku||'')}"><input data-vprice type="number" min="0" step="0.01" placeholder="Price" value="${x.price??''}"><input data-vsale type="number" min="0" step="0.01" placeholder="Sale" value="${x.sale_price??''}"><input data-vstock type="number" min="0" placeholder="Stock" value="${Number(x.stock||0)}"><button type="button" class="gzmp-btn danger small" data-remove-variation>Remove</button></div>`).join('');
 box.querySelectorAll('[data-remove-variation]').forEach(b=>b.onclick=()=>{b.closest('[data-variation-row]').remove()});
};
const parseOptions=s=>{const o={};String(s||'').split(',').map(x=>x.trim()).filter(Boolean).forEach(pair=>{const i=pair.indexOf(':');if(i>0)o[pair.slice(0,i).trim()]=pair.slice(i+1).trim()});return o};
const collectVariations=()=>Array.from(document.querySelectorAll('[data-variation-row]')).map(r=>({options:parseOptions(r.querySelector('[data-vopt]')?.value),sku:r.querySelector('[data-vsku]')?.value||'',price:r.querySelector('[data-vprice]')?.value===''?null:Number(r.querySelector('[data-vprice]')?.value),sale_price:r.querySelector('[data-vsale]')?.value===''?null:Number(r.querySelector('[data-vsale]')?.value),stock:Number(r.querySelector('[data-vstock]')?.value||0)})).filter(x=>Object.keys(x.options).length||x.sku||x.price!==null||x.stock);
const openProductEditor=(p={},isNew=true)=>{
 openModal(`<div class="gzmp-dialog-head"><div><div class="eyebrow">${isNew?'PRODUCT CREATOR':'PRODUCT EDITOR'}</div><h2 style="margin:3px 0">${isNew?'Add marketplace product':val(p.name)}</h2><p class="gzmp-section-sub">Manage pricing, stock, gallery, publishing and variations.</p></div>${closeButton}</div>${productForm(p,isNew)}`);
 $('gzmpModalBody').querySelectorAll('[data-close]').forEach(b=>b.onclick=closeModal);variationRows(p.variations||[]);
 $('gzmpAddVariation').onclick=()=>{const rows=Array.from(document.querySelectorAll('[data-variation-row]')).map(()=>({}));rows.push({});variationRows(rows)};
 $('gzmpProductForm').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.currentTarget),b=Object.fromEntries(f.entries());b.vendor_id=activeVendor;b.price=Number(b.price||0);b.sale_price=b.sale_price===''?null:Number(b.sale_price);b.old_price=b.old_price===''?null:Number(b.old_price);b.stock=Number(b.stock||0);b.low_stock_threshold=Number(b.low_stock_threshold||0);b.min_qty=Number(b.min_qty||1);b.max_qty=b.max_qty===''?null:Number(b.max_qty);b.published=b.published==='true';b.category_id=b.category_id||null;b.image_urls=String(b.image_urls||'').split(/\\r?\\n/).map(x=>x.trim()).filter(Boolean).slice(0,10);b.variations=collectVariations();try{const endpoint='/api/vendor/admin/products'+(isNew?'':'');const method=isNew?'POST':'PATCH';if(!isNew)b.id=p.id;await api(endpoint,{method,body:JSON.stringify(b)});msg(isNew?'✓ Product created.':'✓ Product saved.');closeModal();await openVendorPanel(activeVendor)}catch(err){$('gzmpProductMsg').textContent='⚠ '+err.message;$('gzmpProductMsg').style.color='#a00'}};
};
const renderVendorProducts=products=>{
 const pane=$('gzmp-vpane-products');if(!pane)return;
 pane.innerHTML=`<div class="gzmp-toolbar"><div><h3 class="gzmp-section-title">Vendor products</h3><p class="gzmp-section-sub">${products.length} products. Edit, publish, delete or add products.</p></div><button class="gzmp-btn primary" id="gzmpAddProduct">＋ Add product</button></div><div class="gzmp-table-wrap" style="margin-top:12px"><table class="gzmp-table"><thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th>Actions</th></tr></thead><tbody>${products.map(p=>`<tr><td><div class="gzmp-product"><img src="${val(p.image_url)}" onerror="this.style.visibility='hidden'"><div><b>${val(p.name)}</b><div class="gzmp-muted">${val(p.sku||'No SKU')}</div></div></div></td><td>${val(p.category_name||p.category||'General')}</td><td>৳${Number(p.price||0).toLocaleString()}</td><td>${Number(p.stock||0)}</td><td><span class="gzmp-pill ${Number(p.published)!==0?'on':'off'}">${Number(p.published)!==0?'Published':'Draft'}</span></td><td><div class="gzmp-row-actions"><button class="gzmp-btn small" data-edit-product="${val(p.id)}">Edit</button><button class="gzmp-btn danger small" data-delete-product="${val(p.id)}">Delete</button></div></td></tr>`).join('')}</tbody></table></div>`;
 $('gzmpAddProduct').onclick=()=>openProductEditor({},true);
 pane.querySelectorAll('[data-edit-product]').forEach(b=>b.onclick=async()=>{try{const d=await api('/api/vendor/admin/products?vendor_id='+encodeURIComponent(activeVendor));const p=(d.products||[]).find(x=>x.id===b.dataset.editProduct);openProductEditor(p||{},false)}catch(e){msg('⚠ '+e.message,false)}});
 pane.querySelectorAll('[data-delete-product]').forEach(b=>b.onclick=async()=>{if(!confirm('Delete this product? This cannot be undone.'))return;try{await api('/api/vendor/admin/products?'+new URLSearchParams({vendor_id:activeVendor}),{method:'DELETE',body:JSON.stringify({id:b.dataset.deleteProduct,vendor_id:activeVendor})});msg('✓ Product deleted.');await openVendorPanel(activeVendor)}catch(e){msg('⚠ '+e.message,false)}});
};
const renderVendorOrders=orders=>{
 const pane=$('gzmp-vpane-orders');if(!pane)return;
 pane.innerHTML=`<div class="gzmp-toolbar"><div><h3 class="gzmp-section-title">Vendor orders</h3><p class="gzmp-section-sub">Update status and manage shipments.</p></div><button class="gzmp-btn" id="gzmpRefreshVendorOrders">↻ Refresh</button></div><div class="gzmp-list" style="margin-top:12px">${orders.map(o=>`<div class="gzmp-order"><div class="gzmp-order-head"><div><b>${val(o.order_number)}</b><div class="gzmp-muted">${val(o.customer_name)} · ${val(o.phone)} · ${val(o.public_tracking_id)}</div></div><div><select data-order-status="${val(o.id)}" style="padding:8px;border:1px solid #ddd;border-radius:9px"><option ${o.status==='New'?'selected':''}>New</option><option ${o.status==='Contacting'?'selected':''}>Contacting</option><option ${o.status==='Confirmed'?'selected':''}>Confirmed</option><option ${o.status==='Processing'?'selected':''}>Processing</option><option ${o.status==='Shipped'?'selected':''}>Shipped</option><option ${o.status==='Delivered'?'selected':''}>Delivered</option><option ${o.status==='Cancelled'?'selected':''}>Cancelled</option></select></div></div><div class="gzmp-items">${(o.items||[]).map(i=>`<div class="gzmp-item"><span>${val(i.product_details?.name||i.product_name)} × ${Number(i.quantity||1)}</span><b>৳${Number(i.line_total||i.total||0).toLocaleString()}</b></div>`).join('')}</div><div class="gzmp-muted">Subtotal: ৳${Number(o.subtotal||o.order_subtotal||0).toLocaleString()} · Shipping: ৳${Number(o.shipping_charge||0).toLocaleString()} · Total: ৳${Number(o.total||0).toLocaleString()}</div><div class="gzmp-actions"><button class="gzmp-btn small" data-add-shipment="${val(o.id)}">＋ Add / update shipment</button></div><div id="gzmpShipment-${val(o.id)}"></div>${(o.shipments||[]).map(s=>`<div class="gzmp-shipment"><b>${val(s.courier)}</b> · ${val(s.tracking_id)} · ${val(s.status)}${s.tracking_url?' · <a href="'+val(s.tracking_url)+'" target="_blank">Tracking ↗</a>':''}<div class="gzmp-note">${val(s.note)}</div></div>`).join('')}</div>`).join('')||'<div class="gzmp-empty">No orders for this vendor.</div>'}</div>`;
 pane.querySelectorAll('[data-order-status]').forEach(s=>s.onchange=async()=>{try{await api('/api/vendor/admin/order-status',{method:'PATCH',body:JSON.stringify({vendor_order_id:s.dataset.orderStatus,status:s.value})});msg('✓ Order status updated.')}catch(e){msg('⚠ '+e.message,false)}});
 pane.querySelectorAll('[data-add-shipment]').forEach(b=>b.onclick=()=>renderShipmentForm(b.dataset.addShipment));
 $('gzmpRefreshVendorOrders').onclick=async()=>{const d=await api('/api/vendor/admin/vendor-data?vendor_id='+encodeURIComponent(activeVendor));vendorData=d;renderVendorOrders(d.orders||[])};
};
const renderShipmentForm=oid=>{
 const box=$('gzmpShipment-'+CSS.escape(oid));if(!box)return;
 box.innerHTML=`<div class="gzmp-shipment" style="margin-top:8px"><div class="gzmp-form"><label>Courier<input data-sh-courier placeholder="Pathao, RedX, Steadfast"></label><label>Tracking ID<input data-sh-id></label><label>Tracking URL<input data-sh-url></label><label>Status<select data-sh-status><option>Processing</option><option>Shipped</option><option>Delivered</option><option>Cancelled</option></select></label><label class="full">Note<textarea data-sh-note></textarea></label></div><div class="gzmp-actions" style="margin-top:8px"><button class="gzmp-btn primary" data-save-shipment>Save shipment</button></div></div>`;
 box.querySelector('[data-save-shipment]').onclick=async()=>{const b={vendor_order_id:oid,courier:box.querySelector('[data-sh-courier]').value,tracking_id:box.querySelector('[data-sh-id]').value,tracking_url:box.querySelector('[data-sh-url]').value,status:box.querySelector('[data-sh-status]').value,note:box.querySelector('[data-sh-note]').value};try{await api('/api/vendor/admin/shipment',{method:'POST',body:JSON.stringify(b)});msg('✓ Shipment saved.');const d=await api('/api/vendor/admin/vendor-data?vendor_id='+encodeURIComponent(activeVendor));vendorData=d;renderVendorOrders(d.orders||[])}catch(e){msg('⚠ '+e.message,false)}};
};
const renderVendorSections=async()=>{
 const d=await api('/api/vendor/admin/store-sections?vendor_id='+encodeURIComponent(activeVendor));const rows=d.sections||[];const pane=$('gzmp-vpane-sections');
 pane.innerHTML=`<div class="gzmp-toolbar"><div><h3 class="gzmp-section-title">Store sections</h3><p class="gzmp-section-sub">Control the vendor's custom storefront sections and their order.</p></div><button class="gzmp-btn primary" id="gzmpAddSection">＋ Add section</button></div><div class="gzmp-list" style="margin-top:12px">${rows.map(s=>`<div class="gzmp-card"><div class="gzmp-toolbar"><div><b>${val(s.title||s.section_type)}</b><div class="gzmp-muted">${val(s.section_type)} · position ${Number(s.sort_order||0)} · ${Number(s.enabled)!==0?'Enabled':'Disabled'}</div></div><div class="gzmp-row-actions"><button class="gzmp-btn small" data-edit-section="${val(s.id)}">Edit</button><button class="gzmp-btn danger small" data-delete-section="${val(s.id)}">Delete</button></div></div><div class="gzmp-note" style="margin-top:7px">${val(s.body)}</div></div>`).join('')||'<div class="gzmp-empty">No custom sections yet.</div>'}</div>`;
 $('gzmpAddSection').onclick=()=>openSectionEditor();
 pane.querySelectorAll('[data-edit-section]').forEach(b=>b.onclick=()=>openSectionEditor(rows.find(x=>x.id===b.dataset.editSection)));
 pane.querySelectorAll('[data-delete-section]').forEach(b=>b.onclick=async()=>{if(!confirm('Delete this store section?'))return;try{await api('/api/vendor/admin/store-sections?vendor_id='+encodeURIComponent(activeVendor),{method:'DELETE',body:JSON.stringify({id:b.dataset.deleteSection})});msg('✓ Section deleted.');renderVendorSections()}catch(e){msg('⚠ '+e.message,false)}});
};
const openSectionEditor=(s={})=>{
 openModal(`<div class="gzmp-dialog-head"><div><div class="eyebrow">STORE BUILDER</div><h2 style="margin:3px 0">${s.id?'Edit section':'Add section'}</h2></div>${closeButton}</div><form id="gzmpSectionForm" class="gzmp-form"><label>Section type<select name="section_type"><option value="custom">Custom</option><option value="hero">Hero</option><option value="announcement">Announcement</option><option value="featured">Featured products</option><option value="about">About</option></select></label><label>Sort order<input name="sort_order" type="number" value="${Number(s.sort_order||0)}"></label><label class="full">Title<input name="title" value="${val(s.title)}"></label><label class="full">Body<textarea name="body">${val(s.body)}</textarea></label><label>Enabled<select name="enabled"><option value="true" ${Number(s.enabled)!==0?'selected':''}>Enabled</option><option value="false" ${Number(s.enabled)===0?'selected':''}>Disabled</option></select></label><label class="full">Data JSON<textarea name="data_json" placeholder="Optional JSON for advanced section settings">${val(typeof s.data_json==='string'?s.data_json:JSON.stringify(s.data_json||{},null,2))}</textarea></label><div class="full gzmp-actions"><button type="button" class="gzmp-btn" data-close>Cancel</button><button class="gzmp-btn primary">Save section</button></div><div id="gzmpSectionMsg" class="full gzmp-muted"></div></form>`);
 $('gzmpModalBody').querySelectorAll('[data-close]').forEach(b=>b.onclick=closeModal);
 $('gzmpSectionForm').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.currentTarget),b=Object.fromEntries(f.entries());b.sort_order=Number(b.sort_order||0);b.enabled=b.enabled==='true';try{b.data_json=JSON.parse(b.data_json||'{}')}catch{$('gzmpSectionMsg').textContent='⚠ Data JSON is invalid.';return}try{const method=s.id?'PATCH':'POST';if(s.id)b.id=s.id;await api('/api/vendor/admin/store-sections?vendor_id='+encodeURIComponent(activeVendor),{method,body:JSON.stringify(b)});msg('✓ Store section saved.');closeModal();renderVendorSections()}catch(err){$('gzmpSectionMsg').textContent='⚠ '+err.message;$('gzmpSectionMsg').style.color='#a00'}};
};
const renderVendorSecurity=()=>{};
const ensureSecurity=()=>{
 const pane=$('gzmp-vpane-security');if(!pane)return;
 const v=vendorData?.vendor||{};
 let social='';try{social=typeof v.social_links==='string'?v.social_links:JSON.stringify(v.social_links||{},null,2)}catch{social='{}'}
 let contact='';try{contact=typeof v.contact_info==='string'?v.contact_info:JSON.stringify(v.contact_info||{},null,2)}catch{contact='{}'}
 pane.innerHTML=`<div class="gzmp-list">
 <div class="gzmp-card"><div class="gzmp-toolbar"><div><h3 class="gzmp-section-title">Login details</h3><p class="gzmp-section-sub">Actual backend login information. Existing passwords cannot be recovered; you can set a new one.</p></div><span class="gzmp-pill ${v.login_exists?'on':'off'}">${v.login_exists?'Login configured':'Login not configured'}</span></div>
 <div class="gzmp-form" style="margin-top:12px">
  <label>Vendor ID<input value="${val(v.id)}" readonly></label>
  <label>Login email<input value="${val(v.login_email||'Not configured')}" readonly></label>
  <label>Login status<input value="${val(v.login_status||'Not configured')}" readonly></label>
  <label>Role<input value="${val(v.login_role||'vendor_admin')}" readonly></label>
  <label class="full">Password<input value="••••••••  (not retrievable)" readonly></label>
 </div></div>
 <div class="gzmp-card"><div class="gzmp-toolbar"><div><h3 class="gzmp-section-title">Vendor / store information</h3><p class="gzmp-section-sub">Set up the vendor login if missing, or change the login email and password.</p></div><button class="gzmp-btn primary" id="gzmpSaveSecurityProfile">Save vendor info</button></div>
 <form id="gzmpSecurityProfile" class="gzmp-form" style="margin-top:12px">
  <label>Vendor login email<input name="login_email" type="email" value="${val(v.login_email||'')}" placeholder="vendor-login@example.com" required></label>
  <label>New login password<input name="new_password" type="password" minlength="8" placeholder="${v.login_exists?'Leave blank to keep current password':'Required: at least 8 characters'}"></label>
  <label>Business name<input name="business_name" value="${val(v.business_name)}"></label>
  <label>Brand / store name<input name="brand_name" value="${val(v.brand_name)}"></label>
  <label>Store / contact email<input name="email" type="email" value="${val(v.email)}"></label>
  <label>Phone<input name="phone" value="${val(v.phone)}"></label>
  <label>Status<select name="status"><option ${v.status==='Active'?'selected':''}>Active</option><option ${v.status==='Inactive'?'selected':''}>Inactive</option><option ${v.status==='Suspended'?'selected':''}>Suspended</option></select></label>
  <label>Shipping fee<input name="shipping_fee" type="number" min="0" value="${Number(v.shipping_fee||0)}"></label>
  <label>Commission type<select name="commission_type"><option value="percentage" ${v.commission_type==='percentage'?'selected':''}>Percentage</option><option value="fixed" ${v.commission_type==='fixed'?'selected':''}>Fixed</option></select></label>
  <label>Commission value<input name="commission_value" type="number" min="0" step="0.01" value="${Number(v.commission_value||0)}"></label>
  <label>Homepage visibility<select name="homepage_visible"><option value="true" ${Number(v.homepage_visible)!==0?'selected':''}>Visible</option><option value="false" ${Number(v.homepage_visible)===0?'selected':''}>Hidden</option></select></label>
  <label>Featured<select name="featured"><option value="true" ${Number(v.featured)!==0?'selected':''}>Yes</option><option value="false" ${Number(v.featured)===0?'selected':''}>No</option></select></label>
  <label class="full">Logo URL<input name="logo_url" value="${val(v.logo_url)}"></label>
  <label class="full">Banner URL<input name="banner_url" value="${val(v.banner_url)}"></label>
  <label>Tagline<input name="tagline" value="${val(v.tagline)}"></label>
  <label>Accent color<input name="accent_color" value="${val(v.accent_color)}"></label>
  <label class="full">Description<textarea name="description">${val(v.description)}</textarea></label>
  <label class="full">Announcement<textarea name="announcement">${val(v.announcement)}</textarea></label>
  <label class="full">Contact info JSON<textarea name="contact_info">${val(contact)}</textarea></label>
  <label class="full">Social links JSON<textarea name="social_links">${val(social)}</textarea></label>
  <div id="gzmpSecurityProfileMsg" class="full gzmp-muted"></div>
 </form></div>
 <div class="gzmp-card"><h3 class="gzmp-section-title">Set / change login password</h3><p class="gzmp-section-sub">For a missing login, enter both login email and a new password above. For an existing login, use this form to change the password.</p><form id="gzmpResetPass" class="gzmp-form" style="margin-top:12px"><label>Login email<input value="${val(v.login_email||'Not configured')}" readonly></label><label>New password<input name="password" type="password" minlength="8" required placeholder="At least 8 characters"></label><label>Confirm password<input name="confirm" type="password" minlength="8" required></label><div class="full gzmp-actions"><button class="gzmp-btn primary">Set new password</button></div><div id="gzmpResetMsg" class="full gzmp-muted"></div></form></div>
 </div>`;
 const profileForm=$('gzmpSecurityProfile');
 $('gzmpSaveSecurityProfile').onclick=async()=>{
  const f=new FormData(profileForm),b=Object.fromEntries(f.entries());
  b.shipping_fee=Number(b.shipping_fee||0);b.commission_value=Number(b.commission_value||0);b.homepage_visible=b.homepage_visible==='true';b.featured=b.featured==='true';
  const loginEmail=b.login_email,newPassword=b.new_password;delete b.login_email;delete b.new_password;
  if(!loginEmail){$('gzmpSecurityProfileMsg').textContent='⚠ Login email is required.';return}
  try{
   b.contact_info=JSON.parse(b.contact_info||'{}');b.social_links=JSON.parse(b.social_links||'{}');
   await api('/api/vendor/admin/vendors/'+encodeURIComponent(activeVendor),{method:'PATCH',body:JSON.stringify(b)});
   if(!v.login_exists||newPassword){
    if(!newPassword||newPassword.length<8)throw Error('Enter a new password of at least 8 characters to create or update the login.');
    await api('/api/vendor/admin/reset-password',{method:'POST',body:JSON.stringify({vendor_id:activeVendor,login_email:loginEmail,password:newPassword})});
   }else if(loginEmail!==v.login_email){
    throw Error('To change the login email, enter a new password too.');
   }
   msg('✓ Vendor information and login details saved.');
   const d=await api('/api/vendor/admin/vendor-data?vendor_id='+encodeURIComponent(activeVendor));vendorData=d;ensureSecurity();
  }catch(err){$('gzmpSecurityProfileMsg').textContent='⚠ '+err.message;$('gzmpSecurityProfileMsg').style.color='#a00'}
 };
 $('gzmpResetPass').onsubmit=async e=>{
  e.preventDefault();const form=e.currentTarget,f=new FormData(form),p=f.get('password'),c=f.get('confirm');
  if(p!==c){$('gzmpResetMsg').textContent='Passwords do not match.';return}
  try{
   const loginEmail=vendorData?.vendor?.login_email||'';
   await api('/api/vendor/admin/reset-password',{method:'POST',body:JSON.stringify({vendor_id:activeVendor,login_email:loginEmail,password:p})});
   $('gzmpResetMsg').textContent='✓ New password saved successfully.';$('gzmpResetMsg').style.color='#176b2c';form.reset();
  }catch(err){$('gzmpResetMsg').textContent='⚠ '+err.message;$('gzmpResetMsg').style.color='#a00'}
 };
};
const loadAllProducts=async()=>{
 const pane=$('gzmp-pane-products');pane.innerHTML='<div class="gzmp-empty">Loading products…</div>';
 try{
  const d=await api('/api/vendor/admin/products');const rows=d.products||[];
  pane.innerHTML=`<div class="gzmp-toolbar"><div><h2 class="gzmp-section-title">All marketplace products</h2><p class="gzmp-section-sub">${rows.length} products across all vendors.</p></div><button class="gzmp-btn" id="gzmpProductReload">↻ Refresh</button></div><div class="gzmp-table-wrap" style="margin-top:12px"><table class="gzmp-table"><thead><tr><th>Product</th><th>Vendor</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th>Actions</th></tr></thead><tbody>${rows.map(p=>`<tr><td><div class="gzmp-product"><img src="${val(p.image_url)}" onerror="this.style.visibility='hidden'"><div><b>${val(p.name)}</b><div class="gzmp-muted">${val(p.sku||'')}</div></div></div></td><td>${val(p.vendor_name)}</td><td>${val(p.category_name||p.category||'General')}</td><td>৳${Number(p.price||0).toLocaleString()}</td><td>${Number(p.stock||0)}</td><td><span class="gzmp-pill ${Number(p.published)!==0?'on':'off'}">${Number(p.published)!==0?'Published':'Draft'}</span></td><td><button class="gzmp-btn small" data-open-product-vendor="${val(p.vendor_id)}">Open vendor</button></td></tr>`).join('')}</tbody></table></div>`;
  $('gzmpProductReload').onclick=loadAllProducts;pane.querySelectorAll('[data-open-product-vendor]').forEach(b=>b.onclick=()=>openVendorPanel(b.dataset.openProductVendor));
 }catch(e){pane.innerHTML='<div class="gzmp-empty">⚠ '+val(e.message)+'</div>'}
};
const loadAllOrders=async()=>{
 const pane=$('gzmp-pane-orders');pane.innerHTML='<div class="gzmp-empty">Select a vendor to manage its orders from the Vendors tab.</div><div class="gzmp-actions" style="margin-top:10px"><button class="gzmp-btn primary" id="gzmpOrdersVendors">Open Vendors</button></div>';
 $('gzmpOrdersVendors').onclick=()=>showMpTab('vendors');
};
const renderCategories=async()=>{
 await loadCategories();const pane=$('gzmp-pane-categories');
 pane.innerHTML=`<div class="gzmp-card"><div class="gzmp-toolbar"><div><h2 class="gzmp-section-title">Marketplace categories</h2><p class="gzmp-section-sub">Create or remove product categories. Deleting a category moves its products to General unless you reassign them first.</p></div></div><form id="gzmpCategoryForm" class="gzmp-actions" style="margin-top:12px"><input name="name" required placeholder="Category name" style="flex:1;min-width:220px;padding:10px 11px;border:1px solid #ddd;border-radius:10px"><button class="gzmp-btn primary">＋ Add category</button></form><div class="gzmp-list" style="margin-top:14px">${categories.map(c=>`<div class="gzmp-card" style="display:flex;justify-content:space-between;align-items:center;gap:10px"><div><b>${val(c.name)}</b><div class="gzmp-muted">${val(c.slug)}</div></div><button class="gzmp-btn danger small" data-delete-category="${val(c.id)}">Delete</button></div>`).join('')||'<div class="gzmp-empty">No categories yet.</div>'}</div></div>`;
 $('gzmpCategoryForm').onsubmit=async e=>{e.preventDefault();const name=new FormData(e.currentTarget).get('name').trim();try{await api('/api/vendor/admin/categories',{method:'POST',body:JSON.stringify({name})});msg('✓ Category added.');renderCategories()}catch(err){msg('⚠ '+err.message,false)}};
 pane.querySelectorAll('[data-delete-category]').forEach(b=>b.onclick=async()=>{if(!confirm('Delete this category? Products using it will be moved to General.'))return;try{await api('/api/vendor/admin/categories?id='+encodeURIComponent(b.dataset.deleteCategory),{method:'DELETE',body:JSON.stringify({id:b.dataset.deleteCategory})});msg('✓ Category deleted.');renderCategories()}catch(e){msg('⚠ '+e.message,false)}});
};
const loadAll=async()=>{try{await renderOverview();if(activeVendor){/* keep vendor selection available */}}catch(e){msg('⚠ '+e.message,false)}};
const init=async()=>{
 const tab=$('tab-marketplace');if(!tab)return;
 injectStyles();
 if(!$('gzmp-pane-overview'))shell();
 ensureSecurity();
 await loadAll();
};
window.gzInitMarketplaceAdmin=init;
document.addEventListener('DOMContentLoaded',init);
document.addEventListener('click',e=>{const b=e.target.closest('[data-tab="marketplace"],[data-tab-target="marketplace"]');if(b)setTimeout(init,50)});
})();