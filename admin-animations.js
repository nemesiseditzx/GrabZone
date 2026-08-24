/* GRABZONE ADMIN ANIMATION CONTROL */
(function(){
  const C=window.GRABZONE_CONFIG||{};
  if(!window.supabase || !C.supabaseUrl) return;
  const sb=window.supabase.createClient(C.supabaseUrl,C.supabaseAnonKey);
  const $=id=>document.getElementById(id);

  const defaults={
    animations_enabled:true,page_load:true,scroll_reveal:true,
    product_hover:true,button_effects:true,hero_animation:true,
    floating_effects:true,notice_animation:true,animation_speed:"normal"
  };

  function row(id,title,desc){
    return `<div class="gz-animation-row"><div><b>${title}</b><small>${desc}</small></div>
      <label class="gz-switch"><input id="${id}" type="checkbox"><span></span></label></div>`;
  }

  function inject(){
    const target=$("tab-appearance");
    if(!target || $("gzAnimationPanel")) return;
    const panel=document.createElement("div");
    panel.className="panel";
    panel.id="gzAnimationPanel";
    panel.innerHTML=`
      <div class="panel-head">
        <div><h2>🎬 Animation Control Center</h2>
        <p>Control the storefront motion without touching code.</p></div>
        <span id="gzAnimationStatus" class="gz-animation-status">Loading…</span>
      </div>

      <div class="gz-animation-master">
        <div><b>Master Animations</b><small>Turn every animation on or off.</small></div>
        <label class="gz-switch"><input id="gz_animations_enabled" type="checkbox"><span></span></label>
      </div>

      <div class="gz-animation-grid">
        ${row("gz_page_load","Page Load","Cinematic entrance when the website opens.")}
        ${row("gz_scroll_reveal","Scroll Reveal","Sections animate again when they enter the screen.")}
        ${row("gz_product_hover","Product Hover","3D tilt, spotlight and image zoom.")}
        ${row("gz_button_effects","Buttons & Clicks","Magnetic buttons and click ripple.")}
        ${row("gz_hero_animation","Hero Motion","Hero entrance and scroll parallax.")}
        ${row("gz_floating_effects","Floating Effects","Ambient particles and floating visuals.")}
        ${row("gz_notice_animation","Notice Animation","Motion effects around notices/offers.")}
      </div>

      <div class="gz-animation-speed">
        <div><b>Animation Speed</b><small>Overall timing for motion effects.</small></div>
        <select id="gz_animation_speed">
          <option value="fast">⚡ Fast</option>
          <option value="normal">◉ Normal</option>
          <option value="slow">🐢 Slow</option>
        </select>
      </div>

      <div class="gz-animation-actions">
        <button id="gzSaveAnimations" class="primary">Save Animation Settings</button>
        <span id="gzAnimationMsg" class="save-message"></span>
      </div>`;
    target.appendChild(panel);

    $("gzSaveAnimations").onclick=save;
    $("gz_animations_enabled").onchange=syncMaster;
    [
      "gz_page_load","gz_scroll_reveal","gz_product_hover","gz_button_effects",
      "gz_hero_animation","gz_floating_effects","gz_notice_animation"
    ].forEach(id=>$(id).onchange=updateStatus);

    load();
  }

  function set(id,value){ const e=$(id); if(e) e.checked=value!==false; }
  function load(){
    sb.from("site_settings").select("*").eq("id",1).maybeSingle().then(({data,error})=>{
      if(error){ $("gzAnimationMsg").textContent="✕ "+error.message; return; }
      const s=Object.assign({},defaults,data||{});
      set("gz_animations_enabled",s.animations_enabled);
      set("gz_page_load",s.page_load);
      set("gz_scroll_reveal",s.scroll_reveal);
      set("gz_product_hover",s.product_hover);
      set("gz_button_effects",s.button_effects);
      set("gz_hero_animation",s.hero_animation);
      set("gz_floating_effects",s.floating_effects);
      set("gz_notice_animation",s.notice_animation);
      $("gz_animation_speed").value=s.animation_speed||"normal";
      syncMaster();
    });
  }

  function syncMaster(){
    const master=$("gz_animations_enabled")?.checked!==false;
    document.querySelectorAll("#gzAnimationPanel .gz-animation-row input").forEach(e=>e.disabled=!master);
    updateStatus();
  }

  function updateStatus(){
    const on=$("gz_animations_enabled")?.checked!==false;
    const s=$("gzAnimationStatus");
    if(s){s.textContent=on?"● Animations ON":"● Animations OFF";s.classList.toggle("off",!on);}
  }

  async function save(){
    const p={
      animations_enabled:$("gz_animations_enabled").checked,
      page_load:$("gz_page_load").checked,
      scroll_reveal:$("gz_scroll_reveal").checked,
      product_hover:$("gz_product_hover").checked,
      button_effects:$("gz_button_effects").checked,
      hero_animation:$("gz_hero_animation").checked,
      floating_effects:$("gz_floating_effects").checked,
      notice_animation:$("gz_notice_animation").checked,
      animation_speed:$("gz_animation_speed").value,
      updated_at:new Date().toISOString()
    };
    const msg=$("gzAnimationMsg");
    msg.textContent="Saving…";
    const {error}=await sb.from("site_settings").upsert({id:1,...p},{onConflict:"id"});
    if(error){msg.textContent="✕ "+error.message;return;}
    msg.textContent="✓ Saved. Refresh the storefront.";
    if(window.applyGrabZoneAnimations) window.applyGrabZoneAnimations(p);
  }

  function start(){
    inject();
    setTimeout(inject,500);
    setTimeout(inject,1500);
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",start);
  else start();

  const style=document.createElement("style");
  style.textContent=`
    #gzAnimationPanel{border:1px solid #e7e7e7;background:linear-gradient(180deg,#fff,#fafafa)}
    #gzAnimationPanel .panel-head{display:flex;justify-content:space-between;align-items:flex-start;gap:20px}
    .gz-animation-status{font-size:12px;font-weight:800;color:#15803d;background:#ecfdf3;border:1px solid #bbf7d0;border-radius:999px;padding:7px 11px}
    .gz-animation-status.off{color:#b91c1c;background:#fef2f2;border-color:#fecaca}
    .gz-animation-master,.gz-animation-row,.gz-animation-speed{display:flex;justify-content:space-between;align-items:center;gap:20px;border:1px solid #ececec;border-radius:14px;padding:15px 16px;background:#fff}
    .gz-animation-master{margin:18px 0}
    .gz-animation-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
    .gz-animation-row small,.gz-animation-master small,.gz-animation-speed small{display:block;color:#777;margin-top:4px;font-size:12px}
    .gz-switch{position:relative;display:inline-flex;flex:none}
    .gz-switch input{position:absolute;opacity:0}
    .gz-switch span{width:46px;height:26px;border-radius:99px;background:#d1d5db;display:block;cursor:pointer;transition:.2s}
    .gz-switch span:after{content:"";position:absolute;width:20px;height:20px;left:3px;top:3px;border-radius:50%;background:#fff;box-shadow:0 1px 4px #0002;transition:.2s}
    .gz-switch input:checked+span{background:#111}
    .gz-switch input:checked+span:after{transform:translateX(20px)}
    .gz-switch input:disabled+span{opacity:.45;cursor:not-allowed}
    .gz-animation-speed{margin-top:12px}
    .gz-animation-speed select{min-width:150px}
    .gz-animation-actions{display:flex;align-items:center;gap:14px;margin-top:16px}
    @media(max-width:800px){.gz-animation-grid{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);
})();