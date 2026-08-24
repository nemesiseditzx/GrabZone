/* GRABZONE ANIMATION SETTINGS LOADER — FIXED INDIVIDUAL CONTROLS */
(function(){
  const C=window.GRABZONE_CONFIG||{};
  const defaults={
    animations_enabled:true,page_load:true,scroll_reveal:true,
    product_hover:true,button_effects:true,hero_animation:true,
    floating_effects:true,notice_animation:true,animation_speed:"normal"
  };

  function injectControlStyles(){
    if(document.getElementById("gz-individual-animation-fixes")) return;
    const style=document.createElement("style");
    style.id="gz-individual-animation-fixes";
    style.textContent=`
      body.gz-no-page-load .gz-page-veil{display:none!important}
      body.gz-no-scroll-reveal .gz-reveal-target,
      body.gz-no-scroll-reveal .gz-title-reveal{
        opacity:1!important;transform:none!important;filter:none!important;clip-path:none!important;
      }
      body.gz-no-scroll-reveal .gz-title-reveal::after{transform:none!important;transition:none!important}

      body.gz-no-product-hover .product-card,
      body.gz-no-product-hover .product-card:hover{
        transform:none!important;box-shadow:none!important;
      }
      body.gz-no-product-hover .product-card::before,
      body.gz-no-product-hover .product-card::after{display:none!important;animation:none!important}
      body.gz-no-product-hover .product-card img,
      body.gz-no-product-hover .product-card:hover img{transform:none!important;filter:none!important}

      body.gz-no-button-effects .btn,
      body.gz-no-button-effects .text-link,
      body.gz-no-button-effects .chip,
      body.gz-no-button-effects .lang-btn{
        transform:none!important;box-shadow:none!important;transition:none!important;
      }
      body.gz-no-button-effects .gz-ripple{display:none!important}

      body.gz-no-hero-animation .hero-copy,
      body.gz-no-hero-animation .hero-card,
      body.gz-no-hero-animation .hero-product-shape{
        animation:none!important;transform:none!important;filter:none!important;
      }
      body.gz-no-hero-animation .hero-card::before,
      body.gz-no-hero-animation .hero-card::after,
      body.gz-no-hero-animation .hero-product-shape::before,
      body.gz-no-hero-animation .hero-product-shape::after{animation:none!important}

      body.gz-no-floating-effects .gz-particle{display:none!important}

      body.gz-no-notice-animation .notice-track,
      body.gz-no-notice-animation .notice-wrap *{
        animation:none!important;transition:none!important;
      }
      body.gz-motion-off .gz-scroll-progress{display:none!important}
    `;
    document.head.appendChild(style);
  }

  function removeParticles(){
    document.querySelectorAll(".gz-particle").forEach(x=>x.remove());
  }

  function applyIndividual(settings){
    const s=Object.assign({},defaults,settings||{});
    injectControlStyles();
    const body=document.body;

    body.classList.toggle("gz-no-page-load",s.page_load===false);
    body.classList.toggle("gz-no-scroll-reveal",s.scroll_reveal===false);
    body.classList.toggle("gz-no-product-hover",s.product_hover===false);
    body.classList.toggle("gz-no-button-effects",s.button_effects===false);
    body.classList.toggle("gz-no-hero-animation",s.hero_animation===false);
    body.classList.toggle("gz-no-floating-effects",s.floating_effects===false);
    body.classList.toggle("gz-no-notice-animation",s.notice_animation===false);

    if(s.page_load===false)
      document.querySelectorAll(".gz-page-veil").forEach(x=>x.remove());

    if(s.floating_effects===false) removeParticles();

    if(s.animations_enabled===false){
      removeParticles();
      document.querySelectorAll(".gz-page-veil,.gz-scroll-progress").forEach(x=>x.remove());
    }
  }

  async function start(){
    injectControlStyles();

    if(!window.supabase || !C.supabaseUrl || C.supabaseUrl.includes("PASTE_"))
      return;

    try{
      const sb=window.supabase.createClient(C.supabaseUrl,C.supabaseAnonKey);
      const {data}=await sb.from("site_settings").select("*").eq("id",1).maybeSingle();

      const settings=Object.assign({},defaults,data||{});
      window.GRABZONE_ANIMATIONS=settings;

      if(window.applyGrabZoneAnimations)
        window.applyGrabZoneAnimations(settings);

      /* Apply AFTER the animation engine creates its elements. */
      applyIndividual(settings);
      requestAnimationFrame(()=>applyIndividual(settings));
    }catch(e){
      window.GRABZONE_ANIMATIONS=defaults;
      applyIndividual(defaults);
    }
  }

  if(document.readyState==="loading")
    document.addEventListener("DOMContentLoaded",start);
  else
    start();
})();