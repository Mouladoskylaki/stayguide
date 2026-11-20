# SG-P31 Phase 3B — controlled one-shot preparation

**Current status — 2026-11-20:** the separately owner-authorized single live execution succeeded. Its authorization is consumed; no further execution is authorized. See [post-live evidence](#post-live-evidence--sg-p31-p3b-final-01-2026-11-20). Earlier preparation, future-command and authorization wording below is historical, not an instruction to run again.

2026-11-18. **Preparation only; no live execution or credential access authorized.** Baseline HEAD remains `ae28efe7bf35c8c0667d420932ce7a1cdb723731`; the previously reviewed Phase 3B implementation remains pending. Independent review approved preparation, not paid execution. This task adds a harness and offline tests and corrects the mislabeled reconciliation fixture. It does not alter the provider, service, store, routes, migrations, application settings or dependencies.

## Fixed synthetic job

The harness loads only hash-validated frozen corpus case **H08**, section `appliances`, **en-GB → de-DE**. Corpus SHA-256 remains `d08695f229067cda36a8d1113b97cb243b7914c51e1655c8822622702d9d78fd`.

Exact input:

> Press START once. Do not press RESET. Wait 90 seconds before opening the lid; the display may still show HOT.

The service protects START, RESET, 90 and HOT. The single disposable property is named `SG-P31 H08 Synthetic Review`. No owner property is loaded. The chosen model, Standard Global processing, `hospitality-v1` instructions, 800/800 limits and $0.00066 reservation are checked against the approved configuration. There are no CLI overrides for model, input, direction, budget, directory, retries or reset.

## Commands and authorization boundary

Safe dry-run, executed during preparation:

```sh
node scripts/translation-one-shot.mjs --dry-run
```

No arguments also mean dry-run. It validates the frozen plan and prints it without creating a guard/database, reading a credential or invoking transport.

**Future live command — NOT EXECUTED and NOT AUTHORIZED yet:**

```sh
node scripts/translation-one-shot.mjs --live
```

Before this command, the owner must separately authorize this exact harness, secure reuse/read of the existing ignored `.env.local` OPENAI_API_KEY, H08 English→German, gpt-6-luna Standard Global, at most one counting call and one generation, concurrency one, zero retries, 800/800 limits and 660,000 nanodollars ($0.00066) maximum reserved usage. Independent review must accept this preparation first. Phase 2B permission is consumed and cannot be reused. Funding, production migration and deployment remain excluded.

The future command requires a plain Node runtime: no NODE_OPTIONS, debugger/import/preload/TLS logging flags, NODE_DEBUG/NODE_DEBUG_NATIVE/SSLKEYLOGFILE or disabled TLS verification. Runtime rejection consumes the claimed guard without loading the credential or sending a request. Do not strip flags, delete evidence or rerun as an automatic workaround; report the failure for owner review.

## Guard, database and request safety

The future live directory is fixed at `.local/qa/sg-p31-phase3b-one-shot/`. Its exclusive 0600 `one-shot.jsonl` is created before any credential or provider work. New directories are 0700, directory components are checked against symlinks, and guard/file/directory entries are synced. The initial claim and each HTTP reservation are written and synced before dispatch. An existing or empty guard blocks execution, including after failure or interruption. No resume, retry, cleanup/reset command or budget refund exists. A future crash can leave partial evidence; it must remain untouched pending owner review.

`disposable.json` is created exclusively with a fresh version-2 local-adapter envelope. A pre-existing database is neither read nor overwritten. The initialized persistent policy is exactly:

- `max_requests=1`
- `per_minute=1`
- `budget_nano=660000`

Only one application-generated synthetic guide, one source section and one translation attempt can be used. The existing translation service reserves all 660,000 nanodollars before counting. Successful and failed attempts retain the reservation; the ledger is never reset. A second defense checks the fixed payload/model, policy and reservation in a wrapper around the existing provider's HTTP transport. It permits at most one count and one generation, in order, without concurrency. An aborted/expired request is rejected before transport invocation. No provider implementation or count/usage parser is duplicated.

The wrapper records hashes of the synthetic request bodies only, never authorization headers or key-derived hashes. Write-ahead counting/generation counters are conservative dispatch reservations, not proof of server receipt. `transportCalls` separately records transport invocations; even these cannot prove an external server accepted work. A failed journal write can consume a counter without a network request. Unknown generation usage is flagged as possible unreported spend, and the full reservation stays consumed.

## Credential handling

No credential was inspected in this preparation. The future live-only reader opens the fixed `.env.local` with O_NOFOLLOW, requires a regular 0600 file below 16 KiB, and accepts only one OPENAI_API_KEY assignment. It never modifies the original file, creates a secret backup, prints a key/partial key/hash, or puts the secret in command arguments. Unexpected formatting/protection blocks execution. Git ignore/untracked protection must be reconfirmed before the separately authorized run; the harness does not stage anything.

The credential is retained transiently in memory for a server callback and discarded from the harness variable during cleanup. Normal application environment/settings remain unchanged and default-disabled. The harness calls application routes directly in an isolated request context; it starts no HTTP server, browser or production resource. The temporary owner token exists only in memory; the disposable DB retains its existing authentication hash, never the plaintext edit token. This is separate from the OpenAI key.

## Verification after the future generation

The harness uses the existing OpenAI adapter, translation service/store, local persistence and authenticated host POST route. It checks structured/protected output, rejects a source echo, and requires OpenAI provenance. It then reopens the database, reads saved results through the service with a disabled provider, repeats the authenticated host operation three times as cache hits, and verifies saved-only guest HTML three times without a credential binding. It checks matching fields, language tags, escaping and absence of the transient owner token/credential.

Final checks require one reservation, one attempt, one ready OpenAI translation, a completed ledger entry, valid reconciled usage/cost, unchanged policy and exactly one count/generation with no blocked extra-HTTP attempts. These are engineering/structural checks; they do not certify semantic accuracy or qualified bilingual review.

Successful future output includes `status=SUCCESS`, `execution=authorized-live`, conservative counters, transport counts, `providerMode=openai`, H08 identity, `reservedNano=660000`, reconciled usage, actual synthetic translated fields, persistence/cache/guest verification booleans and **PENDING HUMAN REVIEW**. Dollar estimates are not invoice verification. `summary.json`, `disposable.json` and the guard journal remain in the fixed ignored directory, with restrictive permissions. A failed run reports BLOCKED, safe category/counters, retained reservation and uncertainty without raw provider errors, bodies, headers or secrets. There is no automatic retry.

## Offline verification

`runOfflineOneShot()` is a separate test-only entry requiring an explicit mocked HTTP function and a directory confined under `.local/qa/sg-p31-phase3b-one-shot-offline/`. It cannot select the live directory. It uses a built-in synthetic sentinel, never a credential callback or `.env.local`; results/guards explicitly say `execution=offline-mock` and `realTransportAttempted=false`. The injected function is trusted test code, not a sandbox for arbitrary callers. No CLI option can inject a mock transport into an alleged live run.

PASS: 20 one-shot cases covering dry-run, fixed arguments/job, successful persisted/cache/guest verification, counter ceilings, parallel claims, failed counts, generation failure, timeout uncertainty, budget tampering, secret/protected-value rejection, source echoes, path/symlink rejection, pre-existing DB preservation, interrupted guard refusal, persistent budget enforcement and write-ahead ordering.

The existing integration test named “accounting reconciles valid usage even when translated content fails validation” now actually omits protected 112 while reporting valid usage. It asserts failure, reconciled cost, no ready cache entry and original fallback. PASS: all 26 integration cases, 25 foundation cases, full npm test (ten files), SQLite migration/parity/concurrency tests, dry-run, whitespace and historical-integrity checks. No browser suite was rerun: this task changes no application/UI/SSR/PDF code; the previous Phase 3B Chrome evidence remains intact. Offline fixtures are separate and disposable; historical evidence is not deleted or overwritten.

Commands:

```sh
node tests/translation-one-shot.test.js
node tests/openai-integration.test.js
node tests/translation-foundation.test.js
npm test
python3 tests/translation-storage.sqlite.py
git diff --check
```

The first timeout fixture did not handle an already-aborted mocked signal and failed its offline assertion; the mock now models that case correctly. Final checks pass. No live run was used to diagnose or fix it.

## Remaining limits and next boundary

Actual Cloudflare D1 runtime/rollback/meta.changes, real account/model access, real tokenization, external cancellation/uncertain-work recovery, invoice reconciliation, privacy of arbitrary host prose, production accounts/trial/abuse controls, comprehensive language quality/UI/PDF/device coverage remain open. Lease ownership is exclusive only while valid; external exactly-once execution is not guaranteed. The harness's one-shot guard and persistent single-attempt cap intentionally prevent retry/recovery after uncertainty. Filesystem guard checks assume a trusted workspace; they are not protection against an adversarial process with the same filesystem privileges deliberately deleting/replacing the entire test directory. Credential-loader operation remains untested against the actual secret by design.

The mandatory Product & Architecture Review checkpoint remains before the next major feature, not a blocker for Phase 3B. **READY FOR INDEPENDENT REVIEW.** Stop for owner authorization; no real request, credential read, paid usage, live migration, deployment, staging, commit or push follows automatically.

## 2026-11-18 — reservation reporting integrity correction

Independent review confirmed that the failure handler's initial zero could misreport a retained 660,000-nanodollar reservation when the database became unreadable after generation. The actual exclusive guard and spending cap were not bypassed, but the financial failure evidence was incorrect. This defect is corrected without changing execution limits, credential loading, payloads or the guard.

The HTTP wrapper now retains the reservation immediately after successful policy/attempt verification and before journal persistence or transport dispatch. Failure reporting first tries the currently readable, validated database. Validation requires the fixed policy, version-2 state and an explicit attempt ledger with at most one valid OpenAI reservation; missing/malformed state is not an empty ledger. Because no refunds/resets exist, a total below a previously verified reservation is rejected as inconsistent. If current state cannot be validated, the last verified amount is retained; without either source, the amount is JSON null. Usage parsing failure does not erase a separately validated reservation.

| reservedNano | reservationSource | Meaning |
|---|---|---|
| 0 | database | Current validated ledger explicitly contains no reservation. |
| 660000 | database | Current validated ledger confirms the reservation. |
| 660000 | last_verified | Current state is unreadable/invalid/inconsistent; the pre-dispatch checkpoint still establishes the retained reservation. |
| null | unknown | No current validated state or prior verified checkpoint is available. This does not mean zero. |

Success summaries also identify their reservation source as database. Reserved budget remains a retained safety allocation, not actual provider billing. Inaccessible or missing generation usage still sets possibleUnreportedSpend when a generation transport invocation occurred; it does not imply an invoice was checked or that no charge occurred. No failure releases the one-shot guard, refunds the ledger or authorizes a retry.

Six added fault-injection regressions exercise the actual catch/reporting path: unreadable state after generation, unreadable state before a checkpoint, readable confirmed zero, readable valid reservation, malformed state and a contradictory zero after a positive checkpoint. Each verifies no extra transport invocation or second execution; persisted null/last-verified summaries and sanitized errors are checked. The previous pre-existing-database test now correctly expects unknown rather than assumed zero, without opening that file.

PASS: 26 one-shot cases, 26 integration cases, 25 foundation cases, full npm test ten files, applicable SQLite checks, dry-run, whitespace and historical-integrity checks. No real network/API request, .env.local access, credential access, --live execution, paid service, production migration, staging, commit/push or deployment. READY FOR TARGETED RE-REVIEW; all prior production limitations and owner-authorization requirements remain.

## Post-live evidence — SG-P31-P3B-FINAL-01 (2026-11-20)

The owner separately authorized exactly one live execution after targeted review. That execution completed successfully; this finalization only reads its retained evidence and performs offline verification. It does not access credentials, repeat counting/generation or enable normal application live execution. The consumed guard must remain untouched; there is no remaining live authorization.

Evidence: `.local/qa/sg-p31-phase3b-one-shot/summary.json`, `one-shot.jsonl` and `disposable.json`. The journal contains one claim, one count reservation, one generation reservation and one successful final summary. Its final summary exactly matches summary.json. The disposable database contains one completed OpenAI attempt and one ready OpenAI translation; its usage, conservative cost and translated fields match the summary.

| Real execution observation | Recorded value |
|---|---|
| Model / processing / direction | gpt-6-luna / Standard Global / H08 en-GB → de-DE |
| Transport invocations | 1 count; 1 generation; zero retries; concurrency one |
| Input / output / reasoning tokens | 134 / 51 / 0 |
| Cached / cache-write tokens | 0 / 0 |
| Standard-rate usage estimate | $0.00003890 (38,900 nanodollars) |
| Conservative estimate, including 10% contingency | $0.00004279 (42,790 nanodollars) |
| Retained reservation | $0.00066 (660,000 nanodollars); reservationSource=database |
| Observed full harness duration | 6.429 seconds; includes local verification, not isolated API latency |
| Persistence / cache / guest verification | All true; repeated verification added zero API calls |

Cost arithmetic using the retained rates: 134 × 100 + 51 × 500 = 38,900 nanodollars; adding 10% gives 42,790. These are estimates from reported usage, not independently verified invoices. The full reservation remains consumed and is not actual billing or a refund. Count/generation journal reservations precede transport; the success record and database agree with the recorded one-count/one-generation totals.

Unchanged original H08 text:

> Press START once. Do not press RESET. Wait 90 seconds before opening the lid; the display may still show HOT.

Unchanged actual German response:

> Drücken Sie einmal auf START. Drücken Sie nicht auf RESET. Warten Sie 90 Sekunden, bevor Sie den Deckel öffnen. Auf dem Display kann weiterhin HOT angezeigt werden.

START, RESET, 90 and HOT are preserved. The completed harness reopened the disposable database with a disabled provider, verified saved reads and repeated authenticated cache operations, and checked escaped saved German text and lang=de-DE in guest SSR. This is real API evidence followed by automated application verification, not a human interface or qualified bilingual assessment. Human review remains **PENDING HUMAN REVIEW**. One synthetic English→German case does not establish broader directional language coverage, production reliability or translation quality.

Evidence SHA-256 values (artifact hashes only, never credential hashes):

```text
summary.json     49800f255ac1e693e4f5dbca75cc83af715116efeca6abe7cdfc51111bbd5dd0
one-shot.jsonl   0dd45a8b45ef22d074c0e4ffd815b4e05b5d9dfe422c96374b783841d3da0cfb
disposable.json  9bcf2f6f55cfb9b69c86be857492a15a1dd6b461e416fdf9224c95508646e775
```

Actual D1 runtime/migration/bindings/contention, provider-side cancellation and uncertain-work recovery, invoice reconciliation, arbitrary host-prose privacy, production ownership/abuse controls, complete UI localization/language selection, translated PDFs, broader qualified language review and physical device/print/public-URL scanning remain open. Earlier statements that real account access/tokenization/credential loading were untested describe preparation; the single authorized run now supplies bounded success evidence for those paths only. No production readiness or further request is implied. See the [final offline review report](SG_P31_PHASE3B_INTEGRATION.md#sg-p31-p3b-final-01--post-live-finalization-and-review).
