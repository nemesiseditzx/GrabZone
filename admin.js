const C=window.GRABZONE_CONFIG;let sb=null,newProductMainIndex=0;
if(C&&!C.supabaseUrl.includes("PASTE_")&&window.supabase)sb=window.supabase.createClient(C.supabaseUrl,C.supabaseAnonKey);
const $=id=>document.getElementById(id);

const fields=["store_name","tagline","hero_eyebrow","hero_title","hero_title_em","hero_description","hero_button_text","hero_button_link","how_button_text","how_button_link","offer_title","offer_message","offer_code","collection_eyebrow","collection_title","how_eyebrow","how_title","step1_title","step1_body","step2_title","step2_body","step3_title","step3_body","referral_eyebrow","referral_title","referral_body","referral_button_text","footer_text","whatsapp","instagram","messenger","header_link1_label","header_link1_url","header_link2_label","header_link2_url","header_link3_label","header_link3_url","custom_css"];

function esc(x){
 return String(x??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))
}

async function login(){
 if(!sb){$("loginMsg").textContent="Supabase is not configured.";return}
 const{error}=await sb.auth.signInWithPassword({
   email:$("email").value.trim(),
   password:$("password").value
 });
 $("loginMsg").textContent=error?error.message:"";
 if(!error)showApp()
}

async function logout(){
 await sb.auth.signOut();
 location.reload()
}

