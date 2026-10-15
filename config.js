var _gzHost = String(window.location.hostname || '').toLowerCase();
// Every Cloudflare Workers preview must call its own origin, never production.
// The custom domain remains pinned to the production Worker.
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

// Do not inject a second visual layer from the global config.
// index.html and styles.css already own the storefront UI. The former
// pro-commerce loader inserted a second search field and overrode the same
// header/hero/product layout, causing multiple competing UI variants.
