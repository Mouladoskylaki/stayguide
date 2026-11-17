# Architecture — provisional

## Current prototype (verify in audit)
- `public/index.html`, `public/app.html`, `public/app.js`, `public/styles.css`: static host/marketing UI.
- `src/worker.js`: Cloudflare Worker routes/API and SSR guest HTML.
- `src/qr.js`: local QR SVG generator.
- `schema.sql`: D1 guide records (JSON content).
- `node/server.mjs`, `node/db.mjs`: local Node preview adapter and local JSON persistence. NOT production architecture.
- `tests/worker.test.js`: Node tests.

## Proposed production direction — not yet approved as final
Cloudflare Workers + static assets + D1; R2 only if images justify it. SSR public HTML, optimized image assets, caching only when invalidation is correct. Vanilla ES modules; no frontend framework. One shared guide content model for web and print.

## Routes (audit against code)
- `POST /api/guides` create; `GET/PATCH /api/guides/:id` authenticated by temporary edit token.
- `GET /g/:id` public guide; `/g/:id/qr.svg` QR; `/g/:id/card` printable HTML.

## Hard boundaries
Temporary edit token in localStorage is NOT production authentication. Public URL does not imply private data protection. Do not publish without proper accounts/sessions, ownership, rate limiting, trial expiry, upload validation, backups, privacy, billing verification, monitoring and deployment review.

## Performance goals (targets, not measurements)
Fast on moderate mobile; SSR readable with JS disabled; minimal JS and CSS; no external font dependency; image size variants, dimensions, lazy loading for non-hero media; measure transfer bytes, LCP, CLS, TTFB before launch. Do not introduce an arbitrary numeric SLO without baseline measurements.


## SG-P22 — approved local-browser PDF path (2026-11-14)

`public/guide-content.js` preserves the existing host field registry and supplies `public/welcome-book.js`'s explicit saved-content projection. The host dynamically imports PDF logic only on export; pdfmake 0.3.14 and Noto Sans v2.015 font VFS are versioned local vendor assets, loaded on demand. No npm runtime graph, frontend bundler, public PDF endpoint, remote generator or PDF storage is added. The existing canonical QR SVG route supplies the PDF's vector QR. Request/workspace/model identity is rechecked after asynchronous work and before download. PDFs remain transient browser Blobs; their download URLs are revoked. See [integration/maintenance evidence](SG_P22_PDF_INTEGRATION.md). Guest SSR and all API/schema contracts remain unchanged; production authentication/privacy/release gates remain open.


## Future multilingual/media requirements — no architecture change (2026-11-15)

[Owner-approved alignment](LAUNCH_MULTILINGUAL_ALIGNMENT.md) requires server-side AI requests, reusable saved translations keyed by property/language/section/source version, correction preservation and readable SSR fallback, with translated content reused by PDFs. These behaviors are not implemented; provider, cache/storage design, schema/API, concurrency/invalidation mechanism, photo processing/storage and RTL/font approach remain unselected. Existing local-browser PDF and guest architecture remain unchanged. SG-P31 research must precede provider decisions and separately authorized implementation.


## SG-P31 Phase 3A — owner-authorized mock-only foundation

OpenAI gpt-6-luna Standard Global is selected for v1. Additive D1 migrations/source triggers, atomic claims with leases/reservations, current-version translation reads and a server-only mock service are implemented for review; see [architecture, migration and limits](SG_P31_PHASE3A_FOUNDATION.md). Existing guides do not acquire an assumed source language. The local JSON adapter preserves legacy rows and emulates repository operations; SQLite parity/concurrency tests supplement Node tests. No live transport, new HTTP route, credential access, UI/guest/PDF integration or live migration is enabled. Earlier unselected-provider descriptions above are historical; the other production/privacy/account/quality gates remain open.
