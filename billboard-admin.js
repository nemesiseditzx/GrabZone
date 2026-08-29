/* =========================================================
   BILLBOARD MANAGER
========================================================= */

let gzBillboardEditingId = null;
let gzBillboardAdminItems = [];

function gzBEsc(value){
  return String(value ?? "").replace(/[&<>"']/g,ch=>({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[ch]));
}

async function gzLoadBillboardProducts(){
  const select=document.getElementById("bbProduct");
  if(!select || !sb) return;
  const {data,error}=await sb.from("products").select("id,name,published").order("name");
  if(error) return;
  select.innerHTML='<option value="">— No product shortcut —</option>'+(data||[]).map(p=>
    `<option value="${gzBEsc(p.id)}">${gzBEsc(p.name)}${p.published?"":" (hidden)"}</option>`
  ).join("");
}

function gzBillboardProductChanged(){
  const select=document.getElementById("bbProduct");
  const link=document.getElementById("bbLink");
  if(!select||!link) return;
  if(select.value){
    link.value="product.html?id="+select.value;
  }
}

function gzResetBillboardForm(){
  gzBillboardEditingId=null;
  const form=document.getElementById("billboardForm");
  if(!form)return;
  form.reset();
  document.getElementById("bbActive").value="true";
  document.getElementById("bbButton").value="Shop Now →";
  document.getElementById("bbOrder").value="0";
  document.getElementById("billboardFormTitle").textContent="Add billboard";
  document.getElementById("billboardSaveBtn").textContent="Add Billboard";
  document.getElementById("billboardCancelBtn").hidden=true;
  document.getElementById("billboardMsg").textContent="";
}

function gzEditBillboardById(id){
  const item=gzBillboardAdminItems.find(x=>x.id===id);
  if(item) gzEditBillboard(item);
}

function gzEditBillboard(item){
  gzBillboardEditingId=item.id;
  document.getElementById("bbTitle").value=item.title||"";
  document.getElementById("bbEyebrow").value=item.eyebrow||"";
  document.getElementById("bbMessage").value=item.message||"";
  document.getElementById("bbButton").value=item.button_text||"";
  document.getElementById("bbLink").value=item.link_url||"";
  document.getElementById("bbActive").value=String(item.active!==false);
  document.getElementById("bbOrder").value=item.sort_order??0;
  document.getElementById("billboardFormTitle").textContent="Edit billboard";
  document.getElementById("billboardSaveBtn").textContent="Save Changes";
  document.getElementById("billboardCancelBtn").hidden=false;
  document.getElementById("billboardMsg").textContent="";
  document.getElementById("billboardForm").scrollIntoView({behavior:"smooth",block:"start"});
}

async function gzSaveBillboard(){
  const msg=document.getElementById("billboardMsg");
  try{
    const file=document.getElementById("bbImage").files?.[0];
    const title=document.getElementById("bbTitle").value.trim();
    if(!title && !file && !gzBillboardEditingId){
      msg.textContent="Add a title or image.";
      return;
    }

    let imageUrl=document.getElementById("bbImageUrl").value.trim();
    if(file) imageUrl=await uploadImage(file);

    const payload={
      title,
      eyebrow:document.getElementById("bbEyebrow").value.trim(),
      message:document.getElementById("bbMessage").value.trim(),
      button_text:document.getElementById("bbButton").value.trim(),
      link_url:document.getElementById("bbLink").value.trim(),
      active:document.getElementById("bbActive").value==="true",
      sort_order:Number(document.getElementById("bbOrder").value||0),
      updated_at:new Date().toISOString()
    };

    if(imageUrl) payload.image_url=imageUrl;
    if(!gzBillboardEditingId && !payload.image_url){
      msg.textContent="Choose a billboard image.";
      return;
    }

    const q=gzBillboardEditingId
      ? sb.from("billboards").update(payload).eq("id",gzBillboardEditingId)
      : sb.from("billboards").insert(payload);

    const {error}=await q;
    if(error) throw error;

    msg.textContent="✓ Billboard saved.";
    gzResetBillboardForm();
    await gzLoadBillboardsAdmin();
  }catch(e){
    msg.textContent="✕ "+e.message;
  }
}

async function gzToggleBillboard(id,active){
  const {error}=await sb.from("billboards").update({active:!active,updated_at:new Date().toISOString()}).eq("id",id);
  if(error) alert(error.message);
  await gzLoadBillboardsAdmin();
}

async function gzDeleteBillboard(id){
  if(!confirm("Delete this billboard?")) return;
  const {error}=await sb.from("billboards").delete().eq("id",id);
  if(error) return alert(error.message);
  await gzLoadBillboardsAdmin();
}

async function gzLoadBillboardsAdmin(){
  const box=document.getElementById("billboardList");
  if(!box || !sb) return;

  const [{data,error},{data:settings}] = await Promise.all([
    sb.from("billboards").select("*").order("sort_order",{ascending:true}).order("created_at",{ascending:true}),
    sb.from("billboard_settings").select("*").eq("id",1).maybeSingle()
  ]);

  if(error){
    box.innerHTML='<div class="empty">'+gzBEsc(error.message)+'</div>';
    return;
  }

  if(settings){
    document.getElementById("bbAutoplay").value=String(settings.autoplay!==false);
    document.getElementById("bbInterval").value=Math.round((Number(settings.interval_ms)||5000)/1000);
    document.getElementById("bbTransition").value=settings.transition||"slide";
    document.getElementById("bbArrows").value=String(settings.show_arrows!==false);
    document.getElementById("bbDots").value=String(settings.show_dots!==false);
  }

  gzBillboardAdminItems=data||[];

  box.innerHTML=gzBillboardAdminItems.map(item=>`
    <div class="gz-bb-row">
      <div class="gz-bb-thumb"><img src="${gzBEsc(item.image_url)}" alt=""></div>
      <div class="gz-bb-info">
        <b>${gzBEsc(item.title||"Untitled")}</b>
        <span>${gzBEsc(item.eyebrow||"")}${item.link_url?" · Clickable":""}</span>
        <small>Order ${Number(item.sort_order)||0} · ${item.active?"Live":"Hidden"}</small>
      </div>
      <div class="gz-bb-actions">
        <button class="ghost" type="button" onclick="gzEditBillboardById('${gzBEsc(item.id)}')">Edit</button>
        <button class="ghost" type="button" onclick="gzToggleBillboard('${gzBEsc(item.id)}',${item.active})">${item.active?"Hide":"Show"}</button>
        <button class="ghost danger" type="button" onclick="gzDeleteBillboard('${gzBEsc(item.id)}')">Delete</button>
      </div>
    </div>
  `).join("") || '<div class="empty">No billboards yet. Add your first deal above.</div>';
}

async function gzSaveBillboardSettings(){
  const msg=document.getElementById("billboardSettingsMsg");
  const payload={
    id:1,
    autoplay:document.getElementById("bbAutoplay").value==="true",
    interval_ms:Math.max(2500,Number(document.getElementById("bbInterval").value||5)*1000),
    transition:document.getElementById("bbTransition").value,
    show_arrows:document.getElementById("bbArrows").value==="true",
    show_dots:document.getElementById("bbDots").value==="true",
    updated_at:new Date().toISOString()
  };
  const {error}=await sb.from("billboard_settings").upsert(payload,{onConflict:"id"});
  if(error){msg.textContent="✕ "+error.message;return;}
  msg.textContent="✓ Billboard settings saved.";
}

async function loadBillboardManager(){
  await gzLoadBillboardProducts();
  await gzLoadBillboardsAdmin();
  if(!gzBillboardEditingId) gzResetBillboardForm();
}
