/* GRABZONE — ADVANCED ANIMATION CONTROL CENTER */
(function(){
  const C=window.GRABZONE_CONFIG||{};
  if(!window.supabase||!C.supabaseUrl)return;
  const sb=window.supabase.createClient(C.supabaseUrl,C.supabaseAnonKey),$=id=>document.getElementById(id);

  const defaults={
    animations_enabled:true,page_load:true,scroll_reveal:true,product_hover:true,
    button_effects:true,hero_animation:true,floating_effects:true,notice_animation:true,
    animation_speed:"normal",
    magnetic_cursor:true,text_reveal:true,image_parallax:true,scroll_velocity:true,
    product_stagger:true,marquee_motion:true,header_scroll:true,premium_hover_glow:true,
    section_transitions:true,
    product_entrance:true,product_3d_tilt:true,product_image_zoom:true,
    product_image_parallax:true,product_cursor_spotlight:true,product_shine:true,
    product_hover_lift:true,product_featured_glow:true
  };

  const groups={
    core:[
      ["page_load","Page Load","Cinematic entrance when the website opens."],
      ["scroll_reveal","Scroll Reveal","Sections animate every time they enter the screen."],
      ["product_hover","Product Hover / 3D","Master switch for product interactions."],
      ["button_effects","Buttons & Clicks","Magnetic buttons and click feedback."],
      ["hero_animation","Hero Motion","Hero entrance, depth and parallax."],
      ["floating_effects","Floating Effects","Ambient particles and floating visuals."],
      ["notice_animation","Notice Animation","Notice and offer motion."]
    ],
    advanced:[
      ["magnetic_cursor","Magnetic Cursor","Cursor-follow interaction and ambient light."],
      ["text_reveal","Text Reveal","Headline and section title reveal effects."],
      ["image_parallax","Image Parallax","Images move subtly with scrolling."],
      ["scroll_velocity","Scroll Velocity","Motion reacts to scrolling speed."],
      ["product_stagger","Product Stagger","Products enter in a choreographed sequence."],
      ["marquee_motion","Marquee Motion","Moving ticker/marquee effects."],
      ["header_scroll","Header Scroll Effect","Header responds to scroll direction."],
      ["premium_hover_glow","Premium Hover Glow","Extra glow and light interaction."],
      ["section_transitions","Section Transitions","Smoother section-to-section motion."]
    ],
    products:[
      ["product_entrance","Product Entrance","Blur, scale and slide entrance."],
      ["product_3d_tilt","3D Tilt","Cursor-driven product perspective."],
      ["product_image_zoom","Image Zoom","Smooth product image push-in."],
      ["product_image_parallax","Image Parallax","Product image moves independently."],
      ["product_cursor_spotlight","Cursor Spotlight","Light follows the cursor on cards."],
      ["product_shine","Shine Effect","Animated reflection sweep."],
      ["product_hover_lift","Hover Lift","Premium lift and shadow."],
      ["product_featured_glow","Featured Glow","Extra glow for featured/new products."]
    ]
  };

  function row(k,t,d){
    return `<div class="gz-a-row"><div><b>${t}</b><small>${d}</small></div>
      <label class="gz-switch"><input id="gz_${k}" type="checkbox"><span></span></label></div>`;
  }
  function section(title,items){
    return `<div class="gz-a-section"><h3>${title}</h3><div class="gz-a-grid">${items.map(x=>row(...x)).join("")}</div></div>`;
  }

  function inject(){
    const target=$("tab-appearance");
    if(!target||$("gzAnimationPanel"))return;

    const p=document.createElement("div");
    p.className="panel";p.id="gzAnimationPanel";
    p.innerHTML=`
      <div class="panel-head">
        <div><h2>🎬 Animation Control Center</h2>
        <p>Fine-control every motion effect on the storefront.</p></div>
        <span id="gzAnimationStatus" class="gz-animation-status">Loading…</span>
      </div>

      <div class="gz-a-master">
        <div><b>MASTER ANIMATIONS</b><small>Turn the complete motion system on or off.</small></div>
        <label class="gz-switch"><input id="gz_animations_enabled" type="checkbox"><span></span></label>
      </div>

      ${section("Core Motion",groups.core)}
      ${section("Advanced Motion",groups.advanced)}
      ${section("🛍 Product Animations",groups.products)}

      <div class="gz-a-speed">
        <div><b>Animation Speed</b><small>Global timing.</small></div>
        <select id="gz_animation_speed">
          <option value="fast">⚡ Fast</option>
          <option value="normal">◉ Normal</option>
          <option value="slow">🐢 Slow</option>
        </select>
      </div>

      <div class="gz-a-actions">
        <button id="gzSaveAnimations" class="primary">Save Animation Settings</button>
        <span id="gzAnimationMsg" class="save-message"></span>
      </div>`;

    target.appendChild(p);
    $("gzSaveAnimations").onclick=save;
    $("gz_animations_enabled").onchange=sync;
    load();
  }

  function load(){
    sb.from("site_settings").select("*").eq("id",1).maybeSingle().then(({data,error})=>{
      if(error){$("gzAnimationMsg").textContent="✕ "+error.message;return}
      const s=Object.assign({},defaults,data||{});
      Object.keys(defaults).forEach(k=>{
        if(k==="animation_speed")$("gz_animation_speed").value=s[k]||"normal";
        else {const e=$("gz_"+k);if(e)e.checked=s[k]!==false}
      });
      sync();
    });
  }

  function sync(){
    const on=$("gz_animations_enabled")?.checked!==false;
    document.querySelectorAll("#gzAnimationPanel .gz-a-row input").forEach(e=>e.disabled=!on);
    const st=$("gzAnimationStatus");
    if(st){st.textContent=on?"● Animations ON":"● Animations OFF";st.classList.toggle("off",!on)}
  }

  async function save(){
    const p={};
    Object.keys(defaults).forEach(k=>{
      p[k]=k==="animation_speed"?$("gz_animation_speed").value:$("gz_"+k)?.checked!==false;
    });
    p.updated_at=new Date().toISOString();

    const m=$("gzAnimationMsg");m.textContent="Saving…";
    const {error}=await sb.from("site_settings").upsert({id:1,...p},{onConflict:"id"});
    if(error){m.textContent="✕ "+error.message;return}
    m.textContent="✓ Saved. Refresh the storefront.";
  }

  function start(){inject();setTimeout(inject,500);setTimeout(inject,1500)}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);
  else start();

  const st=document.createElement("style");
  st.textContent=`
    #gzAnimationPanel{border:1px solid #e7e7e7;background:linear-gradient(180deg,#fff,#fafafa)}
    #gzAnimationPanel .panel-head{display:flex;justify-content:space-between;gap:20px}
    .gz-animation-status{font-size:12px;font-weight:800;color:#15803d;background:#ecfdf3;border:1px solid #bbf7d0;border-radius:999px;padding:7px 11px}
    .gz-animation-status.off{color:#b91c1c;background:#fef2f2;border-color:#fecaca}
    .gz-a-master,.gz-a-row,.gz-a-speed{display:flex;justify-content:space-between;align-items:center;gap:20px;border:1px solid #ececec;border-radius:14px;padding:15px 16px;background:#fff}
    .gz-a-master{margin:18px 0}
    .gz-a-section{margin-top:18px}.gz-a-section h3{margin:0 0 10px}
    .gz-a-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
    .gz-a-row small,.gz-a-master small,.gz-a-speed small{display:block;color:#777;margin-top:4px;font-size:12px}
    .gz-switch{position:relative;display:inline-flex;flex:none}.gz-switch input{position:absolute;opacity:0}
    .gz-switch span{width:46px;height:26px;border-radius:99px;background:#d1d5db;display:block;cursor:pointer;transition:.2s}
    .gz-switch span:after{content:"";position:absolute;width:20px;height:20px;left:3px;top:3px;border-radius:50%;background:#fff;box-shadow:0 1px 4px #0002;transition:.2s}
    .gz-switch input:checked+span{background:#111}.gz-switch input:checked+span:after{transform:translateX(20px)}
    .gz-switch input:disabled+span{opacity:.4;cursor:not-allowed}
    .gz-a-speed{margin-top:18px}.gz-a-speed select{min-width:150px}
    .gz-a-actions{display:flex;align-items:center;gap:14px;margin-top:16px}
    @media(max-width:800px){.gz-a-grid{grid-template-columns:1fr}}
  `;
  document.head.appendChild(st);
})();