function injectReferralManager(){
 if($('tab-referrals'))return;
 const main=document.querySelector('main.content');if(!main)return;
 const section=document.createElement('section');
 section.id='tab-referrals';section.className='tab';
 section.innerHTML=`
 <div class="page-title"><div><div class="eyebrow">REFERRAL MANAGEMENT</div><h1>Referral Codes</h1><p>Create and control every admin's code and its customer benefit.</p></div><button class="primary" id="gzReferralRefresh">↻ Refresh</button></div>
 <div class="panel">
  <h3 style="margin-top:0">Create referral code</h3>
  <div class="gz-ref-grid">
   <label>Admin Name<input id="rcAdminName" placeholder="Tonmoy"></label>
   <label>Admin Phone<input id="rcAdminPhone" placeholder="Optional"></label>
   <label>Admin Email<input id="rcAdminEmail" type="email" placeholder="Optional"></label>
   <label>Referral Code<input id="rcCode" placeholder="TONMOYB10"></label>
   <label>Benefit Type<select id="rcType"><option value="fixed">Fixed ৳ off</option><option value="percentage">Percentage % off</option></select></label>
   <label>Benefit Value<input id="rcValue" type="number" min="0" step="0.01" placeholder="10"></label>
   <label>Minimum Order<input id="rcMin" type="number" min="0" step="0.01" value="0"></label>
   <label>Maximum Discount<input id="rcMax" type="number" min="0" step="0.01" placeholder="No limit"></label>
   <label>Usage Limit<input id="rcLimit" type="number" min="0" step="1" placeholder="Unlimited"></label>
   <label>Starts At<input id="rcStart" type="datetime-local"></label>
   <label>Expires At<input id="rcExpire" type="datetime-local"></label>
   <label style="display:flex;align-items:center;gap:8px">Active <input id="rcActive" type="checkbox" checked></label>
   <label class="gz-ref-full">Note<textarea id="rcNote" rows="2" placeholder="Internal note"></textarea></label>
  </div>
  <div id="gzReferralMsg" class="muted" style="margin-top:12px"></div>
  <button class="primary" id="gzReferralCreate">＋ Create Code</button>
 </div>
 <div class="panel" style="margin-top:18px"><div id="gzReferralList" class="muted">Loading referral codes…</div></div>`;
 main.appendChild(section);
 const style=document.createElement('style');style.id='gzReferralStyle';style.textContent=`
 .gz-ref-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.gz-ref-grid label{display:grid;gap:6px;font-size:11px;font-weight:800;color:#555}.gz-ref-grid input,.gz-ref-grid select,.gz-ref-grid textarea{width:100%;box-sizing:border-box;border:1px solid #ddd;border-radius:10px;padding:11px;background:#fff;font:inherit}.gz-ref-full{grid-column:1/-1}.gz-ref-table{width:100%;border-collapse:collapse;min-width:1050px}.gz-ref-table th,.gz-ref-table td{padding:11px 9px;border-bottom:1px solid #eee;text-align:left;font-size:12px}.gz-ref-table th{font-size:10px;text-transform:uppercase;color:#777}.gz-ref-wrap{overflow:auto}.gz-ref-actions{display:flex;gap:6px;white-space:nowrap}.gz-ref-actions button{border:1px solid #ddd;background:#fff;border-radius:8px;padding:7px 9px;font:inherit;font-size:10px;font-weight:800;cursor:pointer}.gz-ref-actions .danger{color:#a00000}@media(max-width:850px){.gz-ref-grid{grid-template-columns:1fr 1fr}}@media(max-width:560px){.gz-ref-grid{grid-template-columns:1fr}.gz-ref-full{grid-column:auto}}`;
 document.head.appendChild(style);
 $('gzReferralRefresh').onclick=loadReferralCodes;
 $('gzReferralCreate').onclick=createReferralCode;
 loadReferralCodes();
}
async function loadReferralCodes(){
 const box=$('gzReferralList');if(!box||!sb)return;
 box.textContent='Loading…';
 const{data,error}=await sb.from('referral_codes').select('*').order('created_at',{ascending:false});
 if(error){box.textContent=error.message;return}
 if(!data?.length){box.innerHTML='<div class="muted">No referral codes yet.</div>';return}
 box.innerHTML='<div class="gz-ref-wrap"><table class="gz-ref-table"><thead><tr><th>Admin</th><th>Code</th><th>Benefit</th><th>Rules</th><th>Used</th><th>Status</th><th>Actions</th></tr></thead><tbody>'+
 data.map(r=>`<tr><td><b>${esc(r.admin_name)}</b><br><small>${esc(r.admin_email||r.admin_phone||'')}</small></td><td><b>${esc(r.code)}</b></td><td>${r.benefit_type==='percentage'?esc(r.benefit_value)+'% off':money(r.benefit_value)+' off'}</td><td>Min ${money(r.min_order_amount)} · ${r.max_discount_amount==null?'No cap':'Cap '+money(r.max_discount_amount)} · ${r.usage_limit==null?'Unlimited':r.usage_limit+' uses'}</td><td>${r.used_count||0}</td><td>${r.active?'Active':'Disabled'}</td><td><div class="gz-ref-actions"><button data-ref-toggle="${esc(r.id)}">${r.active?'Disable':'Enable'}</button><button class="danger" data-ref-delete="${esc(r.id)}">Delete</button></div></td></tr>`).join('')+'</tbody></table></div>';
 box.querySelectorAll('[data-ref-toggle]').forEach(b=>b.onclick=()=>toggleReferral(b.dataset.refToggle));
 box.querySelectorAll('[data-ref-delete]').forEach(b=>b.onclick=()=>deleteReferral(b.dataset.refDelete));
}
async function createReferralCode(){
 const p={
  admin_name:$('rcAdminName').value.trim(),admin_phone:$('rcAdminPhone').value.trim()||null,admin_email:$('rcAdminEmail').value.trim()||null,
  code:$('rcCode').value.trim().toUpperCase(),benefit_type:$('rcType').value,benefit_value:Number($('rcValue').value||0),
  min_order_amount:Number($('rcMin').value||0),max_discount_amount:$('rcMax').value?Number($('rcMax').value):null,
  usage_limit:$('rcLimit').value?Number($('rcLimit').value):null,starts_at:$('rcStart').value?new Date($('rcStart').value).toISOString():null,
  expires_at:$('rcExpire').value?new Date($('rcExpire').value).toISOString():null,active:$('rcActive').checked,note:$('rcNote').value.trim()||null
 };
 if(!p.admin_name||!p.code||p.benefit_value<=0){$('gzReferralMsg').textContent='Enter admin name, code and a benefit greater than 0.';return}
 try{
  const{error}=await sb.from('referral_codes').insert(p);if(error)throw error;
  $('gzReferralMsg').textContent='✓ Referral code created.';
  ['rcAdminName','rcAdminPhone','rcAdminEmail','rcCode','rcValue','rcMax','rcLimit','rcStart','rcExpire','rcNote'].forEach(id=>{const e=$(id);if(e)e.value=''});
  $('rcMin').value='0';$('rcActive').checked=true;await loadReferralCodes();
 }catch(e){$('gzReferralMsg').textContent='✕ '+e.message}
}
async function toggleReferral(id){
 const{data,error}=await sb.from('referral_codes').select('active').eq('id',id).single();if(error)return alert(error.message);
 const{error:e}=await sb.from('referral_codes').update({active:!data.active,updated_at:new Date().toISOString()}).eq('id',id);if(e)return alert(e.message);loadReferralCodes();
}
async function deleteReferral(id){
 if(!confirm('Delete this referral code?'))return;
 const{error}=await sb.from('referral_codes').delete().eq('id',id);if(error)return alert(error.message);loadReferralCodes();
}

