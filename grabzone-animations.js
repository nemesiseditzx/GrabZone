
/* =========================================================
   GRABZONE MOTION V3
   Repeatable scroll animations + cursor interactions
   ========================================================= */
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

  function getSettings(){
    return Object.assign({},defaults,window.GRABZONE_ANIMATIONS||{});
  }

  function getSpeed(v){
    return v==="slow" ? ".95s" : v==="fast" ? ".42s" : ".7s";
  }

  function setupReveal(){
    const settings=getSettings();
    if(settings.scroll_reveal===false) return;

    const targets=document.querySelectorAll(
      ".shop-section,.how-section,.ref-section,.offer-strip,.product-card,.step"
    );

    targets.forEach((el,i)=>{
      el.classList.add("gz-reveal-target");
      if(el.classList.contains("product-card")){
        el.style.setProperty("--gz-delay",(Math.min(i,8)*65)+"ms");
      }
    });

    /* IMPORTANT:
       No unobserve() here.
       The element is watched forever, so the animation
       plays again every time the customer scrolls away
       and comes back.
    */
    if("IntersectionObserver" in window){
      const observer=new IntersectionObserver(entries=>{
        entries.forEach(entry=>{
          if(entry.isIntersecting){
            entry.target.classList.add("gz-visible");
          }else{
            entry.target.classList.remove("gz-visible");
          }
        });
      },{
        threshold:.12,
        rootMargin:"-8% 0px -8% 0px"
      });

      targets.forEach(el=>observer.observe(el));
    }else{
      targets.forEach(el=>el.classList.add("gz-visible"));
    }
  }

  function setupProductTilt(){
    if(getSettings().product_hover===false) return;

    document.addEventListener("pointermove",e=>{
      const card=e.target.closest?.(".product-card");
      if(!card || window.innerWidth<800) return;

      const r=card.getBoundingClientRect();
      if(r.width===0) return;

      const x=e.clientX-r.left;
      const y=e.clientY-r.top;
      const px=x/r.width-.5;
      const py=y/r.height-.5;

      card.style.setProperty("--mx",x+"px");
      card.style.setProperty("--my",y+"px");
      card.style.setProperty("--rx",(-py*5).toFixed(2)+"deg");
      card.style.setProperty("--ry",(px*6).toFixed(2)+"deg");
    },{passive:true});

    document.addEventListener("pointerout",e=>{
      const card=e.target.closest?.(".product-card");
      if(card && !card.contains(e.relatedTarget)){
        card.style.removeProperty("--rx");
        card.style.removeProperty("--ry");
      }
    },{passive:true});
  }

  function setupMagnetic(){
    if(getSettings().button_effects===false) return;

    document.addEventListener("pointermove",e=>{
      const el=e.target.closest?.(".btn,.text-link,.chip,.lang-btn");
      if(!el || window.innerWidth<800) return;

      const r=el.getBoundingClientRect();
      const dx=(e.clientX-(r.left+r.width/2))/r.width;
      const dy=(e.clientY-(r.top+r.height/2))/r.height;

      el.style.transform=
        `translate(${(dx*4).toFixed(1)}px,${(dy*3).toFixed(1)}px)`;
    },{passive:true});

    document.addEventListener("pointerout",e=>{
      const el=e.target.closest?.(".btn,.text-link,.chip,.lang-btn");
      if(el && !el.contains(e.relatedTarget)){
        el.style.removeProperty("transform");
      }
    },{passive:true});
  }

  function setupRipple(){
    if(getSettings().button_effects===false) return;

    document.addEventListener("click",e=>{
      const el=e.target.closest?.(".btn,.chip,.lang-btn");
      if(!el) return;

      const ripple=document.createElement("span");
      ripple.className="gz-ripple";
      ripple.style.left=e.clientX+"px";
      ripple.style.top=e.clientY+"px";
      document.body.appendChild(ripple);
      setTimeout(()=>ripple.remove(),720);
    });
  }

  function setupDynamicProducts(){
    const container=document.getElementById("products");
    if(!container || !("MutationObserver" in window)) return;

    let timer;
    const observer=new MutationObserver(()=>{
      clearTimeout(timer);
      timer=setTimeout(()=>{
        const settings=getSettings();
        if(!settings.animations_enabled || settings.scroll_reveal===false) return;

        /* Re-run the observer setup for newly rendered products */
        setupReveal();
      },30);
    });

    observer.observe(container,{childList:true,subtree:true});
  }

  function apply(){
    const s=getSettings();
    const enabled=s.animations_enabled!==false;

    document.documentElement.style.setProperty(
      "--gz-speed",
      getSpeed(s.animation_speed)
    );

    document.body.classList.toggle("gz-motion-on",enabled);
    document.body.classList.toggle("gz-motion-off",!enabled);

    if(!enabled) return;

    setupReveal();
    setupProductTilt();
    setupMagnetic();
    setupRipple();
    setupDynamicProducts();
  }

  window.applyGrabZoneAnimations=function(custom){
    window.GRABZONE_ANIMATIONS=Object.assign({},defaults,custom||{});
    apply();
  };

  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",apply);
  }else{
    apply();
  }
})();
