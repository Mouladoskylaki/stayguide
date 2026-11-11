# Security and launch gate

## Prototype restrictions
LOCAL USE ONLY. Token-based edit authentication stored in browser localStorage is a temporary demo shortcut. It is not a commercial login system. QR links expose public guide content to anyone with the link. No production deployment is authorized.

## Before any public launch
- Server-side account authentication, session expiry/revocation, account recovery and per-property authorization.
- Rate limits and bot protection for signup-free trial and write endpoints; enforce trial expiration server-side.
- Output escaping, CSP, CSRF review for cookie-auth endpoints, input size limits, URL validation, upload MIME/content/size scanning, image transformations.
- No door/keybox/alarm/access codes; explicit guidance and validation.
- Payment provider verification: webhook signature, idempotency, renewal/cancellation states; VAT/tax and privacy review.
- Backups with tested restore, incident logging with no secrets, monitoring, data deletion/export, GDPR/legal documentation.
- Security tests, dependency checks, Cloudflare configuration review, manual launch approval.

## Agent rules
Do not store secrets in Git, logs or screenshots. Never claim this checklist is satisfied based only on prototype unit tests.
