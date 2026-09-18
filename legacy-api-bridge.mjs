import legacyWorker from './worker.mjs';

const LEGACY_EXACT = new Set([
  '/api/admin-auth',
  '/api/d1',
  '/api/track-order',
  '/api/r2-upload',
  '/api/r2-presign',
  '/api/business-koro-order',
  '/api/send-order-email',
  '/send-order-email',
  '/api/sync-order-sheet',
  '/api/product-reviews',
  '/api/product-review-photo',
  '/api/health'
]);

export default async function legacyApiBridge(req, env, ctx, next) {
  const p = new URL(req.url).pathname;
  const legacy = LEGACY_EXACT.has(p) || p.startsWith('/api/r2/');
  if (!legacy) return next(req);
  return legacyWorker.fetch(req, env, ctx);
}
