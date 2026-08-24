
/* =========================================================
   GRABZONE — UNIQUE MOTION ENGINE v2
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

  function settings(){
    return Object.assign({},defaults,window.GRABZONE_ANIMATIONS||{});
  }

  function speed(v){
    return v==="slow" ? ".95s" : v==="fast" ? ".42s" : ".72s";
  }

  function init(){
    const s=settings();
    const on=s.animations_enabled!==false;
    const root=document.documentElement;
    root.style.setProperty("--gz-motion",speed(s.animation_speed));

    document.body.classList.toggle("gz-motion-on",on);
    document.body.classList.toggle("gz-motion-off",!on);

    if(!on) return;

    /* Reveal sections and cards as they enter viewport */
    if(s.scroll_reveal!==false && "IntersectionObserver" in window){
      const targets=document.querySelectorAll(
        ".shop-section,.how-section,.ref-section,.offer-strip,.product-card,.step"
      );

      targets.forEach((el,i)=>{
        el.classList.add("gz-reveal-target");
        if(el.classList.contains("product-card")){
          el.style.setProperty("--gz-delay",(Math.min(i,7)*55)+"ms");
        }
      });

      const observer=new IntersectionObserver(entries=>{
        entries.forEach(entry=>{
          if(entry.isIntersecting){
            entry.target.classList.add("gz-visible");
            observer.unobserve(entry.target);
          }
        });
      },{threshold:.08,rootMargin:"0px 0px -35px 0px"});

      targets.forEach(el=>observer.observe(el));
    }else{
      document.querySelectorAll(".gz-reveal-target").forEach(el=>el.classList.add("gz-visible"));
    }

    /* Product 3D tilt + moving spotlight */
    if(s.product_hover!==false){
      document.addEventListener("pointermove",e=>{
        const card=e.target.closest?.(".product-card");
        if(!card) return;

        const r=card.getBoundingClientRect();
        const x=e.clientX-r.left;
        const y=e.clientY-r.top;
        const px=x/r.width-.5;
        const py=y/r.height-.5;

        card.style.setProperty("--mx",x+"px");
        card.style.setProperty("--my",y+"px");
        card.style.setProperty("--gy",(px*4).toFixed(2)+"deg");
        card.style.transform=
          `translateY(-10px) rotateX(${(-py*3).toFixed(2)}deg) rotateY(${(px*4).toFixed(2)}deg)`;
      },{passive:true});

      document.addEventListener("pointerout",e=>{
        const card=e.target.closest?.(".product-card");
        if(card && !card.contains(e.relatedTarget)){
          card.style.removeProperty("transform");
        }
      },{passive:true});
    }

    /* Subtle magnetic buttons */
    if(s.button_effects!==false){
      document.addEventListener("pointermove",e=>{
        const el=e.target.closest?.(".btn,.text-link,.chip");
        if(!el || window.innerWidth<700) return;

        const r=el.getBoundingClientRect();
        const dx=(e.clientX-(r.left+r.width/2))/r.width;
        const dy=(e.clientY-(r.top+r.height/2))/r.height;

        el.style.transform=
          `translate(${(dx*5).toFixed(1)}px,${(dy*4).toFixed(1)}px)`;
      },{passive:true});

      document.addEventListener("pointerout",e=>{
        const el=e.target.closest?.(".btn,.text-link,.chip");
        if(el && !el.contains(e.relatedTarget)){
          el.style.removeProperty("transform");
        }
      },{passive:true});
    }

    /* Click ripple */
    document.addEventListener("click",e=>{
      const target=e.target.closest?.(".btn,.chip,.lang-btn");
      if(!target) return;

      const ripple=document.createElement("span");
      ripple.className="gz-ripple";
      ripple.style.left=e.clientX+"px";
      ripple.style.top=e.clientY+"px";
      document.body.appendChild(ripple);
      setTimeout(()=>ripple.remove(),700);
    });

    /* Refresh effects when product list is rendered dynamically */
    const products=document.getElementById("products");
    if(products && "MutationObserver" in window){
      const mo=new MutationObserver(()=>{
        document.querySelectorAll(".product-card").forEach((el,i)=>{
          if(!el.classList.contains("gz-reveal-target")){
            el.classList.add("gz-reveal-target");
            el.style.setProperty("--gz-delay",(Math.min(i,7)*55)+"ms");
            requestAnimationFrame(()=>el.classList.add("gz-visible"));
          }
        });
      });
      mo.observe(products,{childList:true});
    }
  }

  window.applyGrabZoneAnimations=function(custom){
    window.GRABZONE_ANIMATIONS=Object.assign({},defaults,custom||{});
    document.querySelectorAll(".gz-reveal-target").forEach(el=>{
      el.classList.remove("gz-visible","gz-reveal-target");
      el.style.removeProperty("--gz-delay");
    });
    init();
  };

  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",init);
  }else{
    init();
  }
})();
