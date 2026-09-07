window.GRABZONE_CONFIG = {
  backendUrl: "https://grabzone-marketplace-dev.nemesiseditzx984.workers.dev",
  storeName: "GRABZONE",
  tagline: "Grab What's Trending.",
  currency: "৳",
  shippingCharge: 130,
  dhakaShippingCharge: 70,
  outsideDhakaShippingCharge: 130,
  whatsapp: "https://wa.me/8801XXXXXXXXX",
  messenger: "https://m.me/yourpage",
  instagram: "https://instagram.com/yourstore"
};
(function(){
  var v='20260907-dev6';
  var p=String(location.pathname||'');
  var pl=p.toLowerCase();
  var isAdmin=pl==='/admin'||pl==='/admin/'||pl.endsWith('/admin.html');
  var isVendor=pl.endsWith('/vendor.html');
  var isCheckout=pl.endsWith('/checkout.html');
  var isTracking=pl.endsWith('/track-order.html');
  if(isAdmin){
    var nativeFetch=window.fetch.bind(window);
    window.fetch=function(input,init){
      try{
        var url=typeof input==='string'?input:(input&&input.url)||'';
        var path=String(url).split('?')[0];
        if(path.endsWith('/api/d1')){
          var h=new Headers((init&&init.headers)||(input&&input.headers)||{});
          if(!h.get('Authorization')){
            return Promise.resolve(new Response(JSON.stringify({data:null,count:0}),{status:200,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}}));
          }
        }
      }catch(e){}
      return nativeFetch(input,init);
    };
  }
  function addCss(href,attr){if(document.querySelector('link['+attr+']'))return;var l=document.createElement('link');l.rel='stylesheet';l.href=href+'?v='+v;l.setAttribute(attr,'1');document.head.appendChild(l)}
  function addJs(src,attr){if(document.querySelector('script['+attr+']'))return;var s=document.createElement('script');s.src=src+'?v='+v;s.defer=true;s.setAttribute(attr,'1');document.head.appendChild(s)}
  addCss('grabzone-pro-commerce-ui.css','data-gz-pro-commerce-ui');addJs('grabzone-pro-commerce-ui.js','data-gz-pro-commerce-ui-js');
  addCss('marketplace-storefront.css','data-gz-marketplace-storefront-css');addJs('marketplace-storefront.js','data-gz-marketplace-storefront-js');addJs('marketplace-storefront-filter.js','data-gz-marketplace-storefront-filter-js');
  if(isAdmin){addCss('marketplace-admin.css','data-gz-marketplace-admin-css');addJs('marketplace-admin.js','data-gz-marketplace-admin-js');addJs('marketplace-admin-controls.js','data-gz-marketplace-admin-controls-js')}
  if(isVendor){addCss('marketplace-vendor.css','data-gz-marketplace-vendor-css');addJs('marketplace-vendor-enhance.js','data-gz-marketplace-vendor-enhance-js');addJs('marketplace-vendor-email.js','data-gz-marketplace-vendor-email-js');addJs('marketplace-vendor-shipment.js','data-gz-marketplace-vendor-shipment-js');addJs('marketplace-vendor-product-edit.js','data-gz-marketplace-vendor-product-edit-js');addJs('marketplace-vendor-admin-mode.js','data-gz-marketplace-vendor-admin-mode-js')}
  if(isCheckout){addCss('marketplace-checkout.css','data-gz-marketplace-checkout-css');addJs('marketplace-checkout.js','data-gz-marketplace-checkout-js');addJs('marketplace-checkout-fix.js','data-gz-marketplace-checkout-fix-js')}
  if(isTracking){addCss('marketplace-tracking.css','data-gz-marketplace-tracking-css');addJs('marketplace-tracking.js','data-gz-marketplace-tracking-js')}
})();