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

## SG-P31-W2-FIX — direct-write results and local D1

`node --test tests/d1-write-results.test.js tests/guide-concurrency.test.js tests/translation-foundation.test.js` covers exact direct RETURNING results, trigger-inclusive metadata, failed/missing rows, handler/storage behavior and adapter persistence. Run both `python3 tests/guide-concurrency.sqlite.py` and `python3 tests/translation-storage.sqlite.py`; they consume returned rows before commit and compare direct-row results with the JSON adapter. SQLite direct row counts and D1 trigger-inclusive metadata are deliberately not treated as interchangeable.

`tests/d1-runtime.local.mjs` is an explicit opt-in local-runtime suite, outside npm test. It uses already installed ignored tooling, six dummy D1 IDs, disposable state, the actual bundled Worker/storage code and an explicitly injected synthetic provider. It does not read credentials or call OpenAI. Only prepared `.local/qa/sg-p31-w2-fix-*` directories with isolated temporary configuration are accepted; no tracked Wrangler configuration is changed. Evidence/setup logs for this run are in `.local/qa/sg-p31-w2-fix-20261122-r2/`; the preliminary RETURNING probe is in `.local/qa/sg-p31-w2-fix-20261122/`.

Preparation applies unchanged migrations 0000→0001→0002 to fresh and seeded legacy databases and schema.sql to independent bootstrap/lease/budget fixtures, then verifies migration replay is empty. Invoke the suite through the isolated local runner with installed Node 24:

```sh
python3 .local/qa/sg-p31-w2-fix-20261122-r2/run-isolated.py node /home/konstantinos/repos/stayGuide/tests/d1-runtime.local.mjs /home/konstantinos/repos/stayGuide/.local/qa/sg-p31-w2-fix-20261122-r2
```

This is a record of the completed run, not an idempotent command: use freshly initialized disposable state for a future rerun and preserve old evidence. The temporary runner blocks external Node transport/credential reads, disables Wrangler telemetry/dotenv loading and isolates tool configuration. workerd outbound service is denied. Application route/provider wiring is exercised with synthetic mock output only; its explicitly selected OpenAI-mode fixture is not real API evidence.

Ten local D1 groups cover schema/21 triggers/legacy manual preservation, creation, conditional saves, 428/400/409/401, no-op/content-revert saves, saved-only guest/cache reuse, targeted invalidation/manual corrections, competing HTTP saves, claims/budget, missing/failed writes/batch rollback and runtime restart persistence. The two HTTP writers wait at a controller-owned barrier immediately before the actual D1 CAS; both arrive and exactly one direct row is returned. Claims/budget checks submit overlapping D1 RPC promises from one controller; they are not independent-region/load tests. Lease replacement advances synthetic timestamps sequentially, not a measured elapsed-time race. SQLite separately uses independent connections/threads. The JSON adapter retains its existing synchronous lock/reload model and direct metadata, rather than emulating all D1 trigger metrics.

