# SG-P31 Phase 3A — offline translation foundation

Owner authorizes additive storage/migrations, local adapter extensions and mock-only infrastructure. OpenAI **gpt-6-luna, Standard Global** is selected for v1. This is not authority for API calls, credential access, deployment, funding or a complete language UI. Phase 2B is checkpointed at `31c424d8bad527471b4a8fe0af3f4b20a7b5c895`; its reports, original translations, one-shot record and corpus remain historical evidence, unchanged.

## Storage and migrations

- `migrations/0000_guides.sql` establishes the existing guide table with IF NOT EXISTS, supporting migration tracking for older databases. `0001_translation_foundation.sql` adds source-version, translation, attempt-ledger and policy tables and triggers. `schema.sql` is the equivalent **fresh-database bootstrap**, not a script to rerun over an existing database.
- Existing databases apply the numbered migrations once through D1 migration tracking, only after separate database-operation approval. No migration was applied to a live database. Fresh bootstrap and existing-guide migration were exercised against disposable SQLite databases only.
- Each source row belongs to a property and content section, with an explicitly declared nullable source language, monotonically increasing source version and structured source fields. Migration never guesses English. Updating actual section text advances only that section's version; changing its declared language also advances its version. Wi-Fi or unrelated-section changes leave other versions valid.
- Translation identity includes property, section, source/target language, source version, model and prompt version. Records retain structured translated text, pending/ready/failed/stale status, generated/manual origin, claim identifier and lease. `provider_mode=mock` is explicit and constrained in this phase. Mock echoes are not real translations and must never be promoted to production content by enabling a live adapter.
- Guide-write triggers initialize/invalidate sources in the same SQLite statement as guide creation/editing. Retrieval joins current source language/version; stale output cannot be a current cache hit. Manual corrections remain distinct and survive unchanged-source cache use. An edited source retains old correction records as stale rather than overwriting history.

## Atomic work and spending semantics

`src/translation-store.js` provides parameterized D1 statements. A claim is one INSERT ... SELECT with transactional trigger publication of its current lease. It checks the source version/language, existing ready/current lease, total attempt count, cumulative reservation ceiling and rolling-minute attempt count before adding a ledger entry. SQLite serializes competing writers; no process-local promise map supplies production exclusivity.

Default policy is intentionally small and **offline-only**: eight lifetime attempts, four attempts per rolling minute, 100,000,000 nanodollars ($0.10) simulated cumulative ceiling. Each permitted attempt reserves 660,000 nanodollars ($0.00066), the prior conservative 800/800 bound. Cache reads do not reserve anything. Failed, timed-out and expired attempts retain their entire reservation; no automatic refund/reset or background retry exists. These limits are conservative mock fixtures, not approved production quotas, live spending authority or an invoice ledger.

Leases last 30 seconds. Lease ownership is exclusive only while the lease remains valid. An expired lease may be claimed again with a fresh identity and a fresh reservation, permitting overlapping work if the old provider operation is still running. The old holder cannot publish after lease expiry, replacement, language change or source edit, and all reservations remain consumed. Exactly-once external execution is not guaranteed. Real-provider recovery and cancellation policy remains a **Phase 3B requirement**, subject to separate authorization; distributed cancellation is not implemented in this maintenance task. No real provider is present here.

## Local adapter

`node/db.mjs` reads the existing flat JSON guide format unchanged. Its first authorized write persists a version-2 envelope containing the same guide rows plus translation state. Reads alone do not rewrite legacy data. All operations reload file-backed state; writes use an exclusive lock file, a temporary file, fsync and atomic rename. Independent adapter instances therefore do not overwrite each other's reservations from stale memory. Lock contention fails closed; there is no automatic stale-lock deletion. In-memory instances remain isolated test databases.

The adapter explicitly implements the repository's SQL operations, not a general SQL engine. Standalone SQLite tests replay the actual parameterized statements and compare results with the adapter, and separately race real SQLite connections. SQLite tests use installed Python's standard library only; application runtime has no Python dependency. Filesystem locking/durability and SQLite/D1 are not identical: hard-crash lock recovery is manual, directory-entry fsync is not implemented, and actual Cloudflare D1 runtime verification remains pending.

## Service and privacy boundary

`src/translation-service.js` is server-only and has no transport, credential/environment access, benchmark import or HTTP endpoint. Central configuration records the chosen model, Responses API, Standard/default tier, store=false, no tools/reasoning and explicit 800-input/800-output bounds. Live execution is disabled. The only supplied provider is a deterministic mock echo with explicit provenance; injected test providers must identify as mocks. This is a trusted server-code injection seam, not a security sandbox for arbitrary caller code.