function showApp(){
 $("loginBox").classList.add("hidden");
 $("app").classList.remove("hidden");
 loadSettings();
 loadProducts();
 loadNotices();
 injectReferralManager()
}

function previewFile(input,id){
 const f=input.files?.[0],box=$(id);
 if(!f||!box)return;
 box.innerHTML=`<img src="${URL.createObjectURL(f)}" alt="preview">`
}

/* =========================
   NEW PRODUCT IMAGE PREVIEW
========================= */

function previewMultiple(input){
 const files=[...input.files].slice(0,10);
 const box=$("multiPreview");

 newProductMainIndex=0;
 box.innerHTML="";

 if(!files.length){
   box.innerHTML='<div class="empty-preview">No images selected</div>';
   return
 }

 renderNewProductPreview(files)
}

function renderNewProductPreview(files){
 const box=$("multiPreview");
 box.innerHTML="";

 files.forEach((f,i)=>{
   const d=document.createElement("div");

   d.className=`multi-thumb ${i===newProductMainIndex?"selected-main":""}`;

   d.innerHTML=`
     <img src="${URL.createObjectURL(f)}" alt="product image ${i+1}">

     <span>
       ${i===newProductMainIndex?"★ MAIN":"IMAGE "+(i+1)}
     </span>

     <button
       type="button"
       class="make-main"
       onclick="setNewProductMain(${i})">
       ${i===newProductMainIndex?"✓ Main":"☆ Make Main"}
     </button>
   `;

   box.appendChild(d)
 })
}

function setNewProductMain(index){
 const files=[...($("images").files||[])].slice(0,10);

 if(index<0||index>=files.length)return;

 newProductMainIndex=index;

 renderNewProductPreview(files)
}

/* =========================
   IMAGE UPLOAD
========================= */

async function uploadImage(file){
 if(!file)throw new Error("Choose an image.");

 const ext=(file.name.split(".").pop()||"jpg").toLowerCase();

 const path=`${crypto.randomUUID()}.${ext}`;

 const{error}=await sb.storage
   .from("product-images")
   .upload(path,file,{
     contentType:file.type,
     upsert:false
   });

 if(error)throw error;

 return sb.storage
   .from("product-images")
   .getPublicUrl(path)
   .data.publicUrl
}

async function uploadImages(files){
 const out=[];

 for(const f of [...files].slice(0,10)){
   out.push(await uploadImage(f))
 }

 return out
}

/* =========================
   SETTINGS
========================= */

async function loadSettings(){
 const{data,error}=await sb
   .from("site_settings")
   .select("*")
   .eq("id",1)
   .maybeSingle();

 if(error){
   $("settingsMsg").textContent=error.message;
   return
 }

 if(!data)return;

 fields.forEach(k=>{
   const e=$("s_"+k);
   if(e)e.value=data[k]??""
 });

 $("s_primary").value=data.primary_color||"#111111";
 $("s_bg").value=data.page_background||"#ffffff";

 ["notice","offer","how"].forEach(k=>{
   $("s_show_"+k).value=String(data["show_"+k]??true)
 });

 $("s_show_ref").value=String(data.show_referral??true);

 if(data.logo_url)
   $("logoPreview").innerHTML=`<img src="${esc(data.logo_url)}">`;

 if(data.hero_image_url)
   $("heroPreview").innerHTML=`<img src="${esc(data.hero_image_url)}">`
}

async function saveSettings(){
 try{
   const p={};

   fields.forEach(k=>{
     const e=$("s_"+k);
     if(e)p[k]=e.value
   });

   if($("s_logo").files[0])
     p.logo_url=await uploadImage($("s_logo").files[0]);

   if($("s_hero").files[0])
     p.hero_image_url=await uploadImage($("s_hero").files[0]);

   p.primary_color=$("s_primary").value;
   p.page_background=$("s_bg").value;

   p.show_notice=$("s_show_notice").value==="true";
   p.show_offer=$("s_show_offer").value==="true";
   p.show_how=$("s_show_how").value==="true";
   p.show_referral=$("s_show_ref").value==="true";

   p.updated_at=new Date().toISOString();

   const{error}=await sb
     .from("site_settings")
     .upsert({id:1,...p},{onConflict:"id"});

   if(error)throw error;

   $("settingsMsg").textContent="✓ Saved. Refresh the storefront.";

   await loadSettings()

 }catch(e){
   $("settingsMsg").textContent="✕ "+e.message
 }
}

