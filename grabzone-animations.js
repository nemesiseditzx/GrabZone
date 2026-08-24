
/* =========================================================
   GRABZONE ADVANCED MOTION V4 ENGINE
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

  let revealObserver=null;
  let initialized=false;

  function getSettings(){
    return Object.assign({},defaults,window.GRABZONE_ANIMATIONS||{});
  }

  function speed(v){
    return v==="slow" ? ".98s" : v==="fast" ? ".48s" : ".85s";
  }

  function createUI(){
    if(!document.querySelector(".gz-scroll-progress")){
      const bar=document.createElement("div");
      bar.className="gz-scroll-progress";
      bar.innerHTML="<i></i>";
      document.body.appendChild(bar);
    }

    if(!document.querySelector(".gz-page-veil")){
      const veil=document.createElement("div");
      veil.className="gz-page-veil";
      document.body.appendChild(veil);
      setTimeout(()=>veil.remove(),1200);
    }

    if(!document.querySelector(".gz-particle")){
      for(let i=0;i<12;i++){
        const p=document.createElement("span");
        p.className="gz-particle";
        p.style.left=(Math.random()*100)+"vw";
        p.style.bottom=(-10-Math.random()*20)+"vh";
        p.style.setProperty("--px",((Math.random()-.5)*180)+"px");
        p.style.animationDuration=(8+Math.random()*10)+"s";
        p.style.animationDelay=(-Math.random()*10)+"s";
        document.body.appendChild(p);
      }
    }
  }

  function scrollProgress(){
    const h=document.documentElement.scrollHeight-window.innerHeight;
    const value=h>0 ? Math.min(1,Math.max(0,window.scrollY/h)) : 0;
    document.documentElement.style.setProperty("--gz-scroll",value.toFixed(4));
  }

  function cursor(){
    if(window.matchMedia("(pointer:fine)").matches){
      window.addEventListener("pointermove",e=>{
        document.documentElement.style.setProperty("--gz-cursor-x",e.clientX+"px");
        document.documentElement.style.setProperty("--gz-cursor-y",e.clientY+"px");
      },{passive:true});
    }
  }

  function addTargets(){
    const list=document.querySelectorAll(
      ".shop-section,.how-section,.ref-section,.offer-strip,.product-card,.step"
    );

    list.forEach((el,i)=>{
      el.classList.add("gz-reveal-target");
      if(el.classList.contains("product-card")){
        el.style.setProperty("--gz-delay",(Math.min(i,8)*65)+"ms");
      }
    });

    /* Add title reveal to major headings once */
    document.querySelectorAll(".section-head h2,.how-section h2,.ref-section h2")
      .forEach(el=>el.classList.add("gz-title-reveal"));
  }

  function reveal(){
    const s=getSettings();
    if(s.scroll_reveal===false) return;

    addTargets();

    if(revealObserver) revealObserver.disconnect();

    if(!("IntersectionObserver" in window)){
      document.querySelectorAll(".gz-reveal-target").forEach(el=>el.classList.add("gz-visible"));
      return;
    }

    revealObserver=new IntersectionObserver(entries=>{
      entries.forEach(entry=>{
        if(entry.isIntersecting){
          entry.target.classList.add("gz-visible");
        }else{
          /* Reset when it leaves viewport — animation can replay */
          entry.target.classList.remove("gz-visible");
        }
      });
    },{
      threshold:.12,
      rootMargin:"-8% 0px -8% 0px"
    });

    document.querySelectorAll(".gz-reveal-target").forEach(el=>revealObserver.observe(el));
  }

  function heroParallax(){
    const s=getSettings();
    if(s.hero_animation===false) return;

    const hero=document.querySelector(".hero");
    const copy=document.querySelector(".hero-copy");
    const card=document.querySelector(".hero-card");
    if(!hero) return;

    window.addEventListener("scroll",()=>{
      const y=Math.min(window.scrollY,500);
      if(copy) copy.style.transform=`translate3d(0,${y*.035}px,0)`;
      if(card) card.style.transform=`translate3d(0,${y*.07}px,0)`;
    },{passive:true});
  }

  function productTilt(){
    const s=getSettings();
    if(s.product_hover===false) return;

    document.addEventListener("pointermove",e=>{
      const card=e.target.closest?.(".product-card");
      if(!card || innerWidth<800) return;

      const r=card.getBoundingClientRect();
      if(!r.width) return;

      const x=e.clientX-r.left;
      const y=e.clientY-r.top;
      const px=x/r.width-.5;
      const py=y/r.height-.5;

      card.style.setProperty("--mx",x+"px");
      card.style.setProperty("--my",y+"px");
      card.style.transform=
        `translateY(-12px) rotateX(${(-py*5).toFixed(2)}deg) rotateY(${(px*6).toFixed(2)}deg)`;
    },{passive:true});

    document.addEventListener("pointerout",e=>{
      const card=e.target.closest?.(".product-card");
      if(card && !card.contains(e.relatedTarget)){
        card.style.removeProperty("transform");
      }
    },{passive:true});
  }

  function magnetic(){
    if(getSettings().button_effects===false) return;

    document.addEventListener("pointermove",e=>{
      const el=e.target.closest?.(".btn,.text-link,.chip,.lang-btn");
      if(!el || innerWidth<800) return;

      const r=el.getBoundingClientRect();
      const dx=(e.clientX-r.left-r.width/2)/r.width;
      const dy=(e.clientY-r.top-r.height/2)/r.height;

      el.style.transform=
        `translate(${(dx*5).toFixed(1)}px,${(dy*4).toFixed(1)}px)`;
    },{passive:true});

    document.addEventListener("pointerout",e=>{
      const el=e.target.closest?.(".btn,.text-link,.chip,.lang-btn");
      if(el && !el.contains(e.relatedTarget)) el.style.removeProperty("transform");
    },{passive:true});
  }

  function ripple(){
    if(getSettings().button_effects===false) return;

    document.addEventListener("click",e=>{
      const el=e.target.closest?.(".btn,.chip,.lang-btn");
      if(!el) return;

      const r=document.createElement("span");
      r.className="gz-ripple";
      r.style.left=e.clientX+"px";
      r.style.top=e.clientY+"px";
      document.body.appendChild(r);
      setTimeout(()=>r.remove(),720);
    });
  }

  function dynamicProducts(){
    const box=document.getElementById("products");
    if(!box || !("MutationObserver" in window)) return;

    let timer;
    new MutationObserver(()=>{
      clearTimeout(timer);
      timer=setTimeout(()=>{
        if(getSettings().animations_enabled!==false) reveal();
      },80);
    }).observe(box,{childList:true,subtree:true});
  }

  function apply(){
    const s=getSettings();
    const on=s.animations_enabled!==false;

    document.documentElement.style.setProperty("--gz-duration",speed(s.animation_speed));
    document.body.classList.toggle("gz-motion-on",on);
    document.body.classList.toggle("gz-motion-off",!on);

    if(!on){
      if(revealObserver) revealObserver.disconnect();
      document.querySelectorAll(".gz-reveal-target").forEach(el=>el.classList.add("gz-visible"));
      return;
    }

    createUI();
    reveal();
    cursor();
    productTilt();
    magnetic();
    ripple();
    heroParallax();
    dynamicProducts();
    window.addEventListener("scroll",scrollProgress,{passive:true});
    scrollProgress();
    initialized=true;
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
