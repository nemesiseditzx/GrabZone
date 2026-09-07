window.GRABZONE_CONFIG = {
  backendUrl: "https://grabzone.nemesiseditzx984.workers.dev",
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

/* Visual-only UI loader. Existing settings and application/business logic are untouched. */
(function(){
  function addCss(href, attr){
    if(document.querySelector('link['+attr+']')) return;
    var link=document.createElement('link');
    link.rel='stylesheet'; link.href=href; link.setAttribute(attr,'1');
    document.head.appendChild(link);
  }
  function addJs(src, attr){
    if(document.querySelector('script['+attr+']')) return;
    var s=document.createElement('script'); s.src=src; s.defer=true; s.setAttribute(attr,'1');
    document.head.appendChild(s);
  }
  addCss('grabzone-pro-commerce-ui.css','data-gz-pro-commerce-ui');
  addJs('grabzone-pro-commerce-ui.js','data-gz-pro-commerce-ui-js');
  addCss('marketplace-storefront.css','data-gz-marketplace-storefront-css');
  addJs('marketplace-storefront.js','data-gz-marketplace-storefront-js');
  if(/admin\.html$/i.test(location.pathname)||/\/admin\/?$/i.test(location.pathname)){
    addCss('marketplace-admin.css','data-gz-marketplace-admin-css');
    addJs('marketplace-admin.js','data-gz-marketplace-admin-js');
  }
})();
