(() => {
'use strict';

const C=window.GRABZONE_CONFIG||{}, SUPABASE=window.supabase;
const sb=SUPABASE&&C.supabaseUrl&&!String(C.supabaseUrl).includes('PASTE_')
  ?SUPABASE.createClient(C.supabaseUrl,C.supabaseAnonKey):null;

const CART_KEY='grabzone_cart_v2';
const BUY_NOW_KEY='grabzone_buy_now_v2';
const currency=C.currency||'৳';
const dhakaShippingCharge=Number(C.dhakaShippingCharge??70);
const outsideDhakaShippingCharge=Number(C.outsideDhakaShippingCharge??130);

let checkoutItems=[],site={},locationTree=[],referralState={code:'',discount:0};
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const read=(key,fallback)=>{try{const v=JSON.parse(localStorage.getItem(key)||'null');return v??fallback}catch{return fallback}};
const money=n=>currency+Number(n||0).toLocaleString('en-BD');
const getSource=()=>{const buy=read(BUY_NOW_KEY,null);return Array.isArray(buy)&&buy.length?buy:read(CART_KEY,[])};
const msg=(t,error=false)=>{const e=$('checkoutMessage');if(e){e.textContent=t||'';e.className='checkout-message'+(error?' error':'')}};
const subtotal=()=>checkoutItems.reduce((s,i)=>s+Number(i.price||0)*Number(i.quantity||0),0);
const shippingForLocation=(division)=>String(division||'').trim().toLowerCase()==='dhaka'?dhakaShippingCharge:outsideDhakaShippingCharge;

function divisions(){
  if(Array.isArray(locationTree)) return locationTree;
  return Array.isArray(locationTree?.data)?locationTree.data:[];
}
function districtRecords(){
  const selected=String($('division')?.value||'').trim();
  if(!selected)return [];
  const d=divisions().find(x=>String(x?.name?.en||'').trim()===selected || String(x?.name?.local||'').trim()===selected);
  return Array.isArray(d?.district)?d.district:[];
}
function upazilaRecords(){
  const selectedDivision=String($('division')?.value||'').trim();
  const selectedDistrict=String($('district')?.value||'').trim();
  if(!selectedDivision||!selectedDistrict)return [];
  const d=districtRecords().find(x=>String(x?.name?.en||'').trim()===selectedDistrict || String(x?.name?.local||'').trim()===selectedDistrict);
  return Array.isArray(d?.upazila)?d.upazila:[];
}

function fillSelect(selectId,records,placeholder){
  const select=$(selectId);if(!select)return;
  const list=Array.isArray(records)?records:[];
  // Never wipe a working static dropdown when location data has not loaded yet.
  if(!list.length)return;
  const current=select.value;
  select.innerHTML='<option value="">'+esc(placeholder)+'</option>'+list.map(x=>{
    const en=String(x?.name?.en||'').trim(),local=String(x?.name?.local||'').trim();
    const value=en||local,label=en&&local&&en!==local?en+' — '+local:(en||local);
    return '<option value="'+esc(value)+'">'+esc(label)+'</option>';
  }).join('');
  if([...select.options].some(o=>o.value===current))select.value=current;
}

function fillDistrictOptions(){
  fillSelect('district',districtRecords(),'Select District');
  const s=$('districtSearch'); if(s){s.value='';s.disabled=false;}
}
function fillUpazilaOptions(){
  fillSelect('upazila',upazilaRecords(),'Select Upazila / Thana');
  const s=$('upazilaSearch'); if(s){s.value='';s.disabled=false;}
}
function useEmbeddedLocations(){
  const embedded=window.GRABZONE_BD_LOCATIONS;
  if(embedded&&Array.isArray(embedded.data)&&embedded.data.length){
    locationTree=embedded;
    fillSelect('division',divisions(),'Select Division');
    return true;
  }
  return false;
}
async function loadLocations(){
  // Use the bundled dataset first. It is already on the checkout page, so the
  // Division selector is populated immediately and does not depend on a fetch.
  if(useEmbeddedLocations()){
    $('district').disabled=true;
    $('upazila').disabled=true;
    return;
  }

  // Fallback for deployments where the bundled dataset is unavailable.
  try{
    const r=await fetch('/data/bangladesh-locations.json?checkout=20260829',{cache:'no-store'});
    if(!r.ok)throw new Error('HTTP '+r.status);
    const json=await r.json();
    if(!json||!Array.isArray(json.data)||!json.data.length)throw new Error('Invalid Bangladesh location data.');
    locationTree=json;
    fillSelect('division',divisions(),'Select Division');
    $('district').disabled=true;
    $('upazila').disabled=true;
    return;
  }catch(e){ console.error('GrabZone location data failed:',e); }

  // Keep the static HTML Division choices and do not blank the control.
  const division=$('division');
  if(division) division.disabled=false;
  msg('Location data could not be loaded. Please refresh and try again.',true);
}
function searchSelect(selectId, searchId, records, placeholder){
  const input=$(searchId), select=$(selectId);
  if(!input||!select)return;
  const q=String(input.value||'').trim().toLowerCase();
  const filtered=!q?records:records.filter(x=>{
    const en=String(x?.name?.en||'').toLowerCase(), local=String(x?.name?.local||'').toLowerCase();
    return en.includes(q)||local.includes(q);
  });
  fillSelect(selectId,filtered,placeholder);
}
function bindLocationSearch(){
  const ds=$('districtSearch'), us=$('upazilaSearch');
  ds?.addEventListener('input',()=>searchSelect('district','districtSearch',districtRecords(),'Select District'));
  us?.addEventListener('input',()=>searchSelect('upazila','upazilaSearch',upazilaRecords(),'Select Upazila / Thana'));
}
function onDivisionChange(){
  const selected=$('division')?.value||'';
  fillDistrictOptions();
  $('district').disabled=!selected;
  const ds=$('districtSearch'); if(ds){ds.disabled=!selected;ds.value='';}
  $('upazila').innerHTML='<option value="">Select Upazila / Thana</option>';
  $('upazila').value='';
  $('upazila').disabled=true;
  const us=$('upazilaSearch'); if(us){us.disabled=true;us.value='';}
  render();
}
function onDistrictChange(){
  const selected=$('district')?.value||'';
  fillUpazilaOptions();
  $('upazila').disabled=!selected;
  const us=$('upazilaSearch'); if(us)us.disabled=!selected;
  render();
}
function formData(){
  return {
    customer_name:$('customerName').value.trim(),
    phone:$('customerPhone').value.trim(),
    email:$('customerEmail').value.trim(),
    division:$('division').value.trim(),
    district:$('district').value.trim(),
    upazila:$('upazila').value.trim(),
    address:$('address').value.trim(),
    referral_code:$('referralCode').value.trim().toUpperCase()
  };
}
function validate(d){
  if(!d.customer_name||!d.phone||!d.email||!d.division||!d.district||!d.upazila||!d.address)
    return'Please complete all required fields.';
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email))
    return'Please enter a valid email address.';
  const phone=d.phone.replace(/\D/g,'');
  if(!/^01[3-9]\d{8}$/.test(phone))
    return'Please enter a valid 11-digit Bangladesh mobile number (01XXXXXXXXX).';
  return checkoutItems.length?'':'Your order is empty.';
}
function render(){
  const box=$('checkoutItems'),side=$('checkoutItemsSide'),empty=$('checkoutEmpty'),form=$('checkoutForm');
  if(!checkoutItems.length){
    if(box)box.innerHTML='';if(side)side.innerHTML='';
    if(empty)empty.hidden=false;if(form)form.hidden=true;return;
  }
  if(empty)empty.hidden=true;if(form)form.hidden=false;
  box.innerHTML=checkoutItems.map(i=>`<div class="checkout-item">
    <img src="${esc(i.image_url)}" alt="${esc(i.name)}">
    <div class="checkout-item-info"><strong>${esc(i.name)}</strong><span>Quantity: ${i.quantity}</span></div>
    <b>${money(i.price*i.quantity)}</b>
  </div>`).join('');
  side.innerHTML=checkoutItems.map(i=>`<div class="summary-product">
    <img src="${esc(i.image_url)}" alt="">
    <div><strong>${esc(i.name)}</strong><span>Qty ${i.quantity}</span></div>
    <b>${money(i.price*i.quantity)}</b>
  </div>`).join('');
  const sub=subtotal(),shipping=shippingForLocation($('division')?.value||''),discount=Number(referralState.discount||0);
  $('checkoutSubtotal').textContent=money(sub);
  $('checkoutShipping').textContent=money(shipping);
  $('checkoutDiscount').textContent='-'+money(discount);
  $('checkoutDiscountRow').hidden=discount<=0;
  $('checkoutTotal').textContent=money(Math.max(0,sub+shipping-discount));
}
async function applyReferral(){
  const input=$('referralCode'),button=$('applyReferralBtn'),note=$('referralMessage');
  const code=input.value.trim().toUpperCase();
  if(!code){
    referralState={code:'',discount:0};
    note.textContent='Referral code cleared.';
    note.style.color='#858a88';
    render();return;
  }
  if(!sb){note.textContent='Referral service is not configured.';return}
  button.disabled=true;button.textContent='Checking…';
  try{
    const{data,error}=await sb.rpc('validate_referral_code',{p_code:code,p_subtotal:subtotal()});
    if(error)throw error;
    if(!data?.valid){
      referralState={code:'',discount:0};
      note.textContent=data?.message||'Invalid or inactive referral code.';
      note.style.color='#b42318';
    }else{
      referralState={code,discount:Number(data.discount||0)};
      note.textContent=`✓ ${data.label||'Referral benefit applied'} — ${money(data.discount)} off`;
      note.style.color='#08704f';
    }
    render();
  }catch(e){
    console.error(e);
    referralState={code:'',discount:0};
    note.textContent='Could not verify this referral code.';
    note.style.color='#b42318';
    render();
  }finally{
    button.disabled=false;button.textContent='Apply';
  }
}
async function loadSite(){
  if(!sb)return;
  const{data}=await sb.from('site_settings').select('store_name,logo_url').eq('id',1).maybeSingle();
  site=data||{};document.title='Checkout — '+(site.store_name||'GRABZONE');
  if(site.logo_url&&$('checkoutLogo'))$('checkoutLogo').src=site.logo_url;
}
async function hydrate(){
  const raw=getSource();
  if(!raw.length){render();return}
  if(!sb){checkoutItems=raw;render();return}
  const ids=[...new Set(raw.map(x=>x.product_id).filter(Boolean))];
  const{data,error}=await sb.from('products').select('id,name,price,image_url,published').in('id',ids);
  if(error){console.error(error);checkoutItems=raw;render();return}
  const map=new Map((data||[]).map(p=>[p.id,p]));
  checkoutItems=raw.map(x=>{
    const p=map.get(x.product_id);if(!p)return null;
    return{product_id:p.id,name:p.name,image_url:p.image_url,price:Number(p.price||0),quantity:Math.max(1,Number(x.quantity||1))}
  }).filter(Boolean);
  render();
}
async function submit(e){
  e.preventDefault();
  const d=formData(),bad=validate(d);
  if(bad){msg(bad,true);return}
  if(d.referral_code!==referralState.code){
    await applyReferral();
    if(d.referral_code&&!referralState.code){msg('Please apply a valid referral code or remove it.',true);return}
  }
  d.phone=d.phone.replace(/\D/g,'');
  const b=$('placeOrderBtn');b.disabled=true;b.textContent='Placing order…';msg('');
  const shipping=shippingForLocation(d.division);
  const payload={
    customer_name:d.customer_name,email:d.email,phone:d.phone,division:d.division,
    district:d.district,upazila:d.upazila,address:d.address,
    referral_code:d.referral_code||null,payment_method:'Cash on Delivery',
    shipping_charge:shipping,
    items:checkoutItems.map(i=>({product_id:i.product_id,product_name:i.name,image_url:i.image_url,quantity:Number(i.quantity),unit_price:Number(i.price)})),
    subtotal:subtotal(),referral_discount:Number(referralState.discount||0),total:Math.max(0,subtotal()+shipping-Number(referralState.discount||0))
  };
  try{
    if(!sb)throw new Error('Order service is not configured.');
    const{data:order,error}=await sb.rpc('create_public_order',{payload});
    if(error)throw error;
    if(!order?.id||!order?.order_number)throw new Error('Order could not be created.');
    localStorage.removeItem(CART_KEY);localStorage.removeItem(BUY_NOW_KEY);
    $('checkoutForm').hidden=true;$('checkoutSuccess').hidden=false;
    $('successOrderNumber').textContent=order.order_number;
    $('successEmailNote').textContent='Your order has been saved successfully. Our team will call you to verify the order.';
    window.scrollTo({top:0,behavior:'smooth'});
  }catch(err){
    console.error(err);msg(err.message||'Could not place your order. Please try again.',true);
    b.disabled=false;b.textContent='Confirm Order';
  }
}
document.addEventListener('DOMContentLoaded',async()=>{
  $('checkoutForm')?.addEventListener('submit',submit);
  $('division')?.addEventListener('change',onDivisionChange);
  $('district')?.addEventListener('change',onDistrictChange);
  $('applyReferralBtn')?.addEventListener('click',applyReferral);
  $('referralCode')?.addEventListener('input',()=>{referralState={code:'',discount:0};$('referralMessage').textContent='Enter the code and press Apply.';render()});
  await loadLocations();await loadSite();await hydrate();
});
})();