Only allowlisted section fields enter the provider payload: welcome, check-in/out, rules, appliances, parking, local tips, emergency, contact and additional text. Wi-Fi data, property names, IDs, tokens, authentication hashes and database rows are excluded. The payload contains instructions, projected fields, locales and protected strings only. Numbers/times, uppercase identifiers, URLs and emails are preserved exactly per field; malformed output, missing keys/values, lost protected strings, reasoning or invalid usage fails closed. API-key/Bearer/private-key patterns are rejected before generation. This does **not** certify arbitrary host prose as non-sensitive; a host can type private information into any free-text field. Real-data transfer requires a separately reviewed privacy/consent/redaction policy.

Mock payload UTF-8 bytes are bounded conservatively at 800, source prose at 1,200 code points, and mock reported usage at 800/800 with zero reasoning. These are not authoritative real-model token counts. A real adapter requires approved token counting/framing, output enforcement, exact price validation and usage reconciliation before enabling execution.

`view()` is read-only: a valid saved translation is reused; otherwise it returns original fields and their explicitly known language, or null for unknown language. Storage failures return sanitized unavailable state without private details. `generate()` is internal, single-attempt, timed, quota/lease guarded and sanitized. It accepts only the existing nine research locales as a technical allowlist, not a claim of quality coverage. `correct()` validates structure/protected values and conditionally updates current saved text. No public request or guest view can invoke these methods through an application route in this phase.

Application-interface labels/catalogs are separate from property-content records. The host dashboard, guest SSR and PDF code remain unchanged. No complete language chooser, translation route or translated PDF projection has been introduced.

## Verification and remaining work

PASS: 16 focused Node tests; full npm test (eight files); standalone SQLite migration/local parity and competing-writer checks; whitespace checks. Tests cover unknown source language, caching/targets, section/language invalidation, manual corrections, concurrency, leases, source edits during work, failures, protected-field exclusion, usage/reservations/rate limits, deadline cleanup, legacy persistence, lock contention and absence of a new public translation route. The SQLite command is separate from npm test:

```sh
node tests/translation-foundation.test.js
python3 tests/translation-storage.sqlite.py
npm test
git diff --check
```

Initial Node-to-Python subprocess tests timed out in this sandbox; the SQLite checks were moved to the standalone command, with no escalation or runtime dependency. All final checks pass. No browser suite was rerun: no UI/SSR/PDF changes were made, and existing Node guest/host/PDF regressions pass.

Before real integration: independent review; approved migration execution and D1-local runtime verification; authenticated host operations and production ownership/rate controls; privacy policy for free text; real token/usage/billing/timeout handling with credentials kept server-side; explicit policy/retention/recovery limits; segregation of mock and actual provenance; host/guest language UI and UI catalogs; saved-translation SSR/PDF reuse; qualified bilingual/directional/CJK/RTL/device/accessibility checks. No automatic next step, API call, deployment, commit or push is authorized. SG-P31 remains IN PROGRESS. **Ready for independent review**, not production release.


## Phase 3A corrective maintenance — targeted re-review

`correct(id, section, target, fields, expected)` now requires the submitted `{sourceVersion, translationId, translatedText}` snapshot returned in a translated view's `correction` metadata. `translatedText` is the exact serialized text the editor read, not the proposed correction. Missing/malformed expectations return false. The service copies the caller's expectations before awaiting storage, validates the source version and exact saved translation identity/text, and never refreshes a stale submission to current values.

The atomic conditional UPDATE binds the submitted source version, claim identity, previous text, property, section, language pair, model and prompt version, and still requires a ready translation joined to its current source. The previous-text comparison also fences concurrent edits to the same translation. A stale/replaced translation or competing correction returns false without changing newer content. Successful correction retains `origin=manual`. The local adapter implements the same predicates, and actual SQLite tests replay valid and rejected updates and race two independent correction writers.

`setSourceLanguage()` preserves its static invalid-input exception and boolean success contract; storage exceptions now resolve to false. `correct()` resolves to false for storage failures as well as invalid/stale submissions. Neither exposes raw exceptions or attaches their private details. Callers must handle false without assuming it specifically means a stale edit.

Verification: 25 focused Node cases (the original 16 plus nine targeted regression cases); full npm test eight files; SQLite migration, claim concurrency, expanded local parity and concurrent-correction checks; whitespace and historical-evidence preservation checks pass. New cases cover valid/stale/missing/incorrect expectations, source edits and regeneration between reads, replacement before atomic update, concurrent corrections and injected synthetic storage failures. No schema/migration, transport, credential, UI, lease algorithm or live-database change was needed. **READY FOR TARGETED RE-REVIEW**; previous real-D1, privacy, billing, recovery and human-quality limitations remain open.
