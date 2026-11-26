# Architecture — provisional

## Current prototype — committed baseline a87741f, pending W6 review
- `public/index.html`, `public/app.html`, `public/app.js`, `public/styles.css`: static host/marketing UI.
- `src/worker.js`: Cloudflare Worker routes/API and SSR guest HTML.
- `src/qr.js`: local QR SVG generator.
- `schema.sql` and numbered `migrations/`: guide JSON plus translation source/version, result/provenance, attempt/usage and policy storage. Local/SQLite verification does not certify actual D1 execution.
- `node/server.mjs`, `node/db.mjs`: local Node preview adapter and local JSON persistence. NOT production architecture.
- `tests/worker.test.js`: Node tests.

## Proposed production direction — not yet approved as final
Cloudflare Workers + static assets + D1; R2 only if images justify it. SSR public HTML, optimized image assets, caching only when invalidation is correct. Vanilla ES modules; no frontend framework. One shared guide content model for web and print.

## Routes (audit against code)
- `POST /api/guides` create; `GET/PATCH /api/guides/:id` authenticated by temporary edit token.
- `GET /g/:id` public guide (optional saved-only `?lang=` projection); `/g/:id/qr.svg` QR; `/g/:id/card` printable HTML.
- `GET/POST/PATCH /api/guides/:id/translations`: owner-token checks precede saved reads, explicit version-aware generation and snapshot-CAS correction. Source GET/PATCH and read-only capability routes support the host controls. Real generation remains disabled.
- Pending W6: `/g/:id` has a native GET language form, six small server-only guest catalogs and a storage-only saved projection. It never constructs the provider boundary. Original selection/invalid or repeated lang parameters normalize to the query-free canonical URL. Known-source and translated text receive language tags; unknown source remains unspecified.

## Hard boundaries
Temporary edit token in localStorage is NOT production authentication. Public URL does not imply private data protection. Do not publish without proper accounts/sessions, ownership, rate limiting, trial expiry, upload validation, backups, privacy, billing verification, monitoring and deployment review.

## Performance goals (targets, not measurements)
Fast on moderate mobile; SSR readable with JS disabled; minimal JS and CSS; no external font dependency; image size variants, dimensions, lazy loading for non-hero media; measure transfer bytes, LCP, CLS, TTFB before launch. Do not introduce an arbitrary numeric SLO without baseline measurements.


## SG-P22 — approved local-browser PDF path (2026-11-14)

`public/guide-content.js` preserves the existing host field registry and supplies `public/welcome-book.js`'s explicit saved-content projection. The host dynamically imports PDF logic only on export; pdfmake 0.3.14 and Noto Sans v2.015 font VFS are versioned local vendor assets, loaded on demand. No npm runtime graph, frontend bundler, public PDF endpoint, remote generator or PDF storage is added. The existing canonical QR SVG route supplies the PDF's vector QR. Request/workspace/model identity is rechecked after asynchronous work and before download. PDFs remain transient browser Blobs; their download URLs are revoked. See [integration/maintenance evidence](SG_P22_PDF_INTEGRATION.md). Guest SSR and all API/schema contracts remain unchanged; production authentication/privacy/release gates remain open.


## Future multilingual/media requirements — no architecture change (2026-11-15)

Historical planning at 2026-11-15: [owner-approved alignment](LAUNCH_MULTILINGUAL_ALIGNMENT.md) required server-side translation/cache/corrections/SSR/PDF reuse before those paths existed. Phase 3A/3B subsequently implemented the bounded storage and server/guest foundation below with the approved gpt-6-luna model. UI catalogs/choosers, translated PDFs, media and wider RTL/font support remain open. Do not read earlier unselected-provider or unimplemented-storage descriptions as current status.


## SG-P31 Phase 3A — owner-authorized mock-only foundation

OpenAI gpt-6-luna Standard Global is selected for v1. Additive D1 migrations/source triggers, atomic claims with leases/reservations, current-version translation reads and a server-only mock service are implemented for review; see [architecture, migration and limits](SG_P31_PHASE3A_FOUNDATION.md). Existing guides do not acquire an assumed source language. The local JSON adapter preserves legacy rows and emulates repository operations; SQLite parity/concurrency tests supplement Node tests. No live transport, new HTTP route, credential access, UI/guest/PDF integration or live migration is enabled. Earlier unselected-provider descriptions above are historical; the other production/privacy/account/quality gates remain open.


## SG-P31 Phase 3B — adapter and controlled application integration

[Phase 3B](SG_P31_PHASE3B_INTEGRATION.md) adds the server-only OpenAI adapter with default-off enablement and an unevaluated server credential callback, fixed Global endpoints, authoritative counting, deadlines/cancellation, no retries and usage reconciliation against retained reservations. Draft migration 0002 separates real/mock cache identities while preserving records. An owner-token-authenticated translation operation and saved-only guest ?lang rendering are implemented; no paid call occurs on guest views. Default Node preview has no live binding. Offline/mock and disposable SQLite verification is supplemented by one separately authorized H08 English→German live run using the existing application/service/adapter and a disposable local database. Saved/cache/guest SSR verification passed without further calls; normal application live enablement remains off and the one-shot authorization is consumed. Actual D1, privacy/account/quality and release gates remain. UI catalogs/choosers and translated PDF integration are not implemented.


## SG-PAR-02 — milestone and production boundaries (2026-11-22)

The [acceptance matrix](LAUNCH_ACCEPTANCE_MATRIX.md) proposes measurable criteria for the owner-selected Greek, English, German, French, Italian and Spanish milestone without changing runtime locale allowlists, APIs or storage. Future languages remain possible. Host interface locale, section source, guest target and print language must stay separate; no source-language assumption for legacy guides. No paid generation from guest views in v1. Full public launch retains all approved media/printable and commercial/security capabilities.

Historical SG-PAR-01 gaps were subsequently addressed by W1 atomic guide-save revision checks and W2 actual local D1 verification/write-result compatibility. Production/distributed D1 remains unverified. Remaining gaps include fixture policy of eight lifetime attempts/$0.10 shared across the DB, not a production allocation; the historical sequential per-section guest lookup is replaced in pending W6 by a joined read and final snapshot recheck; eligible prose may contain private data; valid saved fields may exceed translation bounds. No fix, queue/cache architecture, quota reset or public enablement is approved here. D1/runtime/restore/load verification, source conflict/API policy, account/trial/privacy/commercial design and media storage still require scoped decisions and evidence.


## W6 saved-only guest projection — pending independent review

`src/saved-guide.js` reads existing guide/source/current-ready OpenAI records through `translation-store.snapshot`. The single SELECT joins a coherent SQLite/D1 statement snapshot; a second read checks guide JSON/revision, sources and current translation text/identity before the overlay is used. Any observed change discards the overlay and projects the latest original snapshot. A failed translation read falls back to a fresh ordinary guide read. No lease, attempt, reservation, source declaration, correction or guide write is made. The local adapter adds only the matching read operation. Shared field/protected-string validation remains in `translation-service.js`; provider construction and generation are absent from this reader.

Stable original/target requests perform two SELECTs instead of the old code-derived maximum of approximately nineteen. Joined rows repeat guide JSON; local query counts/timings and payload measurements are evidence, not production performance certification. No cache, queue, schema, migration, dependency or new public API is introduced. Read-only projection is kept separate from HTML so W7 can later reuse the content rules under separate authorization; translated PDF handling is not implemented here. Post-final-read changes and distributed replica freshness cannot be ruled out without production verification. See [W6 verification](TESTING.md#sg-p31-w6--saved-only-guest-language-selection).
