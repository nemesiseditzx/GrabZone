# GrabZone R2 Asset Routing Inventory

**Branch:** vendor-system-dev  
**Status:** Source inventory only; live bucket contents/account usage are not visible from repository source.

## Current binding

The three checked Wrangler configs (wrangler.jsonc, wrangler.marketplace-dev.jsonc, wrangler.vendor-preview.jsonc) bind the same bucket name, `grabzone-assets`, through `ASSETS_BUCKET`. The current implementation must be treated as one storage target until real Cloudflare resource details are independently verified.

## Observed object key families and access paths

| Logical asset family | Observed write path | Observed read path | Current behavior to preserve |
|---|---|---|---|
| Vendor logo/banner/product uploads | `marketplace-stable-entry.mjs`: `vendors/{vendorId}/{kind}-{uuid}.{ext}` through `/api/vendor/upload` | `/api/vendor/media/{key}` and `/api/marketplace/media/{key}` | Vendor/admin authorization on upload; `vendor_id` and `uploaded_by` object metadata; public immutable media response |
| General admin image uploads | `worker.mjs`: `grabzone/{YYYY-MM-DD}/{uuid}.{ext}` through the existing authenticated upload handler | `/api/r2/{key}`, or `R2_PUBLIC_BASE_URL` when configured | Existing key and URL format; image content type; one-year immutable cache policy |
| Customer product-review photos | `worker.mjs`: `grabzone/reviews/{YYYY-MM-DD}/{uuid}.{ext}` | `/api/r2/{key}`, or `R2_PUBLIC_BASE_URL` | Review row stores the resulting photo URL; photo starts unapproved; preserve moderation behavior |
| Product multi-image references | `marketplace-image-policy-entry.mjs` writes URL references to D1 after uploads use `/api/vendor/upload` | Product API returns stored URLs and first-image fallback | Existing image URLs and image ordering must not change |

These key patterns are based on source inspection and may not enumerate every historical object key or any object created by older deployments. Do not assume this is a complete live-bucket manifest.

## Required future-ready storage contract

1. Keep the existing native binding as the default implementation.
2. Add a server-side storage facade only after all read/write routes are inventoried. Existing route behavior and object keys must remain compatible.
3. Use deterministic routing by logical category and/or explicit object-to-target metadata. Never randomly select a bucket per request.
4. Existing objects must continue to resolve to their current target. New storage targets must not silently make old objects unreachable.
5. For cross-account R2, prototype the S3-compatible API with bucket-scoped credentials stored as Worker secrets. Do not expose credentials or arbitrary endpoints to the browser.
6. Preserve content type, cache headers, metadata, object key, and public URL semantics during any copy.
7. Use manifest-driven copy, checksum/reconciliation, retryable jobs, and a reversible read path before any cleanup.
8. Do not add a second bucket/account until measured usage demonstrates a need and the arrangement is permitted under current Cloudflare terms.

## R2 expansion test checklist

- [ ] Upload, read, and delete tests for every asset category.
- [ ] Existing URL/key backward compatibility.
- [ ] Metadata and content-type preservation.
- [ ] Correct public cache headers and no accidental private asset exposure.
- [ ] Token rotation/revocation and denied-access tests.
- [ ] Object size limits, timeouts, error handling, and idempotent retry behavior.
- [ ] Cross-account latency and operation counts measured against native binding.
- [ ] Manifest/checksum reconciliation and rollback tested before any migration.

## Explicit non-changes

This inventory did not change the R2 binding, bucket, object keys, public URLs, or production behavior. It did not copy or delete objects. The storage abstraction and cross-account R2 adapter are not implemented yet.
