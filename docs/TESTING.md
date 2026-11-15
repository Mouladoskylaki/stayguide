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
