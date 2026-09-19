/* Marketplace checkout shipping is owned by checkout.js. Do not calculate or overwrite totals here.
   This file is intentionally a compatibility no-op so legacy marketplace scripts cannot
   re-introduce the old flat ৳130 delivery charge or race the authoritative vendor shipping breakdown.
*/
(()=>{'use strict';window.__grabzoneMarketplaceCheckoutCompat=true;})();
