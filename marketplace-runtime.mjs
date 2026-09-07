import emailWorker from './marketplace-email-worker.mjs';
import vendorExtra from './marketplace-vendor-extra.mjs';
export default {async fetch(req,env,ctx){const u=new URL(req.url);if(u.pathname==='/api/marketplace/vendor-email')return vendorExtra.fetch(req,env,ctx);return emailWorker.fetch(req,env,ctx)}};