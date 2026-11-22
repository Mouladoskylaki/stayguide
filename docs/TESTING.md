# Testing strategy

## Baseline
`npm test` — Node test suite. Record actual result per task, never assume. `npm start` — local preview on http://127.0.0.1:8787. Localhost QR cannot be opened from a separate phone; use a reachable HTTPS staging URL only after authorization.

## Every task
- Run tests and report count; `git diff --check`; test changed routes and edge cases.
- UI changes: browser at ~390px and ~1440px, check horizontal overflow, contrast, keyboard focus and content with JS disabled.
- Security changes: unauthenticated edits denied; XSS text escaped; public page noindex; no edit tokens in public responses.
- Print: A4/A5 page breaks, QR scan, SVG/PNG exports, no cut-off content.
- Translation: fallback, stale-source invalidation, no repeated translation on view, cost ceilings.

## Release gates
No launch until account/trial security, upload controls, payments/webhooks, privacy, monitoring and restore testing pass. Distinguish automated tests, manual checks, and untested claims.

## SG-P22 filled-book checks

- `npm test` includes host lifecycle and pure saved-projection/glyph/privacy/asset-hash tests.
- `node tests/host-state.browser.mjs` runs the complete Chrome host/guest/QR suite plus real PDF downloads/fixtures, lazy asset/failure/retry and 1440/390/320 workspace checks. It prints an ephemeral artifact directory; no port 8787 or owner dataset is used.
- `python3 scripts/verify-welcome-books.py /absolute/artifact-directory/book` independently inspects and renders generated PDFs using existing Poppler/Pillow, validates ordered text/dimensions/fonts/word bounds/heading association and canonical rendered QR modules/quiet zone. Run from the repository root. Raster matching does **not** independently decode QR.
- Optional `node tests/welcome-book.firefox.mjs` checks actual A4/A5 desktop Firefox downloads using an ephemeral Worker and dedicated ignored `.local/sg-p22-firefox-*` profile. The test page closes its own window using a preference confined to that test profile; never use the owner's browser profile. The JSON result and downloaded PDFs can be retained without shipping the profile. This smoke is not the complete Chrome suite or real-mobile coverage.
- Physical scanning/printing, independent QR decoding when a decoder is available, real iOS/Android and Safari remain separate acceptance evidence. See [current measurements and limits](SG_P22_PDF_INTEGRATION.md).


## SG-P31 Phase 3B offline integration

Run `node tests/openai-integration.test.js`, `node tests/translation-foundation.test.js`, `python3 tests/translation-storage.sqlite.py` and `npm test`. OpenAI HTTP is injected and mocked with synthetic secrets; never set live bindings or read .env.local for these tests. SQL checks use disposable SQLite fixtures only and cover migration 0002 data preservation and real/mock cache/usage parity. Existing Chrome suite covers application/guest/QR/PDF regressions; actual D1 runtime and any controlled live test remain separate gates. See [evidence and strict live-test prerequisites](SG_P31_PHASE3B_INTEGRATION.md).


One-shot preparation: `node tests/translation-one-shot.test.js` uses only explicit mocked HTTP, a built-in synthetic key sentinel and separate disposable offline directories. `node scripts/translation-one-shot.mjs --dry-run` reads the frozen plan without claiming the live guard or accessing credentials. Do not run --live without separate owner authorization. See [guard, limits, command and failure semantics](SG_P31_PHASE3B_ONE_SHOT.md).


Phase 3B post-live finalization (SG-P31-P3B-FINAL-01): the single authorized synthetic live test has completed; its consumed `.local/qa/sg-p31-phase3b-one-shot/one-shot.jsonl` and evidence must not be reset, overwritten or rerun. Use only offline mock tests and dry-run for regressions; preserve historical QA outputs, including legacy benchmark outputs that ordinary tests may rewrite. This checkpoint uses an ignored temporary QA preloader to deny external transport/credential reads and virtualize only legacy Phase 2A/2B test writes; browser checks permit loopback only with a dedicated profile and blocked external proxy/DNS. No repository test runner/configuration is changed. [Final evidence and verification limits](SG_P31_PHASE3B_INTEGRATION.md#sg-p31-p3b-final-01--post-live-finalization-and-review) distinguish reported live usage, automated verification, estimated billing and untested D1/production/language/device behavior.


## SG-PAR-02 — proposed acceptance coverage

The [launch acceptance matrix](LAUNCH_ACCEPTANCE_MATRIX.md) separates a controlled six-language milestone from full public launch. Greek, English, German, French, Italian and Spanish are owner-selected; no six-language validation is claimed. Proposed criteria cover 30 directed pairs plus six same-language no-generation cases, independently proposed 150-case qualified linguistic and 60-fixture A4/A5 matrices, catalog completeness, correction/source concurrency, saved-only SSR/guest selection, quotas/privacy and accessibility/device evidence. Thresholds, samples, reviewer/device selection and regional formats await owner approval; these are not test runs or approved paid-call counts. Frozen Phase 2A/2B corpus/limits and all historical actual responses remain unchanged. Any future real-output acquisition needs separate bounded authorization; mocks cannot qualify translation quality. No paid generation from guest views in v1. Milestone acceptance is not deployment/production approval; full [security gates](SECURITY.md) remain.
