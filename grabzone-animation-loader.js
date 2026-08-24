/* GRABZONE ANIMATION SETTINGS LOADER */
(function(){
  const C=window.GRABZONE_CONFIG||{};
  const defaults={
    animations_enabled:true,page_load:true,scroll_reveal:true,
    product_hover:true,button_effects:true,hero_animation:true,
    floating_effects:true,notice_animation:true,animation_speed:"normal"
  };

  async function start(){
    if(!window.supabase || !C.supabaseUrl || C.supabaseUrl.includes("PASTE_")) return;
    try{
      const sb=window.supabase.createClient(C.supabaseUrl,C.supabaseAnonKey);
      const {data}=await sb.from("site_settings").select("*").eq("id",1).maybeSingle();
      const settings=Object.assign({},defaults,data||{});
      window.GRABZONE_ANIMATIONS=settings;
      if(window.applyGrabZoneAnimations) window.applyGrabZoneAnimations(settings);
    }catch(e){
      window.GRABZONE_ANIMATIONS=defaults;
    }
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",start);
  else start();
})();