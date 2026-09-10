import app from './admin-vendor-capabilities-wrapper.mjs';

export default {
  fetch(request, env, ctx) {
    return app.fetch(request, env, ctx);
  }
};
