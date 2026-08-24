
/* ===== GRABZONE FREE ANIMATION ENGINE ===== */
(function(){
  const defaults={
    animations_enabled:true,
    page_load:true,
    scroll_reveal:true,
    product_hover:true,
    button_effects:true,
    hero_animation:true,
    floating_effects:true,
    notice_animation:true,
    animation_speed:"normal"
  };

  window.GRABZONE_ANIMATIONS=Object.assign({},defaults,window.GRABZONE_ANIMATIONS||{});

  function speed(v){
    return v==="slow" ? "1s" : v==="fast" ? ".35s" : ".6s";
  }

  function applyAnimations(settings){
    const s=Object.assign({},defaults,settings||{});
    const enabled=s.animations_enabled!==false;
    document.documentElement.style.setProperty("--motion-speed",speed(s.animation_speed));
    document.body.classList.toggle("gzo-animate",enabled);
    document.body.classList.toggle("gzo-off",!enabled);

    if(s.page_load&&enabled) document.body.classList.add("gzo-page-loaded");
    if(s.floating_effects&&enabled) document.querySelector(".hero-card")?.classList.add("gzo-float");

    if(enabled&&s.scroll_reveal){
      const targets=document.querySelectorAll(".shop-section,.how-section,.ref-section,.offer-strip,.product-card,.step");
      targets.forEach(el=>el.classList.add("gzo-hidden"));
      const io=new IntersectionObserver(entries=>{
        entries.forEach(e=>{
          if(e.isIntersecting){e.target.classList.remove("gzo-hidden");e.target.classList.add("gzo-reveal");io.unobserve(e.target)}
        });
      },{threshold:.08});
      targets.forEach(el=>io.observe(el));
    }
  }

  window.applyGrabZoneAnimations=applyAnimations;
  document.addEventListener("DOMContentLoaded",()=>applyAnimations(window.GRABZONE_ANIMATIONS));
})();
