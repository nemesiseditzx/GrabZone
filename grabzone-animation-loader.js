/* GRABZONE — ADVANCED SETTINGS LOADER */
(function(){
  const C=window.GRABZONE_CONFIG||{};
  const defaults={
    animations_enabled:true,page_load:true,scroll_reveal:true,product_hover:true,
    button_effects:true,hero_animation:true,floating_effects:true,notice_animation:true,
    animation_speed:"normal",magnetic_cursor:true,text_reveal:true,image_parallax:true,
    scroll_velocity:true,product_stagger:true,marquee_motion:true,header_scroll:true,
    premium_hover_glow:true,section_transitions:true,product_entrance:true,
    product_3d_tilt:true,product_image_zoom:true,product_image_parallax:true,
    product_cursor_spotlight:true,product_shine:true,product_hover_lift:true,
    product_featured_glow:true
  };
  async function start(){
    if(!window.supabase||!C.supabaseUrl||C.supabaseUrl.includes("PASTE_"))return;
    try{
      const sb=window.supabase.createClient(C.supabaseUrl,C.supabaseAnonKey);
      const {data}=await sb.from("site_settings").select("*").eq("id",1).maybeSingle();
      const s=Object.assign({},defaults,data||{});
      window.GRABZONE_ANIMATIONS=s;
      if(window.applyGrabZoneAnimations)window.applyGrabZoneAnimations(s);
    }catch(e){window.GRABZONE_ANIMATIONS=defaults}
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
})();