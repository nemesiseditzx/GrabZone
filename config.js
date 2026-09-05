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

/* Visual loader only. The coordinated V3 layer is intentionally loaded last
   so older visual experiments cannot fight with it. */
(function(){
  if(document.querySelector('link[data-gz-coordinated-v3]')) return;
  var link=document.createElement('link');
  link.rel='stylesheet';
  link.href='grabzone-coordination-v3.css';
  link.setAttribute('data-gz-coordinated-v3','1');
  document.head.appendChild(link);
})();
