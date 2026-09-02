const C=window.GRABZONE_CONFIG||{};let sb=window.grabzoneD1||null,newProductMainIndex=0;
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
 if(!sb){$("loginMsg").textContent="Database service is not configured.";return}
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

async function loadDashboardAnalytics(){
  const msg=$("gzAnalyticsMsg");
  if(msg)msg.textContent="Loading live analytics…";
  try{
    if(!sb)throw new Error("Database service is not configured.");
    const [ordersResult,itemsResult,productsResult]=await Promise.all([
      sb.from("orders").select("id,order_number,customer_name,email,phone,subtotal,total,status,created_at").order("created_at",{ascending:false}),
      sb.from("order_items").select("order_id,product_name,quantity,unit_price,line_total"),
      sb.from("products").select("id,name,price,published,created_at")
    ]);
    if(ordersResult.error)throw ordersResult.error;
    if(itemsResult.error)throw itemsResult.error;
    if(productsResult.error)throw productsResult.error;

    const allOrders=Array.isArray(ordersResult.data)?ordersResult.data:[];
    const allItems=Array.isArray(itemsResult.data)?itemsResult.data:[];
    const products=Array.isArray(productsResult.data)?productsResult.data:[];

    const now=new Date();
    const cutoff=new Date(now.getTime()-29*24*60*60*1000);
    const orders=allOrders.filter(o=>{
      const d=new Date(o.created_at);
      return !Number.isNaN(d.getTime())&&d>=cutoff;
    });

    const money=n=>"৳"+Number(n||0).toLocaleString("en-BD",{maximumFractionDigits:0});
    const statusList=["New","Contacting","Confirmed","Processing","Shipped","Delivered","Cancelled"];
    const statusCounts={};
    for(const s of statusList)statusCounts[s]=0;
    for(const o of orders){
      const s=statusList.includes(o.status)?o.status:"New";
      statusCounts[s]++;
    }

    const todayKey=now.toISOString().slice(0,10);
    const todayOrders=orders.filter(o=>String(o.created_at||"").slice(0,10)===todayKey);
    const todaySales=todayOrders.filter(o=>o.status!=="Cancelled").reduce((n,o)=>n+Number(o.total||0),0);
    const validOrders=orders.filter(o=>o.status!=="Cancelled");
    const revenue30=validOrders.reduce((n,o)=>n+Number(o.total||0),0);
    const avgOrder=validOrders.length?revenue30/validOrders.length:0;

    const customerMap=new Map();
    for(const o of orders){
      const key=String(o.phone||o.email||o.customer_name||"").trim().toLowerCase();
      if(!key)continue;
      const c=customerMap.get(key)||{name:o.customer_name||"Unknown",phone:o.phone||"",email:o.email||"",orders:0,spent:0,last:o.created_at};
      c.orders++;
      if(o.status!=="Cancelled")c.spent+=Number(o.total||0);
      if(new Date(o.created_at)>new Date(c.last))c.last=o.created_at;
      customerMap.set(key,c);
    }
    const customers=[...customerMap.values()];
    const uniqueCustomers=customers.length;
    const repeatCustomers=customers.filter(c=>c.orders>1).length;

    const activeOrderIds=new Set(allOrders.filter(o=>o.status!=="Cancelled").map(o=>o.id));
    const pmap=new Map();
    for(const i of allItems){
      if(!activeOrderIds.has(i.order_id))continue;
      const name=String(i.product_name||"Unknown product");
      const p=pmap.get(name)||{name,units:0,revenue:0,orders:0};
      p.units+=Number(i.quantity||0);
      p.revenue+=Number(i.line_total||0);
      p.orders++;
      pmap.set(name,p);
    }
    const topProducts=[...pmap.values()].sort((a,b)=>b.units-a.units).slice(0,8);
    const topCustomers=customers.sort((a,b)=>b.spent-a.spent).slice(0,8);

    const trend=[];
    for(let n=6;n>=0;n--){
      const d=new Date(now.getTime()-n*24*60*60*1000);
      const key=d.toISOString().slice(0,10);
      const xs=orders.filter(o=>String(o.created_at||"").slice(0,10)===key);
      trend.push({
        date:key,
        orders:xs.length,
        revenue:xs.filter(o=>o.status!=="Cancelled").reduce((s,o)=>s+Number(o.total||0),0)
      });
    }

    const maxStatus=Math.max(1,...statusList.map(s=>Number(statusCounts[s]||0)));
    $("gzKpiTodaySales").textContent=money(todaySales);
    $("gzKpiTodayOrders").textContent=Number(todayOrders.length||0).toLocaleString();
    $("gzKpiRevenue30").textContent=money(revenue30);
    $("gzKpiAov").textContent=money(avgOrder);
    $("gzKpiCustomers").textContent=Number(uniqueCustomers||0).toLocaleString();
    $("gzKpiRepeat").textContent=Number(repeatCustomers||0).toLocaleString();

    $("gzStatusBars").innerHTML=statusList.map(s=>{
      const n=Number(statusCounts[s]||0);
      return "<div class='gz-status-row'><div><b>"+esc(s)+"</b><span>"+n+"</span></div><div class='gz-bar'><i style='width:"+Math.round(n/maxStatus*100)+"%'></i></div></div>";
    }).join("");

    const maxRev=Math.max(1,...trend.map(x=>Number(x.revenue||0)));
    $("gzTrend").innerHTML=trend.map(x=>{
      const label=new Date(x.date+"T00:00:00Z").toLocaleDateString("en-US",{month:"short",day:"numeric",timeZone:"UTC"});
      return "<div class='gz-trend-row'><div class='gz-trend-label'><b>"+label+"</b><span>"+Number(x.orders||0)+" orders</span></div><div class='gz-bar'><i style='width:"+Math.round(Number(x.revenue||0)/maxRev*100)+"%'></i></div><strong>"+money(x.revenue)+"</strong></div>";
    }).join("")||"<div class='meta'>No order data yet.</div>";

    const maxP=Math.max(1,...topProducts.map(x=>Number(x.units||0)));
    $("gzTopProducts").innerHTML=topProducts.map((x,i)=>"<div class='gz-rank'><span class='gz-rank-no'>"+(i+1)+"</span><div><b>"+esc(x.name||"Unknown product")+"</b><small>"+Number(x.units||0)+" units sold · "+Number(x.orders||0)+" order lines</small></div><strong>"+Number(x.units||0).toLocaleString()+" sold</strong><div class='gz-mini-bar'><i style='width:"+Math.round(Number(x.units||0)/maxP*100)+"%'></i></div></div>").join("")||"<div class='meta'>No product sales yet.</div>";

    const maxC=Math.max(1,...topCustomers.map(x=>Number(x.spent||0)));
    $("gzTopCustomers").innerHTML=topCustomers.map((x,i)=>"<div class='gz-rank'><span class='gz-rank-no'>"+(i+1)+"</span><div><b>"+esc(x.name||"Customer")+"</b><small>"+esc(x.phone||x.email||"")+" · "+Number(x.orders||0)+" orders</small></div><strong>"+money(x.spent)+"</strong><div class='gz-mini-bar'><i style='width:"+Math.round(Number(x.spent||0)/maxC*100)+"%'></i></div></div>").join("")||"<div class='meta'>No customers yet.</div>";

    if(msg)msg.textContent="✓ Analytics updated just now.";
  }catch(e){
    console.error(e);
    if(msg)msg.textContent="✕ "+(e.message||"Analytics failed.");
  }
}
function showApp(){
 $("loginBox").classList.add("hidden");
 $("app").classList.remove("hidden");
 loadSettings();
 loadProducts();
 loadNotices();
 loadDashboardAnalytics();
}

