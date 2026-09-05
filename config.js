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

/* Visual loader only. One final coordinated visual system is loaded last.
   Existing application/business logic is untouched. */
(function(){
  if(document.querySelector('link[data-gz-pro-ui-final]')) return;
  var link=document.createElement('link');
  link.rel='stylesheet';
  link.href='grabzone-pro-ui-final.css';
  link.setAttribute('data-gz-pro-ui-final','1');
  document.head.appendChild(link);
})();
