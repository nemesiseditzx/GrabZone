/**
 * Compatibility alias for the retired variation-generator route.
 *
 * The old implementation rebuilt the option tables through individual writes
 * and also reset the parent product stock to zero. Forward the legacy URL to
 * the canonical vendor variation handler so all callers get the same atomic
 * matrix rebuild, validation, ID preservation and inventory safeguards.
 */
export default {
  fetch: async (req, env, ctx, next) => {
    const url = new URL(req.url);
    if (url.pathname !== '/api/vendor/generate-variations' || req.method !== 'POST') {
      return next(req);
    }

    url.pathname = '/api/vendor/variations';
    const forwarded = new Request(url.toString(), req);
    return next(forwarded);
  }
};