/* =========================
   ADD PRODUCT
========================= */

async function addProduct(){
 try{

   const name=$("name").value.trim();
   const category=$("category").value.trim();
   const price=$("price").value;

   const files=[...($("images").files||[])].slice(0,10);

   if(!name||!category||!price){
     $("productMsg").textContent=
       "Enter product name, category and price.";
     return
   }

   if(!files.length){
     $("productMsg").textContent=
       "Choose at least one product image.";
     return
   }

   if(newProductMainIndex>=files.length)
     newProductMainIndex=0;

   $("productMsg").textContent=
     `Uploading ${files.length} image${files.length>1?"s":""}...`;

   const urls=await uploadImages(files);

   const mainUrl=urls[newProductMainIndex]||urls[0];

   const{data:p,error}=await sb
     .from("products")
     .insert({
       name,
       category,
       price:Number(price),
       old_price:$("oldPrice").value
         ?Number($("oldPrice").value)
         :null,

       image_url:mainUrl,

       tag:$("tag").value.trim(),

       description:$("description").value.trim(),

       published:$("published").value==="true"
     })
     .select()
     .single();

   if(error)throw error;

   const rows=urls.map((url,i)=>({
     product_id:p.id,
     image_url:url,
     sort_order:i,
     is_main:i===newProductMainIndex
   }));

   const{error:ie}=await sb
     .from("product_images")
     .insert(rows);

   if(ie)throw ie;

   $("productMsg").textContent=
     `✓ Product saved with ${urls.length} image${urls.length>1?"s":""}. Main image: ${newProductMainIndex+1}`;

   ["name","category","price","oldPrice","tag","description"]
     .forEach(id=>$(id).value="");

   $("images").value="";

   newProductMainIndex=0;

   $("multiPreview").innerHTML=
     '<div class="empty-preview">No images selected</div>';

   loadProducts()

 }catch(e){

   $("productMsg").textContent="✕ "+e.message

 }
}

/* =========================
   SET EXISTING IMAGE AS MAIN
========================= */

async function setProductMain(productId,imageId,imageUrl){

 try{

   /* Remove main from all images of this product */
   const{error:e1}=await sb
     .from("product_images")
     .update({is_main:false})
     .eq("product_id",productId);

   if(e1)throw e1;

   /* Make selected image main */
   const{error:e2}=await sb
     .from("product_images")
     .update({is_main:true})
     .eq("id",imageId)
     .eq("product_id",productId);

   if(e2)throw e2;

   /* Update main image on products table */
   const{error:e3}=await sb
     .from("products")
     .update({
       image_url:imageUrl,
       updated_at:new Date().toISOString()
     })
     .eq("id",productId);

   if(e3)throw e3;

   $("productMsg").textContent=
     "✓ Main image changed successfully.";

   await loadProducts()

 }catch(e){

   $("productMsg").textContent=
     "✕ "+e.message

 }
}

/* =========================
   LOAD PRODUCTS
========================= */

