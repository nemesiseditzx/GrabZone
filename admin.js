const C=window.GRABZONE_CONFIG;let sb=null,newProductMainIndex=0;
if(C&&!C.supabaseUrl.includes("PASTE_")&&window.supabase)sb=window.supabase.createClient(C.supabaseUrl,C.supabaseAnonKey);
const $=id=>document.getElementById(id);

/* GrabZone in-app notifications/dialogs — polished replacement for native browser popups. */
function gzUiToast(message,type='success'){
  let host=document.getElementById('gzUiToastHost');
  if(!host){
    host=document.createElement('div');
    host.id='gzUiToastHost';
    host.style.cssText='position:fixed;right:22px;bottom:22px;z-index:100001;display:grid;gap:10px;max-width:min(420px,calc(100vw - 30px));pointer-events:none;';
    document.body.appendChild(host);
  }
  const el=document.createElement('div');
  el.style.cssText='pointer-events:auto;padding:14px 16px;border-radius:14px;background:#111;color:#fff;box-shadow:0 14px 40px rgba(0,0,0,.24);font:700 13px/1.4 system-ui,-apple-system,Segoe UI,sans-serif;white-space:pre-line;';
  el.textContent=message;
  if(type==='error')el.style.background='#9d1717';
  host.appendChild(el);
  setTimeout(()=>{el.style.opacity='0';el.style.transform='translateY(6px)';el.style.transition='.2s ease';setTimeout(()=>el.remove(),220)},3200);
}
function gzUiConfirm(message){
  return new Promise(resolve=>{
    let modal=document.getElementById('gzUiConfirm');
    if(!modal){
      modal=document.createElement('div');
      modal.id='gzUiConfirm';
      modal.style.cssText='position:fixed;inset:0;z-index:100002;display:flex;align-items:center;justify-content:center;padding:18px;background:rgba(0,0,0,.58);backdrop-filter:blur(5px);';
      modal.innerHTML='<div style="width:min(430px,100%);background:#fff;border-radius:20px;padding:24px;box-shadow:0 24px 80px rgba(0,0,0,.28);font-family:system-ui,-apple-system,Segoe UI,sans-serif;"><div style="font-size:11px;font-weight:900;letter-spacing:.14em;color:#777;margin-bottom:8px">GRABZONE</div><div id="gzUiConfirmText" style="font-size:16px;line-height:1.5;font-weight:700;color:#111;white-space:pre-line"></div><div style="display:flex;justify-content:flex-end;gap:9px;margin-top:20px"><button id="gzUiConfirmNo" type="button" style="border:1px solid #ddd;background:#fff;color:#111;border-radius:10px;padding:10px 15px;font-weight:800;cursor:pointer">Cancel</button><button id="gzUiConfirmYes" type="button" style="border:0;background:#111;color:#fff;border-radius:10px;padding:10px 15px;font-weight:800;cursor:pointer">Continue</button></div></div>';
      document.body.appendChild(modal);
    }
    document.getElementById('gzUiConfirmText').textContent=message;
    modal.style.display='flex';
    const finish=value=>{modal.style.display='none';resolve(value)};
    document.getElementById('gzUiConfirmNo').onclick=()=>finish(false);
    document.getElementById('gzUiConfirmYes').onclick=()=>finish(true);
  });
}

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

function showApp(){
 $("loginBox").classList.add("hidden");
 $("app").classList.remove("hidden");
 loadSettings();
 loadProducts();
 loadNotices();
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
     cacheControl:'31536000',
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

 if(await gzUiConfirm("Delete this product and its images?")){

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
   return gzUiToast("Enter notice title and message.","error");

 const{error}=await sb
   .from("notices")
   .insert({
     title,
     message,
     sort_order:Number($("noticeOrder").value||0),
     active:true
   });

 if(error)return gzUiToast(error.message,"error");

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

 if(await gzUiConfirm("Delete this notice?")){

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

 scrollTo(0,0);

 if(tab === "billboards" && typeof loadBillboardManager === "function"){
   loadBillboardManager();
 }
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
