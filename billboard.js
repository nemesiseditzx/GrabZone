/* =========================================================
   GRABZONE BILLBOARD
   Public storefront billboard carousel.
========================================================= */

let GZ_BILLBOARDS = [];
let GZ_BILLBOARD_SETTINGS = {
  autoplay: true,
  interval_ms: 5000,
  transition: "slide",
  show_arrows: true,
  show_dots: true
};
let GZ_BILLBOARD_INDEX = 0;
let GZ_BILLBOARD_TIMER = null;
let GZ_BILLBOARD_TOUCH_X = 0;

function gzBillboardEsc(value){
  return String(value ?? "").replace(/[&<>"']/g, ch => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[ch]));
}

function gzBillboardNormalizeUrl(url){
  const value = String(url || "").trim();
  if(!value) return "";
  if(/^https?:\/\//i.test(value) || value.startsWith("/") || value.startsWith("#")) return value;
  if(/^[a-z0-9_-]+\.html(?:\?|#|$)/i.test(value)) return value;
  return "https://" + value;
}

async function loadBillboards(){
  if(!sb) return;
  const [{data:slides,error:slideError},{data:settings,error:settingsError}] = await Promise.all([
    sb.from("billboards").select("*").eq("active",true).order("sort_order",{ascending:true}).order("created_at",{ascending:true}),
    sb.from("billboard_settings").select("*").eq("id",1).maybeSingle()
  ]);

  if(slideError){
    console.warn("Billboard error:", slideError.message);
    renderBillboardFallback();
    return;
  }

  if(settingsError){
    console.warn("Billboard settings error:", settingsError.message);
  } else if(settings){
    GZ_BILLBOARD_SETTINGS = {
      ...GZ_BILLBOARD_SETTINGS,
      ...settings
    };
  }

  GZ_BILLBOARDS = Array.isArray(slides) ? slides : [];
  GZ_BILLBOARD_INDEX = Math.min(GZ_BILLBOARD_INDEX, Math.max(0,GZ_BILLBOARDS.length-1));
  renderBillboard();
}

function renderBillboardFallback(){
  const root=document.getElementById("billboard");
  if(!root) return;
  root.innerHTML = `
    <div class="gz-billboard-empty">
      <span>GRABZONE</span>
      <strong>Fresh deals are coming.</strong>
    </div>
  `;
  root.classList.add("is-empty");
}

function renderBillboard(){
  const root=document.getElementById("billboard");
  if(!root) return;

  clearBillboardTimer();

  if(!GZ_BILLBOARDS.length){
    renderBillboardFallback();
    return;
  }

  root.classList.remove("is-empty");
  root.innerHTML = `
    <div class="gz-billboard-viewport" aria-live="polite">
      <div class="gz-billboard-track"></div>
      <button class="gz-billboard-arrow gz-billboard-prev" type="button" aria-label="Previous deal">‹</button>
      <button class="gz-billboard-arrow gz-billboard-next" type="button" aria-label="Next deal">›</button>
      <div class="gz-billboard-dots" aria-label="Billboard slides"></div>
    </div>
  `;

  const track=root.querySelector(".gz-billboard-track");
  const dots=root.querySelector(".gz-billboard-dots");

  GZ_BILLBOARDS.forEach((item,i)=>{
    const link=gzBillboardNormalizeUrl(item.link_url);
    const card=document.createElement(link ? "a" : "div");
    card.className="gz-billboard-slide";
    card.dataset.index=String(i);
    if(link){
      card.href=link;
      if(/^https?:\/\//i.test(link)) {
        card.target="_blank";
        card.rel="noopener";
      }
      card.setAttribute("aria-label", item.title || "View deal");
    }
    card.innerHTML=`
      <img src="${gzBillboardEsc(item.image_url)}" alt="${gzBillboardEsc(item.title || "GrabZone deal")}" loading="${i===0?"eager":"lazy"}">
      <div class="gz-billboard-overlay">
        <div class="gz-billboard-copy">
          ${item.eyebrow ? `<span>${gzBillboardEsc(item.eyebrow)}</span>` : ""}
          ${item.title ? `<strong>${gzBillboardEsc(item.title)}</strong>` : ""}
          ${item.message ? `<p>${gzBillboardEsc(item.message)}</p>` : ""}
          ${item.button_text ? `<b>${gzBillboardEsc(item.button_text)} <i>→</i></b>` : ""}
        </div>
      </div>
    `;
    track.appendChild(card);

    const dot=document.createElement("button");
    dot.type="button";
    dot.className="gz-billboard-dot";
    dot.dataset.index=String(i);
    dot.setAttribute("aria-label", "Show slide "+(i+1));
    dots.appendChild(dot);
  });

  root.querySelector(".gz-billboard-prev").hidden = !(GZ_BILLBOARD_SETTINGS.show_arrows !== false && GZ_BILLBOARDS.length>1);
  root.querySelector(".gz-billboard-next").hidden = !(GZ_BILLBOARD_SETTINGS.show_arrows !== false && GZ_BILLBOARDS.length>1);
  dots.hidden = !(GZ_BILLBOARD_SETTINGS.show_dots !== false && GZ_BILLBOARDS.length>1);

  root.querySelector(".gz-billboard-prev").addEventListener("click",()=>changeBillboard(-1));
  root.querySelector(".gz-billboard-next").addEventListener("click",()=>changeBillboard(1));
  dots.addEventListener("click",e=>{
    const dot=e.target.closest(".gz-billboard-dot");
    if(dot) setBillboard(Number(dot.dataset.index), true);
  });

  const viewport=root.querySelector(".gz-billboard-viewport");
  viewport.addEventListener("touchstart",e=>{ GZ_BILLBOARD_TOUCH_X=e.changedTouches[0].clientX; },{passive:true});
  viewport.addEventListener("touchend",e=>{
    const dx=e.changedTouches[0].clientX-GZ_BILLBOARD_TOUCH_X;
    if(Math.abs(dx)>45) changeBillboard(dx<0?1:-1);
  },{passive:true});
  viewport.addEventListener("mouseenter",clearBillboardTimer);
  viewport.addEventListener("mouseleave",startBillboardTimer);

  setBillboard(GZ_BILLBOARD_INDEX,false);
}

function setBillboard(index,userAction){
  if(!GZ_BILLBOARDS.length) return;
  GZ_BILLBOARD_INDEX=(index+GZ_BILLBOARDS.length)%GZ_BILLBOARDS.length;

  const root=document.getElementById("billboard");
  if(!root) return;

  const track=root.querySelector(".gz-billboard-track");
  const transition=String(GZ_BILLBOARD_SETTINGS.transition || "slide").toLowerCase();
  root.dataset.transition=transition;

  if(transition==="fade"){
    track.querySelectorAll(".gz-billboard-slide").forEach((el,i)=>el.classList.toggle("active",i===GZ_BILLBOARD_INDEX));
  } else {
    track.style.transform=`translate3d(-${GZ_BILLBOARD_INDEX*100}%,0,0)`;
  }

  root.querySelectorAll(".gz-billboard-dot").forEach((el,i)=>el.classList.toggle("active",i===GZ_BILLBOARD_INDEX));
  startBillboardTimer();
}

function changeBillboard(direction){
  if(GZ_BILLBOARDS.length<2) return;
  setBillboard(GZ_BILLBOARD_INDEX+direction,true);
}

function clearBillboardTimer(){
  if(GZ_BILLBOARD_TIMER){
    clearInterval(GZ_BILLBOARD_TIMER);
    GZ_BILLBOARD_TIMER=null;
  }
}

function startBillboardTimer(){
  clearBillboardTimer();
  if(GZ_BILLBOARD_SETTINGS.autoplay===false || GZ_BILLBOARDS.length<2) return;
  const interval=Math.max(2500,Number(GZ_BILLBOARD_SETTINGS.interval_ms)||5000);
  GZ_BILLBOARD_TIMER=setInterval(()=>changeBillboard(1),interval);
}

document.addEventListener("DOMContentLoaded",()=>{
  loadBillboards();
});