async function loadProducts(){

 const{data,error}=await sb
   .from("products")
   .select("*")
   .order("created_at",{ascending:false});

 if(error){
   $("products").innerHTML=esc(error.message);
   return
 }

 $("statProducts").textContent=(data||[]).length;

 const html=[];

 for(const p of data||[]){

   const{data:imgs,imgError}=
     await sb
       .from("product_images")
       .select("*")
       .eq("product_id",p.id)
       .order("sort_order");

   const list=imgs||[];

   const count=list.length||1;

   let gallery="";

   if(list.length){

     gallery=`
       <div class="admin-gallery">

         ${list.map((im,i)=>`

           <div class="admin-gallery-item ${im.is_main?"is-main":""}">

             <img
               src="${esc(im.image_url)}"
               alt="${esc(p.name)} image ${i+1}">

             <div class="gallery-label">
               ${im.is_main
                 ?"★ MAIN"
                 :"IMAGE "+(i+1)}
             </div>

             ${
               im.is_main
               ?`<div class="main-badge">Current Main</div>`
               :`
                 <button
                   type="button"
                   class="set-main-btn"
                   onclick="setProductMain(
                     '${p.id}',
                     '${im.id}',
                     '${esc(im.image_url).replace(/'/g,"&#39;")}'
                   )">
                   ☆ Set as Main
                 </button>
               `
             }

           </div>

         `).join("")}

       </div>
     `

   }else{

     gallery=`
       <div class="admin-gallery">

         <div class="admin-gallery-item is-main">

           <img
             src="${esc(p.image_url)}"
             alt="${esc(p.name)}">

           <div class="gallery-label">
             ★ MAIN
           </div>

         </div>

       </div>
     `
   }

   html.push(`

     <div class="item product-admin-item">

       <div class="product-item-head">

         <img
           src="${esc(p.image_url)}"
           alt="${esc(p.name)}">

         <div>

           <b>${esc(p.name)}</b>

           <div class="meta">
             ${esc(p.category)}
             · ৳${Number(p.price).toLocaleString()}
             · ${count} image${count>1?"s":""}
             · ${p.published?"Published":"Hidden"}
           </div>

         </div>

         <div class="product-actions">

           <button
             class="ghost"
             onclick="toggleProduct('${p.id}',${p.published})">

             ${p.published?"Hide":"Publish"}

           </button>

           <button
             class="ghost"
             onclick="deleteProduct('${p.id}')">

             Delete

           </button>

         </div>

       </div>

       ${gallery}

       ${
         imgError
         ?`<div class="meta">
             Gallery error: ${esc(imgError.message)}
           </div>`
         :""
       }

     </div>

   `)
 }

 $("products").innerHTML=
   html.join("")||"<p>No products yet.</p>"
}

/* =========================
   PRODUCT ACTIONS
========================= */

async function toggleProduct(id,p){

 await sb
   .from("products")
   .update({
     published:!p,
     updated_at:new Date().toISOString()
   })
   .eq("id",id);

 loadProducts()
}

async function deleteProduct(id){

 if(confirm("Delete this product and its images?")){

   await sb
     .from("products")
     .delete()
     .eq("id",id);

   loadProducts()
 }
}

/* =========================
   NOTICES
========================= */

async function addNotice(){

 const title=$("noticeTitle").value.trim();
 const message=$("noticeMessage").value.trim();

 if(!title||!message)
   return alert("Enter notice title and message.");

 const{error}=await sb
   .from("notices")
   .insert({
     title,
     message,
     sort_order:Number($("noticeOrder").value||0),
     active:true
   });

 if(error)return alert(error.message);

 $("noticeTitle").value="";
 $("noticeMessage").value="";

 loadNotices()
}

async function loadNotices(){

 const{data,error}=await sb
   .from("notices")
   .select("*")
   .order("sort_order");

 if(error){
   $("notices").innerHTML=esc(error.message);
   return
 }

 $("statNotices").textContent=
   (data||[]).filter(x=>x.active).length;

 $("notices").innerHTML=
   (data||[]).map(n=>`

     <div class="notice">

       <b>${esc(n.title)}</b>

       <p>${esc(n.message)}</p>

       <button
         class="ghost"
         onclick="toggleNotice('${n.id}',${n.active})">

         ${n.active?"Hide":"Show"}

       </button>

       <button
         class="ghost"
         onclick="deleteNotice('${n.id}')">

         Delete

       </button>

     </div>

   `).join("")||"<p>No notices yet.</p>"
}

async function toggleNotice(id,p){

 await sb
   .from("notices")
   .update({active:!p})
   .eq("id",id);

 loadNotices()
}

async function deleteNotice(id){

 if(confirm("Delete this notice?")){

   await sb
     .from("notices")
     .delete()
     .eq("id",id);

   loadNotices()
 }
}

/* =========================
   TABS
========================= */

function switchTab(tab){

 document
   .querySelectorAll(".tab")
   .forEach(x=>x.classList.remove("active"));

 document
   .querySelectorAll(".side-link")
   .forEach(x=>x.classList.remove("active"));

 $("tab-"+tab)?.classList.add("active");

 document
   .querySelector(`.side-link[data-tab="${tab}"]`)
   ?.classList.add("active");

 scrollTo(0,0)
}

document.addEventListener("click",e=>{

 const s=e.target.closest(".side-link");

 if(s)
   switchTab(s.dataset.tab);

 const q=e.target.closest("[data-tab-target]");

 if(q)
   switchTab(q.dataset.tabTarget)

});

(async()=>{

 if(sb){

   const{data}=await sb.auth.getSession();

   if(data.session)
     showApp()
 }

})();
