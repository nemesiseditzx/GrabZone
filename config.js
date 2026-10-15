var _gzHost = String(window.location.hostname || '').toLowerCase();
// Preview Workers use their own origin so API calls stay on the matching backend instead of leaking to production.
var _gzDevWorker = _gzHost.endsWith('.workers.dev');
window.GRABZONE_CONFIG = {
  backendUrl: _gzDevWorker ? window.location.origin : "https://grabzone.nemesiseditzx984.workers.dev",
  storeName: "GRABZONE",
  tagline: "Grab What's Trending.",
  currency: "৳",
  /*
    One flat, vendor-configured delivery charge for the whole country.
    The old dhakaShippingCharge / outsideDhakaShippingCharge keys are gone on
    purpose: shipping must never be adjusted by the customer's city, district
    or division. Each vendor's own shipping_fee is what applies, and it is the
    same for every delivery address in Bangladesh.
  */
  shippingCharge: 130,
  /*
    Performance switch for the oversized R2 images (one banner alone is 888 KB).
    Leave false until Cloudflare Image Resizing is enabled on the grabzone.tech
    zone; then set it true and the card renderers will request
    /cdn-cgi/image/width=... ,format=auto/ variants instead of the originals.
    Enabling the feature on the zone is a Cloudflare configuration change and
    needs the owner's approval.
  */
  imageTransform: false,
  whatsapp: "https://wa.me/8801XXXXXXXXX",
  messenger: "https://m.me/yourpage",
  instagram: "https://instagram.com/yourstore"
};

// The storefront's own index.html and styles.css own the UI. Avoid injecting a duplicate visual layer.
