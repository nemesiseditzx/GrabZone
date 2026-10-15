# GrabZone Email System — Single-Account Setup

**Branch:** vendor-system-dev  
**Scope:** Email only. Keep GrabZone in its current Cloudflare account. Do not split accounts, change D1/R2, change DNS for the website, or deploy production as part of this task.

## Existing code

The shared module `grabzone-email.mjs` routes transactional emails through the configured provider order. Default:

1. Resend
2. Brevo
3. Mailtrap Email Sending
4. Existing Gmail API sender

The current implementation is best-effort synchronous failover, not a durable queue. An explicit provider rejection (including HTTP 429) can move to the next provider. Network failures and HTTP 5xx are treated as ambiguous and stop immediate failover to reduce duplicate-message risk. A provider's HTTP success means accepted by that provider, not guaranteed inbox delivery.

## Configure secrets in the existing Worker account

Open Cloudflare Dashboard → Workers & Pages → the existing `grabzone` Worker → Settings → Variables and Secrets.

Add provider credentials as **encrypted secrets**, not plaintext vars and never in Git, browser JavaScript, screenshots, or chat:

- `RESEND_API_KEY` — required for Resend primary
- `BREVO_API_KEY` — Brevo fallback
- `MAILTRAP_API_TOKEN` — Mailtrap fallback (or the code-supported `MAILTRAP_API_KEY`)

Add sender addresses as non-secret variables only after each provider verifies the sender/domain:

- `ORDER_EMAIL_FROM` — verified sender used by Resend
- `BREVO_FROM_EMAIL` — verified sender used by Brevo
- `MAILTRAP_FROM_EMAIL` — verified production sender used by Mailtrap

Keep the existing Gmail fallback variables configured if Gmail is already used:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET` (secret)
- `GOOGLE_REFRESH_TOKEN` (secret)
- `GMAIL_FROM_EMAIL`

Recommended provider-order variable: `EMAIL_PROVIDER_ORDER_TRANSACTIONAL=resend,brevo,mailtrap,gmail`. If omitted, the default is already Resend → Brevo → Mailtrap → Gmail. Do not configure Mailtrap with a sandbox token for live customer emails; use only production Email Sending access and a verified sender.

## Safe setup order

1. Confirm the current `grabzone` Worker and its environment (production vs preview).
2. Configure one provider at a time in a non-production/preview Worker first.
3. Verify the sender/domain in that provider's dashboard. Follow the provider's exact DNS instructions; do not delete existing MX/SPF/DKIM records blindly and do not publish multiple SPF TXT records for the same hostname.
4. Add that provider's API key as an encrypted Worker secret and its verified sender as a variable.
5. Send controlled test emails only to addresses you control. Check provider event/activity logs and recipient inbox/spam.
6. Test explicit rate-limit/rejection failover using automated tests; do not deliberately exhaust production quota.
7. Test order confirmation and vendor order notification in preview with a test order, then check customer order-status and rewards email call paths.
8. Add and verify the next fallback provider, repeating the controlled test.
9. Only after preview evidence is good, request explicit approval before changing production Worker secrets/configuration.

## Important gaps (not yet done)

- Durable outbox/queue and retry scheduling across Worker restarts.
- Cross-provider idempotency/deduplication; provider-level acceptance IDs are currently returned but not persisted in a durable email ledger.
- Per-provider quota telemetry, warning thresholds and alert delivery.
- Signed delivery/bounce webhook processing and a delivery-status ledger.
- Marketing consent/unsubscribe handling (keep marketing mail separate from transactional order/account mail).
- Live sender-domain verification and real inbox delivery tests.

Do not claim any provider is active until its credentials are configured, sender verification is complete, and controlled delivery is confirmed. Do not expose provider keys via the email status endpoint.
