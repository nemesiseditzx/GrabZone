(() => {
'use strict';

const C=window.GRABZONE_CONFIG||{};
const sb=window.grabzoneD1||null;

const CART_KEY='grabzone_cart_v2';
const BUY_NOW_KEY='grabzone_buy_now_v2';
const currency=C.currency||'৳';
const flatShippingCharge=130;

let checkoutItems=[],site={},locationTree=[],referralState={code:'',discount:0},grabPointsState={balance:0,use:0,discount:0};
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const read=(key,fallback)=>{try{const v=JSON.parse(localStorage.getItem(key)||'null');return v??fallback}catch{return fallback}};
const money=n=>currency+Number(n||0).toLocaleString('en-BD');
const getSource=()=>{const buy=read(BUY_NOW_KEY,null);return Array.isArray(buy)&&buy.length?buy:read(CART_KEY,[])};
const msg=(t,error=false)=>{const e=$('checkoutMessage');if(e){e.textContent=t||'';e.className='checkout-message'+(error?' error':'')}};
const subtotal=()=>checkoutItems.reduce((s,i)=>s+Number(i.price||0)*Number(i.quantity||0),0);
const shippingForLocation=()=>flatShippingCharge;
function deliveryEtaForLocation(division,district){
  const d=String(district||'').toLowerCase(),v=String(division||'').toLowerCase();
  if(d||v)return '2–7 days';
  return '';
}
function renderDeliveryEta(){
  const box=$('deliveryEta'),text=$('deliveryEtaText');if(!box||!text)return;
  const eta=deliveryEtaForLocation($('division')?.value||'',$('district')?.value||'');
  box.hidden=!eta;if(eta)text.textContent=eta;
}

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
function thanaRecords(){
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
  setPickerEnabled('district',true);
  renderPicker('district');
  updatePickerText('district');
}
function fillUpazilaOptions(){
  fillSelect('upazila',thanaRecords(),'Select Thana');
  setPickerEnabled('upazila',true);
  renderPicker('upazila');
  updatePickerText('upazila');
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
function locationRecords(type){
  if(type==='division') return divisions();
  if(type==='district') return districtRecords();
  return thanaRecords();
}
function locationLabel(x){
  const en=String(x?.name?.en||'').trim(), local=String(x?.name?.local||'').trim();
  return {en:en||local,local:local||en,value:en||local};
}
function pickerFor(type){
  return document.querySelector('.location-picker[data-picker="'+type+'"]');
}
function renderPicker(type,query=''){
  const picker=pickerFor(type); if(!picker)return;
  const list=locationRecords(type);
  const q=String(query||'').trim().toLowerCase();
  const filtered=q?list.filter(x=>{
    const n=locationLabel(x); return n.en.toLowerCase().includes(q)||n.local.toLowerCase().includes(q);
  }):list;
  const options=picker.querySelector('.location-options');
  const selected=$(type)?.value||'';
  options.innerHTML=filtered.length?filtered.map(x=>{
    const n=locationLabel(x);
    return '<button type="button" class="location-option'+(n.value===selected?' active':'')+'" data-value="'+esc(n.value)+'" role="option" aria-selected="'+(n.value===selected?'true':'false')+'"><span class="location-option-main">'+esc(n.local)+'</span><span class="location-option-sub">'+esc(n.en)+'</span></button>';
  }).join(''):'<div class="location-empty">No matching location found.</div>';
}
function setPickerEnabled(type,enabled){
  const picker=pickerFor(type); if(!picker)return;
  const trigger=picker.querySelector('.location-trigger');
  if(trigger)trigger.disabled=!enabled;
  const input=picker.querySelector('.location-menu-search');
  if(input)input.disabled=!enabled;
}
function updatePickerText(type){
  const picker=pickerFor(type), select=$(type); if(!picker||!select)return;
  const option=select.options[select.selectedIndex];
  const text=picker.querySelector('.location-trigger-text');
  if(text)text.textContent=option?.value||option?.textContent||('Select '+type);
}
function closeAllPickers(except){
  document.querySelectorAll('.location-picker.open').forEach(p=>{
    if(p!==except){p.classList.remove('open');p.querySelector('.location-menu')?.setAttribute('hidden','');p.querySelector('.location-trigger')?.setAttribute('aria-expanded','false');}
  });
}
function openPicker(type){
  const picker=pickerFor(type); if(!picker)return;
  if(picker.querySelector('.location-trigger')?.disabled)return;
  closeAllPickers(picker);
  picker.classList.add('open');
  const menu=picker.querySelector('.location-menu'), input=picker.querySelector('.location-menu-search');
  menu.hidden=false; picker.querySelector('.location-trigger').setAttribute('aria-expanded','true');
  input.value=''; renderPicker(type,'');
  requestAnimationFrame(()=>input.focus());
}
function closePicker(type){
  const picker=pickerFor(type); if(!picker)return;
  picker.classList.remove('open');picker.querySelector('.location-menu').hidden=true;picker.querySelector('.location-trigger').setAttribute('aria-expanded','false');
}
function chooseLocation(type,value){
  const select=$(type); if(!select)return;
  select.value=value;
  updatePickerText(type);
  closePicker(type);
  if(type==='division') onDivisionChange();
  else if(type==='district') onDistrictChange();
  else render();
}
function bindLocationPickers(){
  document.querySelectorAll('.location-picker').forEach(picker=>{
    const type=picker.dataset.picker;
    const trigger=picker.querySelector('.location-trigger');
    const input=picker.querySelector('.location-menu-search');
    trigger?.addEventListener('click',()=>picker.classList.contains('open')?closePicker(type):openPicker(type));
    input?.addEventListener('input',()=>renderPicker(type,input.value));
    picker.querySelector('.location-options')?.addEventListener('click',e=>{
      const option=e.target.closest('.location-option');
      if(option)chooseLocation(type,option.dataset.value);
    });
  });
  document.addEventListener('click',e=>{
    if(!e.target.closest('.location-picker'))closeAllPickers();
  });
}
function onDivisionChange(){
  const division=$('division'),district=$('district'),upazila=$('upazila');
  if(!division||!district||!upazila)return;
  district.value='';upazila.value='';
  district.disabled=!division.value;upazila.disabled=true;
  setPickerEnabled('district',!!division.value);
  setPickerEnabled('upazila',false);
  updatePickerText('district');updatePickerText('upazila');
  if(division.value)fillDistrictOptions();
  render();renderDeliveryEta();
}
function onDistrictChange(){
  const district=$('district'),upazila=$('upazila');
  if(!district||!upazila)return;
  upazila.value='';
  upazila.disabled=!district.value;
  setPickerEnabled('upazila',!!district.value);
  updatePickerText('upazila');
  if(district.value)fillUpazilaOptions();
  render();renderDeliveryEta();
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
    referral_code:$('referralCode').value.trim().toUpperCase(),
    grabpoints_tracking_id:$('grabpointsTracking')?.value.trim().toUpperCase()||'',
    grabpoints_redeem:Math.max(0,Math.floor(Number($('grabpointsUse')?.value||0)))
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
  const sub=subtotal(),shipping=shippingForLocation($('division')?.value||''),discount=Number(referralState.discount||0),pointsDiscount=Number(grabPointsState.discount||0);
  $('checkoutSubtotal').textContent=money(sub);
  $('checkoutShipping').textContent=money(shipping);
  $('checkoutDiscount').textContent='-'+money(discount);
  $('checkoutDiscountRow').hidden=discount<=0;
  const pointsRow=$('checkoutPointsRow');if(pointsRow)pointsRow.hidden=pointsDiscount<=0;const pointsEl=$('checkoutPointsDiscount');if(pointsEl)pointsEl.textContent='-'+money(pointsDiscount);
  $('checkoutTotal').textContent=money(Math.max(0,sub+shipping-discount-pointsDiscount));
  renderDeliveryEta();
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
async function syncOrderToSheet(orderId){
  try{
    const response=await fetch((C.backendUrl||'')+'/api/sync-order-sheet',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({orderId})});
    if(!response.ok) console.warn('GrabZone Google Sheets sync:',await response.text().catch(()=>''));
  }catch(e){console.warn('GrabZone Google Sheets sync:',e)}
}

async function sendOrderEmail(orderNumber,type='order_created',orderData=null,itemsData=null){
  try{
    const response=await fetch((C.backendUrl||'')+'/api/send-order-email',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        orderNumber,
        type,
        order:orderData,
        items:Array.isArray(itemsData)?itemsData:[]
      })
    });
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(data.error||'Email could not be sent.');
    return true;
  }catch(e){
    console.error('GrabZone order email:',e);
    return false;
  }
}
function openOrderConfirm(d){
  return new Promise(resolve=>{
    const modal=$('orderConfirmModal');
    if(!modal){resolve(window.confirm('Please review your order details carefully before placing the order.'));return}
    const shipping=shippingForLocation(d.division);
    const total=Math.max(0,subtotal()+shipping-Number(referralState.discount||0)-Number(grabPointsState.discount||0));
    const address=[d.address,d.upazila,d.district,d.division].filter(Boolean).join(', ');
    $('confirmCustomer').textContent=d.customer_name||'—';
    $('confirmPhone').textContent=d.phone||'—';
    $('confirmAddress').textContent=address||'—';
    $('confirmTotal').textContent=money(total);
    const ok=modal.querySelector('[data-confirm-ok]');
    const cancel=modal.querySelectorAll('[data-confirm-cancel]');
    const finish=value=>{
      modal.hidden=true;
      modal.setAttribute('aria-hidden','true');
      document.body.style.overflow='';
      ok?.removeEventListener('click',onOk);
      cancel.forEach(x=>x.removeEventListener('click',onCancel));
      document.removeEventListener('keydown',onKey);
      resolve(value);
    };
    const onOk=()=>finish(true);
    const onCancel=()=>finish(false);
    const onKey=e=>{if(e.key==='Escape')finish(false)};
    ok?.addEventListener('click',onOk);
    cancel.forEach(x=>x.addEventListener('click',onCancel));
    document.addEventListener('keydown',onKey);
    modal.hidden=false;
    modal.setAttribute('aria-hidden','false');
    document.body.style.overflow='hidden';
    requestAnimationFrame(()=>ok?.focus());
  });
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
  const confirmed=await openOrderConfirm(d);
  if(!confirmed)return;
  const b=$('placeOrderBtn');b.disabled=true;b.textContent='Placing order…';msg('');
  const shipping=shippingForLocation(d.division);
  const payload={
    customer_name:d.customer_name,email:d.email,phone:d.phone,division:d.division,
    district:d.district,upazila:d.upazila,address:d.address,
    referral_code:d.referral_code||null,payment_method:'Cash on Delivery',
    shipping_charge:shipping,
    items:checkoutItems.map(i=>({product_id:i.product_id,product_name:i.name,image_url:i.image_url,quantity:Number(i.quantity),unit_price:Number(i.price)})),
    subtotal:subtotal(),referral_discount:Number(referralState.discount||0),grabpoints_redeem:Number(grabPointsState.use||0),grabpoints_tracking_id:String($('grabpointsTracking')?.value||'').trim().toUpperCase(),total:Math.max(0,subtotal()+shipping-Number(referralState.discount||0)-Number(grabPointsState.discount||0))
  };
  try{
    if(!sb)throw new Error('Order service is not configured.');
    const{data:order,error}=await sb.rpc('create_public_order',{payload});
    if(error)throw error;
    if(!order?.id||!order?.order_number)throw new Error('Order could not be created.');

    // Keep the customer record synchronized without making checkout fail if Google Sheets is temporarily unavailable.
    await syncOrderToSheet(order.id);

    // Some older create_public_order functions return only the order number.
    // Read the newly-created private tracking ID through the dedicated
    // SECURITY DEFINER RPC instead of exposing the orders table to customers.
    let privateTrackingId=String(order.public_tracking_id||'').trim();
    if(!privateTrackingId){
      const lookup=await sb.rpc('get_public_tracking_id',{p_order_id:order.id});
      if(!lookup.error) privateTrackingId=String(lookup.data||'').trim();
    }
    if(!privateTrackingId)throw new Error('Order was created, but the private Tracking ID could not be generated. Please contact GrabZone support.');

    localStorage.removeItem(CART_KEY);localStorage.removeItem(BUY_NOW_KEY);
    $('checkoutForm').hidden=true;$('checkoutSuccess').hidden=false;
    $('successOrderNumber').textContent=order.order_number;
    $('successTrackingId').textContent=privateTrackingId;
    const trackLink=$('successTrackLink');
    if(trackLink) trackLink.href='track-order.html?tracking='+encodeURIComponent(privateTrackingId);
    const emailSent=await sendOrderEmail(
      order.order_number,
      'order_created',
      {
        ...order,
        customer_name:d.customer_name,
        email:d.email,
        phone:d.phone,
        division:d.division,
        district:d.district,
        upazila:d.upazila,
        address:d.address,
        payment_method:'Cash on Delivery',
        shipping_charge:130,
        subtotal:subtotal(),
        referral_discount:Number(referralState.discount||0),
        points_redeemed:Number(order.points_redeemed||grabPointsState.use||0),
        points_discount:Number(order.points_discount||grabPointsState.discount||0),
        total:Math.max(0,subtotal()+130-Number(referralState.discount||0)-Number(order.points_discount||grabPointsState.discount||0)),
        public_tracking_id:privateTrackingId
      },
      checkoutItems.map(i=>({
        product_name:i.name,
        quantity:Number(i.quantity||1),
        unit_price:Number(i.price||0),
        line_total:Number(i.price||0)*Number(i.quantity||1),
        image_url:i.image_url||''
      }))
    );
    $('successEmailNote').textContent=emailSent
      ?'A confirmation email has been sent to your email address. Our team will call you to verify the order.'
      :'Your order has been saved successfully. Our team will call you to verify the order.';
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
  bindLocationPickers();
  $('applyReferralBtn')?.addEventListener('click',applyReferral);
  async function checkGrabPoints(){
    const phone=String($('customerPhone')?.value||'').replace(/\D/g,'');
    const bal=$('grabpointsBalance'),msgp=$('grabpointsMsg');
    if(!/^01[3-9]\d{8}$/.test(phone)){if(bal)bal.textContent='Enter your phone';if(msgp)msgp.textContent='Enter a valid mobile number first.';return}
    try{
      const{data,error}=await sb.rpc('grabpoints_balance',{p_phone:phone});
      if(error)throw error;
      grabPointsState.balance=Number(data?.points||0);
      if(bal)bal.textContent=grabPointsState.balance+' GP · ৳'+Number(data?.value||0).toLocaleString('en-BD')+' value';
      if(msgp)msgp.textContent=grabPointsState.balance?'Your points are ready to use.':'No GrabPoints yet. Points are added after delivered orders.';
    }catch(e){if(msgp)msgp.textContent='Could not check points right now.'}
  }
  function applyGrabPoints(){
    const requested=Math.max(0,Math.floor(Number($('grabpointsUse')?.value||0)));
    const msgp=$('grabpointsMsg');
    if(!requested){grabPointsState={...grabPointsState,use:0,discount:0};if(msgp)msgp.textContent='Points discount cleared.';render();return}
    if(requested%10!==0){if(msgp)msgp.textContent='Use points in multiples of 10.';return}
    if(requested>Number(grabPointsState.balance||0)){if(msgp)msgp.textContent='Not enough GrabPoints.';return}
    const discount=Math.min(subtotal(),requested/10);
    grabPointsState={...grabPointsState,use:requested,discount};
    if(msgp)msgp.textContent='✓ '+requested+' GP applied · ৳'+discount.toLocaleString('en-BD')+' off. A previous Delivered Tracking ID is required at checkout.';
    render();
  }
  $('checkGrabPoints')?.addEventListener('click',checkGrabPoints);
  $('applyGrabPoints')?.addEventListener('click',applyGrabPoints);
  $('customerPhone')?.addEventListener('blur',checkGrabPoints);
  $('customerPhone')?.addEventListener('input',()=>{grabPointsState={balance:0,use:0,discount:0};const b=$('grabpointsBalance');if(b)b.textContent='Check your points';});

  $('referralCode')?.addEventListener('input',()=>{referralState={code:'',discount:0};$('referralMessage').textContent='Enter the code and press Apply.';render()});
  await loadLocations();await loadSite();await hydrate();
});
})();