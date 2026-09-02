(() => {
'use strict';
const BACKEND=String((window.GRABZONE_CONFIG||{}).backendUrl||'').replace(/\/$/,'');
const D1=window.grabzoneD1||null;
const DEFAULTS={quick_view:true,wishlist:true,recently_viewed:true,quick_add:true,discount_badge:true,stock_indicator:true,reviews:true};
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
let state={...DEFAULTS};

function parse(css){const m=String(css||'').match(/\/\*\s*GZ_PHASE5_CONFIG\s*([\s\S]*?)\*\//);if(!m)return {...DEFAULTS};try{return {...DEFAULTS,...JSON.parse(m[1].trim())}}catch{return {...DEFAULTS}}}
function merge(css,obj){const clean=String(css||'').replace(/\/\*\s*GZ_PHASE5_CONFIG\s*[\s\S]*?\*\//g,'').trim();return clean+'\\n\\n/* GZ_PHASE5_CONFIG '+JSON.stringify(obj)+' */\\n'}
async function load(){
 try{const r=await D1.from('site_settings').select('custom_css').eq('id',1).maybeSingle();if(r.error)throw r.error;state=parse(r.data?.custom_css);for(const k of Object.keys(DEFAULTS)){$('p5_'+k).checked=!!state[k]}$('p5_msg').textContent='Loaded.'}catch(e){$('p5_msg').textContent='Could not load settings: '+e.message}
}
async function save(){
 const next={};for(const k of Object.keys(DEFAULTS))next[k]=!!$('p5_'+k)?.checked;
 try{const r=await D1.from('site_settings').select('custom_css').eq('id',1).maybeSingle();if(r.error)throw r.error;const css=merge(r.data?.custom_css,next);const u=await D1.from('site_settings').update({custom_css:css,updated_at:new Date().toISOString()}).eq('id',1);if(u.error)throw u.error;state=next;$('p5_msg').textContent='✓ Phase 5 settings saved. Refresh the storefront to apply.'}catch(e){$('p5_msg').textContent='✕ '+e.message}
}
async function reviews(){
 const box=$('p5_reviews');if(!box||!BACKEND||!D1)return;box.innerHTML='<div class="muted">Loading reviews…</div>';
 try{
  const t=window.getToken?window.getToken():'';let r=await fetch(BACKEND+'/api/product-reviews?product_id='+encodeURIComponent($('p5_product').value)+'&admin=1',{headers:{Authorization:'Bearer '+t},credentials:'include'});let d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||'Could not load reviews');
  const rows=d.reviews||[];box.innerHTML=rows.map(x=>'<div class="p5-review-row"><div><b>'+esc(x.customer_name)+'</b> · '+esc(x.rating)+'/5 <span class="muted">· '+new Date(x.created_at).toLocaleString()+'</span><p>'+esc(x.review_text)+'</p></div><div><button class="ghost" data-review-action="toggle" data-id="'+esc(x.id)+'">'+(x.approved?'Hide':'Approve')+'</button> <button class="ghost" data-review-action="delete" data-id="'+esc(x.id)+'">Delete</button></div></div>').join('')||'<div class="muted">No reviews for this product.</div>';
 }catch(e){box.innerHTML='<div class="message">'+esc(e.message)+'</div>'}
}
async function reviewAction(id,action){
 try{const t=window.getToken?window.getToken():'';if(action==='delete'){if(!await gzUiConfirm('Delete this review permanently?'))return;let r=await fetch(BACKEND+'/api/product-reviews?id='+encodeURIComponent(id),{method:'DELETE',headers:{Authorization:'Bearer '+t},credentials:'include'});if(!r.ok)const er=await r.json().catch(()=>({}));throw Error(er.error||'Delete failed')}else{let row=document.querySelector('[data-id="'+CSS.escape(id)+'"]');let approved=row?.textContent.includes('Hide');let r=await fetch(BACKEND+'/api/product-reviews',{method:'PATCH',headers:{Authorization:'Bearer '+t,'Content-Type':'application/json'},credentials:'include',body:JSON.stringify({id,approved:!approved})});if(!r.ok)throw Error('Update failed')}reviews()}catch(e){gzUiToast(e.message,'error')}
}
function inject(){
 if($('gzPhase5AdminPanel'))return;
 const tab=document.getElementById('tab-appearance');if(!tab)return;
 const panel=document.createElement('section');panel.id='gzPhase5AdminPanel';panel.className='panel';panel.style.marginTop='16px';
 panel.innerHTML='<div class="eyebrow">PHASE 5 · WEBSITE UI</div><h2 style="margin:5px 0">Premium storefront controls</h2><p class="muted">Enable or disable the new customer-facing UI without changing the existing design.</p><div class="p5-toggle-grid">'+Object.entries({quick_view:'Quick View',wishlist:'Wishlist',recently_viewed:'Recently Viewed',quick_add:'Quick Add',discount_badge:'Discount Badge',stock_indicator:'Stock Indicator',reviews:'Ratings & Reviews'}).map(([k,v])=>'<label class="p5-toggle"><span><b>'+v+'</b><small>'+({quick_view:'Open product details without leaving the shop.',wishlist:'Save products in this browser.',recently_viewed:'Show recently viewed products.',quick_add:'Add one unit directly from a card.',discount_badge:'Show percentage discount on sale cards.',stock_indicator:'Show availability badge on published products.',reviews:'Allow customers to submit ratings and reviews.'}[k])+'</small></span><input type="checkbox" id="p5_'+k+'"></label>').join('')+'</div><div style="display:flex;gap:9px;align-items:center;margin-top:15px"><button class="primary" id="p5_save" type="button">Save Phase 5</button><span id="p5_msg" class="save-message"></span></div><div style="border-top:1px solid #eee;margin-top:22px;padding-top:20px"><div class="eyebrow">REVIEW MODERATION</div><h3 style="margin:5px 0">Customer reviews</h3><div style="display:grid;grid-template-columns:1fr auto;gap:8px"><select id="p5_product"><option value="">Select product</option></select><button class="ghost" id="p5_load_reviews" type="button">Load Reviews</button></div><div id="p5_reviews" style="margin-top:12px"></div></div>';
 tab.appendChild(panel);
 const style=document.createElement('style');style.textContent='.p5-toggle-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:16px}.p5-toggle{display:flex;justify-content:space-between;gap:15px;align-items:center;border:1px solid #e5e7eb;border-radius:13px;padding:12px;background:#fff}.p5-toggle small{display:block;color:#777;margin-top:4px;font-weight:500}.p5-toggle input{width:20px;height:20px;margin:0}.p5-review-row{display:flex;justify-content:space-between;gap:15px;border:1px solid #e5e7eb;border-radius:12px;padding:12px;margin-top:8px}.p5-review-row p{margin:6px 0;color:#555}.p5-review-row button{font-size:11px}@media(max-width:700px){.p5-toggle-grid{grid-template-columns:1fr}.p5-review-row{flex-direction:column}}';document.head.appendChild(style);
 $('p5_save').onclick=save;$('p5_load_reviews').onclick=reviews;$('p5_reviews').onclick=e=>{const b=e.target.closest('[data-review-action]');if(b)reviewAction(b.dataset.id,b.dataset.reviewAction)};
 const loadProducts=async()=>{const r=await D1.from('products').select('id,name').order('name');if(r.error)return; $('p5_product').innerHTML='<option value="">Select product</option>'+(r.data||[]).map(p=>'<option value="'+esc(p.id)+'">'+esc(p.name)+'</option>').join('')};loadProducts();load();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',inject);else inject();
})();