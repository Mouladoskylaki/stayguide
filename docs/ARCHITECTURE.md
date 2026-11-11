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
