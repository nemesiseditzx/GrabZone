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
 var v='20260907-dev3';
 function addCss(href,attr){if(document.querySelector('link['+attr+']'))return;var l=document.createElement('link');l.rel='stylesheet';l.href=href+'?v='+v;l.setAttribute(attr,'1');document.head.appendChild(l)}
 function addJs(src,attr){if(document.querySelector('script['+attr+']'))return;var s=document.createElement('script');s.src=src+'?v='+v;s.defer=true;s.setAttribute(attr,'1');document.head.appendChild(s)}
 addCss('grabzone-pro-commerce-ui.css','data-gz-pro-commerce-ui');addJs('grabzone-pro-commerce-ui.js','data-gz-pro-commerce-ui-js');
 addCss('marketplace-storefront.css','data-gz-marketplace-storefront-css');addJs('marketplace-storefront.js','data-gz-marketplace-storefront-js');addJs('marketplace-storefront-filter.js','data-gz-marketplace-storefront-filter-js');
 if(/admin\.html$/i.test(location.pathname)||/\/admin\/?$/i.test(location.pathname)){addCss('marketplace-admin.css','data-gz-marketplace-admin-css');addJs('marketplace-admin.js','data-gz-marketplace-admin-js');addJs('marketplace-admin-controls.js','data-gz-marketplace-admin-controls-js')}
 if(/vendor\.html$/i.test(location.pathname)){addCss('marketplace-vendor.css','data-gz-marketplace-vendor-css');addJs('marketplace-vendor-enhance.js','data-gz-marketplace-vendor-enhance-js');addJs('marketplace-vendor-email.js','data-gz-marketplace-vendor-email-js');addJs('marketplace-vendor-shipment.js','data-gz-marketplace-vendor-shipment-js');addJs('marketplace-vendor-product-edit.js','data-gz-marketplace-vendor-product-edit-js');addJs('marketplace-vendor-admin-mode.js','data-gz-marketplace-vendor-admin-mode-js')}
 if(/checkout\.html$/i.test(location.pathname)){addCss('marketplace-checkout.css','data-gz-marketplace-checkout-css');addJs('marketplace-checkout.js','data-gz-marketplace-checkout-js');addJs('marketplace-checkout-fix.js','data-gz-marketplace-checkout-fix-js')}
 if(/track-order\.html$/i.test(location.pathname)){addCss('marketplace-tracking.css','data-gz-marketplace-tracking-css');addJs('marketplace-tracking.js','data-gz-marketplace-tracking-js')}
})();