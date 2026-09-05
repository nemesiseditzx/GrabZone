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

/* Visual loaders only. No application/business logic is changed. */
(function(){
  function add(href, attr){
    if(document.querySelector('link['+attr+']')) return;
    var link=document.createElement('link');
    link.rel='stylesheet';
    link.href=href;
    link.setAttribute(attr,'1');
    document.head.appendChild(link);
  }
  add('bd-pro-theme.css','data-gz-pro-theme');
  add('grabzone-premium-v2.css','data-gz-premium-v2');
})();