document.addEventListener("grabzone:orders-updated",()=>{ if(typeof loadDashboardAnalytics==="function") loadDashboardAnalytics(); });
 
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
 if(!file.type.startsWith("image/"))throw new Error("Only image files are allowed.");
 const {data:{session},error:sessionError}=await sb.auth.getSession();
 if(sessionError)throw sessionError;
 if(!session)throw new Error("Admin session expired. Please sign in again.");
 const form=new FormData();
 form.append("file",file,file.name);
 const response=await fetch((C.backendUrl||"")+"/api/r2-upload",{method:"POST",headers:{Authorization:"Bearer "+session.access_token},body:form});
 const result=await response.json().catch(()=>({}));
 if(!response.ok)throw new Error(result.error||"Could not upload image.");
 return result.publicUrl;
}

async function uploadImages(files){
 const out=[];

 for(const f of [...files].slice(0,10)){
   out.push(await uploadImage(f))
 }

 return out
}

/* =========================
   D1 ADMIN BRIDGE
========================= */
async function gzD1(payload){
 const {data:{session},error}=await sb.auth.getSession();
 if(error)throw error;
 if(!session?.access_token)throw new Error("Admin session expired. Please sign in again.");
 const base=String(C.backendUrl||"").replace(/\\/$/,"");
 const r=await fetch(base+"/api/d1",{method:"POST",headers:{Authorization:"Bearer "+session.access_token,"Content-Type":"application/json","Cache-Control":"no-store"},body:JSON.stringify(payload)});
 const out=await r.json().catch(()=>({}));
 if(!r.ok)throw new Error(out.error||"D1 request failed.");
 return out;
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

   /*
     Preserve Phase 5 feature flags when the main Website Design
     form is saved. They live in a managed marker inside custom_css
     so no existing design settings are overwritten.
   */
   try{
     const existing=await sb.from("site_settings").select("custom_css").eq("id",1).maybeSingle();
     const marker=String(existing.data?.custom_css||"").match(/\/\*\s*GZ_PHASE5_CONFIG\s*[\s\S]*?\*\//);
     if(marker){
       const base=String(p.custom_css||"").replace(/\/\*\s*GZ_PHASE5_CONFIG\s*[\s\S]*?\*\//g,"").trim();
       p.custom_css=(base?base+"\\n\\n":"")+marker[0];
     }
   }catch(e){ console.warn("Could not preserve Phase 5 settings:",e); }

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

       flash_price:$("flashPrice").value ? Number($("flashPrice").value) : null,
       flash_starts_at:$("flashStartsAt").value ? new Date($("flashStartsAt").value).toISOString() : null,
       flash_ends_at:$("flashEndsAt").value ? new Date($("flashEndsAt").value).toISOString() : null,
       flash_enabled:!!($("flashPrice").value && $("flashEndsAt").value),

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

   ["name","category","price","oldPrice","tag","description","flashPrice","flashStartsAt","flashEndsAt"]
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

           <div class="flash-admin-box" style="grid-column:1/-1;margin-top:10px;padding:10px;border:1px solid #e7e7e2;border-radius:12px;background:#fafaf8">
           <b style="font-size:12px">⚡ Flash Sale</b>
           <div style="display:grid;grid-template-columns:1fr 1fr 1fr auto;gap:7px;margin-top:7px;align-items:end">
             <label style="font-size:10px">Sale price<input id="flash_price_'+p.id+'" type="number" min="0" value="'+(p.flash_price??'')+'" placeholder="1299" style="width:100%;box-sizing:border-box"></label>
             <label style="font-size:10px">Starts<input id="flash_start_'+p.id+'" type="datetime-local" value="'+(p.flash_starts_at?new Date(p.flash_starts_at).toISOString().slice(0,16):'')+'" style="width:100%;box-sizing:border-box"></label>
             <label style="font-size:10px">Ends<input id="flash_end_'+p.id+'" type="datetime-local" value="'+(p.flash_ends_at?new Date(p.flash_ends_at).toISOString().slice(0,16):'')+'" style="width:100%;box-sizing:border-box"></label>
             <button type="button" class="ghost" onclick="saveFlashSale(\''+p.id+'\')">Save</button>
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

async function saveFlashSale(id){
  const price=Number(document.getElementById('flash_price_'+id)?.value||0);
  const start=document.getElementById('flash_start_'+id)?.value||'';
  const end=document.getElementById('flash_end_'+id)?.value||'';
  try{
    const{error}=await sb.from('products').update({flash_price:price||null,flash_starts_at:start?new Date(start).toISOString():null,flash_ends_at:end?new Date(end).toISOString():null,flash_enabled:!!(price&&end),updated_at:new Date().toISOString()}).eq('id',id);
    if(error)throw error;$('productMsg').textContent='✓ Flash sale saved.';loadProducts();
  }catch(e){$('productMsg').textContent='✕ '+e.message}
}

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


const GZCFG_MARK='GZ_GROWTH_CONFIG',GZDROPS_MARK='GZ_DROPS_CONFIG';
async function gzSiteConfig(){const r=await sb.from('site_settings').select('custom_css').eq('id',1).maybeSingle();if(r.error)throw r.error;return String(r.data?.custom_css||'')}
function gzCfgRead(css,mark,defaults){const m=String(css||'').match(new RegExp('/\\*\\s*'+mark+'\\s*([\\s\\S]*?)\\*/'));if(!m)return {...defaults};try{return {...defaults,...JSON.parse(m[1].trim())}}catch{return {...defaults}}}
function gzCfgWrite(css,mark,obj){const re=new RegExp('\\/\\*\\s*'+mark+'\\s*[\\s\\S]*?\\*\\/','g');return String(css||'').replace(re,'').trim()+'\\n\\n/* '+mark+' '+JSON.stringify(obj)+' */\\n'}
async function gzSaveSiteConfig(mark,obj){const r=await sb.from('site_settings').update({custom_css:gzCfgWrite(await gzSiteConfig(),mark,obj),updated_at:new Date().toISOString()}).eq('id',1);if(r.error)throw r.error}
async function gzLoadGrowth(){try{const x=gzCfgRead(await gzSiteConfig(),GZCFG_MARK,{gpEnabled:1,gpEarnRate:10,gpValue:.1,mysteryEnabled:0,mysteryMin:5,mysteryMax:15});$('growthGpEnabled').value=x.gpEnabled;$('growthGpEarnRate').value=x.gpEarnRate;$('growthGpValue').value=x.gpValue;$('growthMysteryEnabled').value=x.mysteryEnabled;$('growthMysteryMin').value=x.mysteryMin;$('growthMysteryMax').value=x.mysteryMax;$('growthGpStatus').textContent=x.gpEnabled?'● ON':'○ OFF';$('growthMysteryStatus').textContent=x.mysteryEnabled?'● ON':'○ OFF'}catch(e){$('growthGpMsg').textContent='✕ '+e.message}}
async function gzSaveGrowth(){try{const x={gpEnabled:+$('growthGpEnabled').value,gpEarnRate:+$('growthGpEarnRate').value,gpValue:+$('growthGpValue').value,mysteryEnabled:+$('growthMysteryEnabled').value,mysteryMin:+$('growthMysteryMin').value,mysteryMax:+$('growthMysteryMax').value};if(x.mysteryMin>x.mysteryMax)throw Error('Minimum discount cannot exceed maximum.');await gzSaveSiteConfig(GZCFG_MARK,x);$('growthGpMsg').textContent='✓ Growth settings saved.';gzLoadGrowth()}catch(e){$('growthGpMsg').textContent='✕ '+e.message}}
async function gzSaveMystery(){try{const css=await gzSiteConfig(),o=gzCfgRead(css,GZCFG_MARK,{gpEnabled:1,gpEarnRate:10,gpValue:.1,mysteryEnabled:0,mysteryMin:5,mysteryMax:15}),x={...o,mysteryEnabled:+$('mysteryEnabled').value,mysteryMin:+$('mysteryMin').value,mysteryMax:+$('mysteryMax').value};if(x.mysteryMin>x.mysteryMax)throw Error('Minimum discount cannot exceed maximum.');await gzSaveSiteConfig(GZCFG_MARK,x);$('mysteryMsg').textContent='✓ Mystery Deal saved.'}catch(e){$('mysteryMsg').textContent='✕ '+e.message}}
async function gzFillCampaignProducts(id){const r=await sb.from('products').select('id,name,price').order('name');if(r.error)throw r.error;$(id).innerHTML='<option value="">Select a product…</option>'+(r.data||[]).map(p=>'<option value="'+esc(p.id)+'">'+esc(p.name)+' — ৳'+Number(p.price).toLocaleString()+'</option>').join('')}
async function gzLoadFlashSales(){try{await gzFillCampaignProducts('fsProduct');const r=await sb.from('products').select('id,name,price,flash_price,flash_starts_at,flash_ends_at,flash_enabled').order('name');if(r.error)throw r.error;$('flashSaleList').innerHTML=(r.data||[]).filter(p=>p.flash_enabled||p.flash_price).map(p=>'<div class="item" style="margin-top:8px"><b>'+esc(p.name)+'</b><div class="meta">Regular ৳'+Number(p.price).toLocaleString()+' · Flash ৳'+Number(p.flash_price||0).toLocaleString()+' · '+(p.flash_enabled?'Enabled':'Disabled')+' · ends '+(p.flash_ends_at?new Date(p.flash_ends_at).toLocaleString():'—')+'</div><button class="ghost" type="button" onclick="gzDisableFlashSale(\''+p.id+'\')">Disable</button></div>').join('')||'<p class="muted">No flash-sale campaigns yet.</p>'}catch(e){$('flashSaleList').textContent='✕ '+e.message}}
async function gzSaveFlashSale(){try{const id=$('fsProduct').value,price=+$('fsPrice').value,start=$('fsStart').value,end=$('fsEnd').value;if(!id||!price||!end)throw Error('Select a product, flash price and end time.');if(start&&Date.parse(start)>=Date.parse(end))throw Error('End time must be after start time.');const p=await sb.from('products').select('price').eq('id',id).single();if(p.error)throw p.error;if(price>=+p.data.price)throw Error('Flash price must be lower than regular price.');const r=await sb.from('products').update({flash_price:price,flash_starts_at:start?new Date(start).toISOString():new Date().toISOString(),flash_ends_at:new Date(end).toISOString(),flash_enabled:true,updated_at:new Date().toISOString()}).eq('id',id);if(r.error)throw r.error;$('flashSaleMsg').textContent='✓ Flash Sale activated.';gzLoadFlashSales()}catch(e){$('flashSaleMsg').textContent='✕ '+e.message}}
async function gzDisableFlashSale(id){const r=await sb.from('products').update({flash_enabled:false,updated_at:new Date().toISOString()}).eq('id',id);if(r.error)gzUiToast(r.error.message,'error');else gzLoadFlashSales()}
async function gzLoadDrops(){try{await gzFillCampaignProducts('dropProduct');const x=gzCfgRead(await gzSiteConfig(),GZDROPS_MARK,{items:[]});$('dropList').innerHTML=(x.items||[]).map((d,i)=>'<div class="item" style="margin-top:8px"><b>'+esc(d.name)+'</b><div class="meta">Starts '+new Date(d.start).toLocaleString()+' · Ends '+new Date(d.end).toLocaleString()+'</div><button class="ghost" onclick="gzDeleteDrop('+i+')">Delete</button></div>').join('')||'<p class="muted">No drops scheduled.</p>'}catch(e){$('dropList').textContent='✕ '+e.message}}
async function gzSaveDrop(){try{const id=$('dropProduct').value,start=$('dropStart').value,end=$('dropEnd').value;if(!id||!start||!end)throw Error('Select a product and start/end times.');if(Date.parse(start)>=Date.parse(end))throw Error('End time must be after start time.');const p=await sb.from('products').select('name').eq('id',id).single();if(p.error)throw p.error;const css=await gzSiteConfig(),x=gzCfgRead(css,GZDROPS_MARK,{items:[]});x.items.push({id:id,name:p.data.name,start:new Date(start).toISOString(),end:new Date(end).toISOString()});await gzSaveSiteConfig(GZDROPS_MARK,x);$('dropMsg').textContent='✓ Drop scheduled.';gzLoadDrops()}catch(e){$('dropMsg').textContent='✕ '+e.message}}
async function gzDeleteDrop(i){try{const css=await gzSiteConfig(),x=gzCfgRead(css,GZDROPS_MARK,{items:[]});x.items.splice(i,1);await gzSaveSiteConfig(GZDROPS_MARK,x);gzLoadDrops()}catch(e){gzUiToast(e.message,'error')}}
async function gzLoadLoyalty(){try{const r=await sb.from('customer_points').select('phone,points,updated_at').order('points',{ascending:false});if(r.error)throw r.error;$('loyaltyList').innerHTML=(r.data||[]).map(x=>'<div class="item" style="margin-top:8px;display:flex;justify-content:space-between"><b>'+esc(x.phone)+'</b><strong>'+Number(x.points||0).toLocaleString()+' GP</strong></div>').join('')||'<p class="muted">No GrabPoints customers yet.</p>'}catch(e){$('loyaltyList').textContent='✕ '+e.message}}

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

 if(tab === "billboards" && typeof loadBillboardManager === "function"){ loadBillboardManager(); }
 if(tab === "growth") gzLoadGrowth();
 if(tab === "flash-sales") gzLoadFlashSales();
 if(tab === "drops") gzLoadDrops();
 if(tab === "loyalty") gzLoadLoyalty();
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
