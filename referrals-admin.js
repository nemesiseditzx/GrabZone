(() => {
'use strict';
const C=window.GRABZONE_CONFIG||{};
const sb=window.supabase&&C.supabaseUrl&&!String(C.supabaseUrl).includes('PASTE_')
  ?window.supabase.createClient(C.supabaseUrl,C.supabaseAnonKey):null;
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
let editingId=null,referrals=[];

function inject(){
  if($('gzReferralTab'))return;
  const ordersNav=document.querySelector('.side-link[data-tab="orders"]');
  if(ordersNav){
    ordersNav.insertAdjacentHTML('afterend',`<button id="gzReferralTab" class="side-link" data-tab="referrals" type="button">🎁 <span>Referral Codes</span></button>`);
  }
  const main=document.querySelector('main.content');if(!main)return;
  const section=document.createElement('section');section.id='tab-referrals';section.className='tab';
  section.innerHTML=`
    <div class="page-title">
      <div><div class="eyebrow">REFERRAL MANAGEMENT</div><h1>Referral Codes</h1><p>Create codes for each admin/referrer and control exactly what benefit customers receive.</p></div>
      <button class="primary" id="gzReferralRefresh">↻ Refresh</button>
    </div>
    <div class="panel">
      <h2 id="gzReferralFormTitle">Add referral code</h2>
      <div class="gz-ref-grid">
        <label>Admin / Referrer Name<input id="rfAdminName" placeholder="Tonmoy"></label>
        <label>Admin Phone<input id="rfAdminPhone" placeholder="01XXXXXXXXX"></label>
        <label>Admin Email<input id="rfAdminEmail" type="email" placeholder="admin@example.com"></label>
        <label>Referral Code<input id="rfCode" placeholder="TONMOYB10"></label>
        <label>Benefit Type<select id="rfType"><option value="fixed">Fixed amount (৳)</option><option value="percentage">Percentage (%)</option></select></label>
        <label>Benefit Value<input id="rfValue" type="number" min="0" step="0.01" placeholder="10"></label>
        <label>Minimum Order Amount<input id="rfMin" type="number" min="0" step="1" value="0"></label>
        <label>Maximum Discount <span class="muted">(optional)</span><input id="rfMax" type="number" min="0" step="1" placeholder="No limit"></label>
        <label>Usage Limit <span class="muted">(optional)</span><input id="rfLimit" type="number" min="0" step="1" placeholder="Unlimited"></label>
        <label>Starts At <span class="muted">(optional)</span><input id="rfStarts" type="datetime-local"></label>
        <label>Expires At <span class="muted">(optional)</span><input id="rfExpires" type="datetime-local"></label>
        <label>Active<select id="rfActive"><option value="true">Active</option><option value="false">Disabled</option></select></label>
        <label class="gz-ref-full">Admin Note<textarea id="rfNote" placeholder="Internal note"></textarea></label>
      </div>
      <div id="gzReferralMsg" class="gz-ref-msg"></div>
      <div class="gz-ref-actions"><button class="ghost" id="gzReferralClear">Clear</button><button class="primary" id="gzReferralSave">Save referral code</button></div>
    </div>
    <div class="panel"><div id="gzReferralList" class="gz-ref-list"><div class="muted">Loading…</div></div></div>`;
  main.appendChild(section);

  const style=document.createElement('style');style.id='gzReferralStyle';style.textContent=`
    .gz-ref-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.gz-ref-grid label{display:grid;gap:6px;font-size:11px;font-weight:800;color:#555}.gz-ref-grid input,.gz-ref-grid textarea,.gz-ref-grid select{width:100%;box-sizing:border-box;border:1px solid #ddd;border-radius:10px;padding:11px;background:#fff;font:inherit;color:#111}.gz-ref-grid textarea{min-height:80px;resize:vertical}.gz-ref-full{grid-column:1/-1}.gz-ref-actions{display:flex;justify-content:flex-end;gap:9px;margin-top:15px}.gz-ref-msg{min-height:20px;margin-top:8px;font-size:12px;font-weight:800}.gz-ref-card{border:1px solid #e4e4e1;border-radius:15px;padding:15px;margin-bottom:10px;background:#fff}.gz-ref-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.gz-ref-code{font-size:17px;font-weight:950;letter-spacing:.04em}.gz-ref-benefit{font-weight:900}.gz-ref-meta{display:flex;gap:8px;flex-wrap:wrap;margin-top:9px}.gz-ref-pill{background:#f2f2ef;border-radius:999px;padding:5px 8px;font-size:10px;font-weight:800}.gz-ref-actions-row{display:flex;gap:7px;flex-wrap:wrap;margin-top:12px}.gz-ref-disabled{opacity:.58}.gz-ref-empty{text-align:center;padding:30px;color:#777}@media(max-width:900px){.gz-ref-grid{grid-template-columns:1fr 1fr}}@media(max-width:600px){.gz-ref-grid{grid-template-columns:1fr}.gz-ref-full{grid-column:auto}}`;
  document.head.appendChild(style);
  $('gzReferralRefresh').onclick=load;
  $('gzReferralSave').onclick=save;
  $('gzReferralClear').onclick=clearForm;
  document.addEventListener('click',e=>{
    const edit=e.target.closest('[data-ref-edit]');if(edit)editReferral(edit.dataset.refEdit);
    const del=e.target.closest('[data-ref-delete]');if(del)deleteReferral(del.dataset.refDelete);
    const tog=e.target.closest('[data-ref-toggle]');if(tog)toggleReferral(tog.dataset.refToggle,tog.dataset.active==='true');
  });
  load();
}
function clearForm(){editingId=null;$('gzReferralFormTitle').textContent='Add referral code';$('gzReferralSave').textContent='Save referral code';['rfAdminName','rfAdminPhone','rfAdminEmail','rfCode','rfValue','rfMax','rfLimit','rfStarts','rfExpires','rfNote'].forEach(id=>$(id).value='');$('rfMin').value='0';$('rfType').value='fixed';$('rfActive').value='true';$('gzReferralMsg').textContent='';}
function toInput(v){return v?new Date(v).toISOString().slice(0,16):''}
function fromInput(v){return v?new Date(v).toISOString():null}
function readForm(){
 return {
  admin_name:$('rfAdminName').value.trim(),admin_phone:$('rfAdminPhone').value.trim()||null,
  admin_email:$('rfAdminEmail').value.trim().toLowerCase()||null,
  code:$('rfCode').value.trim().toUpperCase(),benefit_type:$('rfType').value,
  benefit_value:Number($('rfValue').value||0),min_order_amount:Number($('rfMin').value||0),
  max_discount_amount:$('rfMax').value===''?null:Number($('rfMax').value),
  usage_limit:$('rfLimit').value===''?null:Number($('rfLimit').value),
  starts_at:fromInput($('rfStarts').value),expires_at:fromInput($('rfExpires').value),
  active:$('rfActive').value==='true',note:$('rfNote').value.trim()||null,
  updated_at:new Date().toISOString()
 };
}
async function save(){
 if(!sb)return;
 const p=readForm();
 const m=$('gzReferralMsg');
 if(!p.admin_name||!p.code){m.textContent='⚠ Admin/referrer name and code are required.';m.style.color='#a00';return}
 if(!p.benefit_value||p.benefit_value<0){m.textContent='⚠ Enter a valid benefit value.';m.style.color='#a00';return}
 if(p.benefit_type==='percentage'&&p.benefit_value>100){m.textContent='⚠ Percentage benefit cannot exceed 100%.';m.style.color='#a00';return}
 try{
  const q=editingId?sb.from('referral_codes').update(p).eq('id',editingId):sb.from('referral_codes').insert(p);
  const{error}=await q;if(error)throw error;
  m.textContent='✓ Referral code saved.';m.style.color='#176b2c';clearForm();await load();
 }catch(e){m.textContent='⚠ '+e.message;m.style.color='#a00'}
}
async function load(){
 if(!sb){$('gzReferralList').innerHTML='<div>Supabase is not configured.</div>';return}
 const{data,error}=await sb.from('referral_codes').select('*').order('created_at',{ascending:false});
 if(error){$('gzReferralList').innerHTML='<div>'+esc(error.message)+'</div>';return}
 referrals=data||[];render();
}
function render(){
 if(!referrals.length){$('gzReferralList').innerHTML='<div class="gz-ref-empty">No referral codes yet.</div>';return}
 $('gzReferralList').innerHTML=referrals.map(r=>{
  const benefit=r.benefit_type==='percentage'?r.benefit_value+'% off':'৳'+Number(r.benefit_value||0).toLocaleString('en-BD')+' off';
  const usage=r.usage_limit===null?'Unlimited':(r.used_count||0)+' / '+r.usage_limit;
  return `<div class="gz-ref-card ${r.active?'':'gz-ref-disabled'}">
    <div class="gz-ref-head"><div><div class="gz-ref-code">${esc(r.code)}</div><div>${esc(r.admin_name)} ${r.admin_email?'· '+esc(r.admin_email):''}</div></div><div class="gz-ref-benefit">${esc(benefit)}</div></div>
    <div class="gz-ref-meta"><span class="gz-ref-pill">Min ৳${Number(r.min_order_amount||0).toLocaleString('en-BD')}</span><span class="gz-ref-pill">Usage: ${esc(usage)}</span><span class="gz-ref-pill">${r.active?'ACTIVE':'DISABLED'}</span>${r.max_discount_amount!==null?'<span class="gz-ref-pill">Max ৳'+Number(r.max_discount_amount).toLocaleString('en-BD')+'</span>':''}</div>
    <div class="gz-ref-actions-row"><button class="ghost" data-ref-edit="${esc(r.id)}">Edit</button><button class="ghost" data-ref-toggle="${esc(r.id)}" data-active="${r.active}">${r.active?'Disable':'Enable'}</button><button class="ghost" data-ref-delete="${esc(r.id)}">Delete</button></div>
  </div>`;
 }).join('');
}
function editReferral(id){
 const r=referrals.find(x=>x.id===id);if(!r)return;editingId=id;
 $('gzReferralFormTitle').textContent='Edit referral code';
 $('gzReferralSave').textContent='Update referral code';
 $('rfAdminName').value=r.admin_name||'';$('rfAdminPhone').value=r.admin_phone||'';$('rfAdminEmail').value=r.admin_email||'';
 $('rfCode').value=r.code||'';$('rfType').value=r.benefit_type||'fixed';$('rfValue').value=r.benefit_value??0;
 $('rfMin').value=r.min_order_amount??0;$('rfMax').value=r.max_discount_amount??'';$('rfLimit').value=r.usage_limit??'';
 $('rfStarts').value=toInput(r.starts_at);$('rfExpires').value=toInput(r.expires_at);$('rfActive').value=String(!!r.active);$('rfNote').value=r.note||'';
 document.getElementById('tab-referrals').scrollIntoView({behavior:'smooth',block:'start'});
}
async function toggleReferral(id,active){
 const{error}=await sb.from('referral_codes').update({active:!active,updated_at:new Date().toISOString()}).eq('id',id);
 if(error)alert(error.message);else load();
}
async function deleteReferral(id){
 if(!confirm('Delete this referral code?'))return;
 const{error}=await sb.from('referral_codes').delete().eq('id',id);
 if(error)alert(error.message);else load();
}
document.addEventListener('DOMContentLoaded',inject);
})();