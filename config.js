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

/* Visual theme loader only. No application/business logic is changed. */
(function(){
  if(document.querySelector('link[data-gz-pro-theme]')) return;
  var link=document.createElement('link');
  link.rel='stylesheet';
  link.href='bd-pro-theme.css';
  link.setAttribute('data-gz-pro-theme','1');
  document.head.appendChild(link);
})();
