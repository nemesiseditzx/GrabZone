import app from './vendor-create-fix-wrapper.mjs';

export default {
  fetch(request, env, ctx) {
    return app.fetch(request, env, ctx);
  }
};
