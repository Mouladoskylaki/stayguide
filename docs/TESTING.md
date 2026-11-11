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