Verified environment: Node 24.22.3, npm 11.19.1, Wrangler 4.166.0, workerd 1.20261119.1, Miniflare 5.20261119.0-beta. Remote/production D1 behavior, distributed contention, deployment compatibility and live-provider billing/recovery remain separate unverified gates. Existing Chrome host/guest/QR/A4-A5 regressions pass with loopback-only transport; physical scans/prints, new Firefox/device coverage and translation quality are not established by this task. See [results and preservation checks](PROGRESS.md#2026-11-22--sg-p31-w2-fix-local-d1-write-success-compatibility).


## SG-P31-W4A — host-interface localization

Run `node tests/host-i18n.test.js`, `node tests/host-state.test.js` and full offline `npm test`. Catalog tests enforce six-locale key/placeholder parity and complete HTML/field/warning coverage. The actual host entrypoint is exercised for draft/identity/revision/storage preservation, no extra application requests, conflict rejection and switching during an in-flight save.

`node tests/host-state.browser.mjs` includes existing host/guest/QR/A4-A5 checks and new six-language coverage. For a focused rerun, use `node tests/host-state.browser.mjs --localization-only`; the same synthetic server/browser infrastructure is reused. Tests check saved/browser/corrupt preference behavior, reload, expansion at 1440/1280/768/390/320, native selects/modal keyboard containment, drafts/selection/node identity, discard copy, QR identity, no generation/application fetches on switching, unchanged PDF definitions and original-content saves. Use the existing offline credential/transport-denial preloader, loopback-only Chrome wrapper and fresh ignored QA profile/artifact directory; no real owner browser or dataset.

Do not infer qualified linguistic acceptance, actual assistive-technology coverage, other browser/device acceptance, localized guest content or translated PDF support from these checks. [Implementation, complete message inventory and exclusions](SG_P31_W4A_HOST_LOCALIZATION.md). Native browser dialog buttons/validation UI follow browser settings; application message bodies are localized. Keep historical evidence/consumed live guards untouched.


## SG-P31-W4B-A — source metadata and explicit declaration

Owner-authenticated `GET /api/guides/{id}/translation-sources/{section}` returns only `{section, sourceLanguage, sourceVersion, declared}`. Undeclared language remains null; legacy stored tags outside the milestone remain unchanged on read. This operation neither instantiates the OpenAI provider nor reads provider/credential bindings, generates, claims or reserves spending.

`PATCH` on the same URL requires application/json and exactly `{sourceLanguage, expectedSourceVersion}`, bounded to 4,096 raw body bytes. Declaration accepts only el-GR/en-GB/de-DE/fr-FR/it-IT/es-ES and a positive safe integer version. No clear/null declaration, inference, bulk update or host control is added. Authentication precedes section validation and body parsing. Responses: 200 metadata; 400 invalid body/tag/version/content type; 401 unauthorized; 404 unknown guide/section or absent metadata; 409 with source_version_conflict for stale expectations; sanitized 500 source_metadata_unavailable for unexpected storage/result failures. Responses retain no-store/nosniff behavior.

The UPDATE matches guide/section/source_version atomically, sets the chosen language and adds zero or one to the version using a CASE expression against the old language. A RETURNING row with applied=1 and the resulting metadata is required; trigger-inclusive meta.changes is not used. Same-language no-ops still pass through this version-checked SQL, so stale same-language calls cannot succeed. Version-changing competitors have one winner; valid no-ops do not consume a version. Existing invalidation triggers only stale the changed section when the version actually advances. A positive safe-integer ceiling prevents increment overflow. Returned metadata represents the operation's atomic statement, not a later read that could accidentally report another writer's result. A follow-up read after zero returned rows only distinguishes missing metadata/conflict/storage failure; it does not authorize or retry a write.

Run `node tests/source-language.test.js` (12 focused API/storage cases), `python3 tests/source-language.sqlite.py` (direct shared SQL/local parity and independent SQLite contention), both existing SQLite suites, and full offline npm test. Inspect and use the existing ignored external-transport/credential-denial QA guard. No dependencies, test data outside disposable fixtures or actual owner credentials are needed.

`tests/source-language.d1.mjs` is opt-in and outside npm test. It uses installed ignored Node 24/Miniflare/esbuild/workerd, dummy local D1 ID 00000000-0000-0000-0000-000000000101 and a prepared `.local/qa/sg-p31-w4b-a-*` disposable directory. This run copied prior synthetic local D1 state and cleared fixture rows only in the new copies; no schema changes or migration commands. Existing migrations/schema are read/checked, not applied to a live database. Provider/enablement/key getters throw if touched, outbound Worker requests are denied, Wrangler dotenv/telemetry are disabled by the existing isolated runner, and loopback is the only allowed transport.

Completed command, not an idempotent rerun:

```sh
python3 .local/qa/sg-p31-w4b-a-20261123/run-isolated.py node /home/konstantinos/repos/stayGuide/tests/source-language.d1.mjs /home/konstantinos/repos/stayGuide/.local/qa/sg-p31-w4b-a-20261123
```

Use new disposable state for any later rerun; preserve existing evidence. Seven actual local D1 groups cover unknown/first/no-op/stale declarations, targeted invalidation/manual preservation/reservations, authorization/validation, legacy/missing metadata, guide ETags/content edits and two genuinely overlapping HTTP declarations. A controller-owned barrier releases both authenticated requests immediately before actual D1 SQL; returned-row counts are 1/0 and HTTP results 200/409. Independent SQLite threads use separate connections; local JSON adapter behavior retains its existing synchronous lock/reload/persist semantics. The JSON adapter retains its existing derivation of missing section records from guide content on load; focused missing-row API tests inject absence, while actual D1 tests delete a disposable source record and verify 404. It is not a general SQL emulator. Local workerd/D1 is not production/multi-region certification. Full Chrome host/localization/guest/QR/A4-A5 regressions also pass without UI changes.

**Unresolved Stage B blocker:** legacy POST /translations still calls setSourceLanguage before generation. A blocked/failed generation can still persist declaration changes and invalidate that section's translations. Its existing source setter, generation, cache, claims, correction, provider and guest behavior are deliberately unchanged. Stage A is not a fix or approval for that POST path. Do not expose new host content-translation controls until separately authorized Stage B fixes it; no real provider execution is authorized by these tests.
