/* GRABZONE ADVANCED MOTION ENGINE — CORE + PRODUCT + ADVANCED */
(function(){
  const D={
    animations_enabled:true,page_load:true,scroll_reveal:true,product_hover:true,button_effects:true,
    hero_animation:true,floating_effects:true,notice_animation:true,animation_speed:"normal",
    magnetic_cursor:true,text_reveal:true,image_parallax:true,scroll_velocity:true,product_stagger:true,
    marquee_motion:true,header_scroll:true,premium_hover_glow:true,section_transitions:true,
    product_entrance:true,product_3d_tilt:true,product_image_zoom:true,product_image_parallax:true,
    product_cursor_spotlight:true,product_shine:true,product_hover_lift:true,product_featured_glow:true
  };
  let revealObs,scrollY=0,last=0,velocity=0,raf=0;

  function S(){return Object.assign({},D,window.GRABZONE_ANIMATIONS||{})}
  function speed(v){return v==="fast"?".48s":v==="slow"?".98s":".75s"}

  function inject(){
    if(document.getElementById("gz-advanced-runtime"))return;
    const s=document.createElement("style");s.id="gz-advanced-runtime";
    s.textContent=`
      .gz-motion-off *{animation:none!important;transition:none!important}
      .gz-motion-off .gz-reveal-target{opacity:1!important;transform:none!important;filter:none!important}
      .gz-no-product-entrance .gz-reveal-target.product-card{opacity:1!important;transform:none!important;filter:none!important}
      .gz-no-product-3d .product-card:hover{transform:none!important}
      .gz-no-product-zoom .product-card img{transform:none!important}
      .gz-no-product-spotlight .product-card::before{display:none!important}
      .gz-no-product-shine .product-card::after{display:none!important}
      .gz-no-product-lift .product-card:hover{box-shadow:none!important}
      .gz-no-product-glow .product-card{box-shadow:none!important}
      .gz-no-magnetic .gz-magnetic-cursor{display:none!important}
      .gz-no-parallax [data-gz-parallax]{transform:none!important}
      .gz-header-hidden{transform:translateY(-110%)!important}
      .gz-marquee{overflow:hidden;white-space:nowrap}
      .gz-marquee-track{display:inline-flex;min-width:max-content;animation:gzMarquee 18s linear infinite}
      @keyframes gzMarquee{to{transform:translateX(-50%)}}
      .gz-velocity *{--gz-velocity:1}
      body.gz-header-ready header{transition:transform .45s cubic-bezier(.16,1,.3,1)}
      .gz-magnetic-cursor{position:fixed;z-index:9998;width:18px;height:18px;border:1px solid rgba(255,106,0,.45);border-radius:50%;pointer-events:none;transform:translate(-50%,-50%);mix-blend-mode:multiply;transition:width .2s,height .2s,opacity .2s}
      .gz-text-word{display:inline-block;opacity:0;transform:translateY(24px);filter:blur(5px)}
      .gz-text-word.gz-text-in{opacity:1;transform:none;filter:none;transition:all .65s cubic-bezier(.16,1,.3,1)}
      .gz-section-transition{will-change:transform}

      /* =====================================================
         GRABZONE MOTION SYSTEM
         Elements animate into view, but NEVER become hidden
         again after they have been revealed.
      ===================================================== */

      .gz-page-veil{
        position:fixed;
        inset:0;
        z-index:10000;
        pointer-events:none;
        background:#fff;
        animation:gzPageVeil 1s cubic-bezier(.76,0,.24,1) forwards;
      }
      @keyframes gzPageVeil{
        0%{opacity:1}
        55%{opacity:1}
        100%{opacity:0;visibility:hidden}
      }

      .gz-particle{
        position:fixed;
        z-index:0;
        width:4px;
        height:4px;
        border-radius:50%;
        background:rgba(255,106,0,.18);
        pointer-events:none;
        animation:gzFloatParticle var(--gz-particle-duration,12s) linear infinite;
      }
      @keyframes gzFloatParticle{
        0%{transform:translate3d(0,20vh,0) scale(.6);opacity:0}
        12%{opacity:.65}
        50%{transform:translate3d(var(--px),-45vh,0) scale(1);opacity:.45}
        88%{opacity:.25}
        100%{transform:translate3d(calc(var(--px) * -1),-110vh,0) scale(.3);opacity:0}
      }

      .gz-reveal-target{
        opacity:0;
        transform:translate3d(0,34px,0);
        filter:blur(4px);
        transition:
          opacity var(--gz-duration,.75s) cubic-bezier(.16,1,.3,1),
          transform var(--gz-duration,.75s) cubic-bezier(.16,1,.3,1),
          filter var(--gz-duration,.75s) cubic-bezier(.16,1,.3,1);
        transition-delay:var(--gz-delay,0ms);
      }
      .gz-reveal-target.gz-visible{
        opacity:1;
        transform:none;
        filter:none;
      }

      .product-card.gz-reveal-target{
        transform:translate3d(0,55px,0) scale(.96);
      }
      .product-card.gz-reveal-target.gz-visible{
        transform:none;
      }

      .step.gz-reveal-target{
        transform:translate3d(0,28px,0);
      }

      .shop-section.gz-reveal-target,
      .how-section.gz-reveal-target,
      .ref-section.gz-reveal-target,
      .offer-strip.gz-reveal-target{
        transform:translate3d(0,45px,0);
      }

      .hero-copy{
        animation:gzHeroCopy .9s cubic-bezier(.16,1,.3,1) both;
      }
      .hero-card{
        animation:gzHeroCard 1s cubic-bezier(.16,1,.3,1) .08s both;
      }
      @keyframes gzHeroCopy{
        from{opacity:0;transform:translate3d(-28px,18px,0)}
        to{opacity:1;transform:none}
      }
      @keyframes gzHeroCard{
        from{opacity:0;transform:translate3d(28px,20px,0) scale(.96) rotate(1deg)}
        to{opacity:1;transform:none}
      }

      .product-card{
        position:relative;
        isolation:isolate;
        transition:
          transform .35s cubic-bezier(.16,1,.3,1),
          box-shadow .35s ease;
      }
      .product-card::before{
        content:"";
        position:absolute;
        inset:0;
        z-index:2;
        pointer-events:none;
        border-radius:inherit;
        opacity:0;
        background:radial-gradient(
          180px circle at var(--mx,50%) var(--my,50%),
          rgba(255,106,0,.12),
          transparent 65%
        );
        transition:opacity .3s ease;
      }
      .product-card:hover::before{opacity:1}
      .product-card::after{
        content:"";
        position:absolute;
        top:-30%;
        left:-65%;
        width:42%;
        height:160%;
        z-index:3;
        pointer-events:none;
        background:linear-gradient(90deg,transparent,rgba(255,255,255,.38),transparent);
        transform:rotate(18deg);
        transition:left .8s cubic-bezier(.16,1,.3,1);
      }
      .product-card:hover::after{left:125%}
      .product-card:hover{
        box-shadow:0 18px 42px rgba(0,0,0,.10);
      }
      .product-image{
        overflow:hidden;
      }
      .product-image img{
        transition:transform .65s cubic-bezier(.16,1,.3,1),filter .4s ease;
      }
      .product-card:hover .product-image img{
        transform:scale(1.06);
        filter:saturate(1.04);
      }

      .btn,
      button,
      .chip,
      .text-link,
      .header a{
        transition:
          transform .25s cubic-bezier(.16,1,.3,1),
          box-shadow .25s ease,
          background-color .2s ease,
          color .2s ease;
      }
      .btn:hover,
      button:hover{
        transform:translateY(-2px);
      }
      .btn:active,
      button:active{
        transform:translateY(1px) scale(.98);
      }

      .section-head h2,
      .how-section h2,
      .ref-section h2{
        will-change:transform;
      }

      .notice-track,
      .notice-loop{
        will-change:transform;
      }

      @media (prefers-reduced-motion:reduce){
        .gz-page-veil,
        .gz-particle,
        .hero-copy,
        .hero-card{animation:none!important}
        .gz-reveal-target{
          opacity:1!important;
          transform:none!important;
          filter:none!important;
          transition:none!important;
        }
      }
    `;
    document.head.appendChild(s)
  }

  function ui(s){
    if(s.page_load!==false&&!document.querySelector(".gz-page-veil")){
      const v=document.createElement("div");v.className="gz-page-veil";document.body.appendChild(v);setTimeout(()=>v.remove(),1100)
    }
    if(s.floating_effects!==false&&!document.querySelector(".gz-particle")){
      for(let i=0;i<12;i++){const p=document.createElement("i");p.className="gz-particle";p.style.left=Math.random()*100+"vw";p.style.bottom=(-10-Math.random()*20)+"vh";p.style.setProperty("--px",(Math.random()-.5)*180+"px");p.style.setProperty("--gz-particle-duration",8+Math.random()*10+"s");p.style.animationDuration=8+Math.random()*10+"s";p.style.animationDelay=-Math.random()*10+"s";document.body.appendChild(p)}
    }
    if(s.magnetic_cursor!==false&&!document.querySelector(".gz-magnetic-cursor")){
      const c=document.createElement("i");c.className="gz-magnetic-cursor";document.body.appendChild(c);
      addEventListener("pointermove",e=>{c.style.left=e.clientX+"px";c.style.top=e.clientY+"px"},{passive:true})
    }
  }

  function reveal(s){
    document.querySelectorAll(".shop-section,.how-section,.ref-section,.offer-strip,.product-card,.step").forEach((el,i)=>{
      if(!s.scroll_reveal){el.classList.remove("gz-reveal-target","gz-visible");return}
      el.classList.add("gz-reveal-target");
      if(el.classList.contains("product-card"))el.style.setProperty("--gz-delay",(Math.min(i,8)*65)+"ms")
    });
    if(!s.scroll_reveal){if(revealObs)revealObs.disconnect();return}
    if(revealObs)revealObs.disconnect();
    /*
      Replay the reveal every time an element enters the viewport.
      This gives the homepage a continuous motion feel when the user
      scrolls down and back up, without changing document layout.
    */
    revealObs=new IntersectionObserver(es=>es.forEach(e=>{
      if(e.isIntersecting){
        e.target.classList.add("gz-visible");
      }else{
        e.target.classList.remove("gz-visible");
      }
    }),{threshold:.08,rootMargin:"-4% 0px -4% 0px"});
    document.querySelectorAll(".gz-reveal-target").forEach(x=>revealObs.observe(x))
  }

  function products(s){
    document.body.classList.toggle("gz-no-product-entrance",!s.product_entrance);
    document.body.classList.toggle("gz-no-product-3d",!s.product_3d_tilt);
    document.body.classList.toggle("gz-no-product-zoom",!s.product_image_zoom);
    document.body.classList.toggle("gz-no-product-spotlight",!s.product_cursor_spotlight);
    document.body.classList.toggle("gz-no-product-shine",!s.product_shine);
    document.body.classList.toggle("gz-no-product-lift",!s.product_hover_lift);
    document.body.classList.toggle("gz-no-product-glow",!s.product_featured_glow);

    if(!s.product_hover)return;
    addEventListener("pointermove",e=>{
      const card=e.target.closest?.(".product-card");if(!card||innerWidth<700)return;
      const r=card.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top,px=x/r.width-.5,py=y/r.height-.5;
      card.style.setProperty("--mx",x+"px");card.style.setProperty("--my",y+"px");
      if(s.product_3d_tilt)card.style.transform=`translateY(${s.product_hover_lift?-12:0}px) rotateX(${(-py*5).toFixed(2)}deg) rotateY(${(px*6).toFixed(2)}deg)`;
    },{passive:true});
    addEventListener("pointerout",e=>{const c=e.target.closest?.(".product-card");if(c&&!c.contains(e.relatedTarget))c.style.removeProperty("transform")},{passive:true})
  }

  function advanced(s){
    document.body.classList.toggle("gz-no-magnetic",!s.magnetic_cursor);
    if(s.text_reveal){
      const splitTargets=document.querySelectorAll(".hero h1,.section-head h2,.how-section h2,.ref-section h2");

      splitTargets.forEach(el=>{
        if(!el.dataset.gzSplit){
          el.dataset.gzSplit="1";
          const text=el.textContent.trim();
          el.textContent="";
          text.split(/(\s+)/).forEach((w,i)=>{
            if(/^\s+$/.test(w)){
              el.appendChild(document.createTextNode(w));
              return;
            }
            const span=document.createElement("span");
            span.className="gz-text-word";
            span.textContent=w;
            span.style.transitionDelay=(i*55)+"ms";
            el.appendChild(span);
          });
        }
      });

      const showWords=(el,visible)=>{
        el.querySelectorAll(".gz-text-word").forEach(w=>{
          w.classList.toggle("gz-text-in",visible);
        });
      };

      const io=new IntersectionObserver(es=>es.forEach(e=>showWords(e.target,e.isIntersecting)),{
        threshold:.12,
        rootMargin:"40px 0px 40px 0px"
      });

      document.querySelectorAll("[data-gz-split]").forEach(el=>{
        io.observe(el);

        const r=el.getBoundingClientRect();
        const inView=r.bottom>0 && r.top<innerHeight;
        if(inView) showWords(el,true);
      });

      /*
        Site settings and language switching update textContent after
        the motion engine has initialized. Keep already-rendered words
        visible instead of leaving the heading permanently transparent.
      */
      const textFixer=new MutationObserver(mutations=>{
        for(const m of mutations){
          if(m.type!=="characterData" && m.type!=="childList") continue;
          const target=m.target.nodeType===1 ? m.target : m.target.parentElement;
          const host=target?.closest?.("[data-gz-split]");
          if(host){
            const r=host.getBoundingClientRect();
            if(r.bottom>0 && r.top<innerHeight) showWords(host,true);
          }
        }
      });

      document.querySelectorAll("[data-gz-split]").forEach(el=>{
        textFixer.observe(el,{subtree:true,childList:true,characterData:true});
      });

      setTimeout(()=>{
        document.querySelectorAll("[data-gz-split]").forEach(el=>{
          const r=el.getBoundingClientRect();
          if(r.bottom>0 && r.top<innerHeight) showWords(el,true);
        });
      },1200);
    }
    if(s.header_scroll){
      const h=document.querySelector("header");if(h){document.body.classList.add("gz-header-ready");addEventListener("scroll",()=>{const y=scrollY;h.classList.toggle("gz-header-hidden",y>last&&y>120);last=y},{passive:true})}
    }
    if(s.image_parallax){
      document.querySelectorAll(".hero-card img,.product-card img").forEach(img=>{img.dataset.gzParallax="1"})
      addEventListener("scroll",()=>{document.querySelectorAll("[data-gz-parallax]").forEach(img=>{const r=img.getBoundingClientRect();const d=(innerHeight/2-(r.top+r.height/2))*-.035;img.style.transform=`translateY(${d.toFixed(1)}px) scale(${s.product_image_zoom&&img.closest(".product-card:hover")?1.08:1})`})},{passive:true})
    }
    if(s.scroll_velocity){
      let prev=scrollY;addEventListener("scroll",()=>{velocity=Math.min(3,Math.abs(scrollY-prev)/16);prev=scrollY;document.documentElement.style.setProperty("--gz-velocity",velocity.toFixed(2))},{passive:true})
    }
    if(s.marquee_motion){
      document.querySelectorAll(".notice-track").forEach(x=>x.classList.add("gz-marquee"))
    }
  }

  function apply(custom){
    const s=Object.assign({},D,custom||{});window.GRABZONE_ANIMATIONS=s;
    document.documentElement.style.setProperty("--gz-duration",speed(s.animation_speed));
    document.body.classList.toggle("gz-motion-on",s.animations_enabled!==false);
    document.body.classList.toggle("gz-motion-off",s.animations_enabled===false);
    if(s.animations_enabled===false)return;
    inject();ui(s);reveal(s);products(s);advanced(s)
  }

  window.applyGrabZoneAnimations=apply;
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>apply());
  else apply();
})();