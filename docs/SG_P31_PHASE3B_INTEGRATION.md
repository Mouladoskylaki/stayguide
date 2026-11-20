# SG-P31 Phase 3B — OpenAI integration, offline verification

**Current status — 2026-11-20:** one separately owner-authorized H08 English→German live test succeeded; its guard and evidence remain retained. This report preserves the original offline implementation history below. The [post-live report](#sg-p31-p3b-final-01--post-live-finalization-and-review) supersedes earlier preparation-only statements for current status. Normal application generation remains default-disabled; no additional live request is authorized.

Baseline `ae28efe7bf35c8c0667d420932ce7a1cdb723731`. Owner authorizes implementation and OFFLINE verification only. Model remains OpenAI gpt-6-luna, Standard Global, Responses API. No real endpoint invocation, credentials read/write, paid usage, production migration, deployment or commit/push was performed. Parent SG-P31 remains IN PROGRESS; independent review is required.

## Provider and spending boundary

`src/openai-translation-provider.js` is a separate server-only adapter, not an import/copy of the Phase 2B CLI. It has no filesystem or environment access. Its default is disabled; `keyProvider` is a trusted server callback evaluated only during explicitly enabled generation. Synthetic callbacks and mocked HTTP responses supply every test. Injected HTTP/provider objects are trusted server test seams, not request-controlled configuration.

The two HTTPS destinations are fixed to OpenAI's Global token-counting and Responses endpoints. There is no URL/model/provider override in the host API, redirect following, SDK or retry. Both counting and generation use the same serialized model/input/instructions/reasoning/tools/structured-output schema. Authoritative counting must return a positive integer at most 800; generation sets max_output_tokens=800, service_tier=default, store=false, stream=false, truncation=disabled, no tools and reasoning effort none. Source limit and `hospitality-v1` prompt/instructions remain unchanged. JSON-schema formatting preserves exact field keys without relying on parsing prose or Markdown.

A database claim and full 660,000-nanodollar reservation precede even counting. Existing global eight-attempt/$0.10 cumulative policy and four-attempt rolling-minute limit remain unchanged, shared across modes. No automatic period reset or refund exists. Cache hits reserve/call nothing. These inherited ceilings are safeguards, not paid authorization. Bad counts stop before generation; missing/mismatched/oversized usage stops without retry. Failed and uncertain requests retain reservations.

Usage reconciliation validates input count equality, total/output/cache/write/reasoning counts and the reservation ceiling. Known usage is stored separately on the attempt before publication, including known usage when output validation fails. Missing cache-write detail uses the maximum previously documented rate; the additional 10% remains contingency, not regional processing. Estimates are not invoices and do not imply EU residency. Unknown usage remains null while its reservation stays consumed.

Official references checked during implementation: [counting guide](https://developers.openai.com/api/docs/guides/token-counting), [count endpoint](https://developers.openai.com/api/reference/resources/responses/subresources/input_tokens/methods/count), [token accounting](https://help.openai.com/en/articles/4936856-understanding-and-counting-tokens), [selected model](https://developers.openai.com/api/docs/models/gpt-6-luna), [pricing](https://developers.openai.com/api/docs/pricing). Existing short-context Standard rates are retained: input $0.10/M, cached $0.01/M, maximum cache-write $0.25/M and output $0.50/M. Count calls are documented free; no inference request was made to verify these facts.

Requests use AbortController, a ten-second per-request timeout bounded by the remaining lease deadline, bounded response reads, response cancellation and sanitized error categories. Service timeout aborts the adapter. No generation is dispatched after an aborted/expired deadline. Abort cannot prove that an external provider stopped work already accepted. Expired-lease recovery can overlap such work; publication fencing and retained reservations remain mandatory. Exactly-once external execution is not claimed. Account/provider-specific recovery and billing reconciliation remain open before production use.

## Persistence and provenance

Draft migration `0002_openai_translation.sql` preserves all prior mock/manual records and reservations, rebuilds the translation identity to include provider mode, and adds provider mode/usage JSON/conservative cost to the attempt ledger. It recreates the affected triggers without disabling foreign keys. Historical migrations 0000/0001 are unchanged. `schema.sql` remains the fresh bootstrap, now including 0002; an existing database must use tracked migrations, not rerun schema.sql.

Mock and OpenAI results cannot satisfy each other's cache identities. Service reads/corrections select their configured mode. Guest rendering accepts only saved OpenAI rows; historical mock echoes are never served as translated content. The local adapter rekeys old mock entries in memory without changing guide rows and persists the extended state only on normal authorized writes. No owner database was accessed. Disposable JSON and SQLite fixtures verify persistence, migration preservation and real/mock separation.

Conditional publication, section/source-language versions, targeted invalidation and submitted manual-correction source/identity/content snapshots remain in effect. Unchanged sections and manual corrections retain valid caches. Usage costs do not release or shrink worst-case reservations.

## Application flow

New host operation: `POST /api/guides/:id/translations` with only `section`, `sourceLanguage` and `targetLanguage`. The existing hashed per-property bearer-token ownership check runs before service construction, body parsing or provider work. Input is capped at 4 KiB and uses the existing locale/section allowlists. Source language is explicit, never inferred as English. Generation pins that requested source language; a failed/concurrent language change cannot silently translate a different source language. Protected projection still excludes Wi-Fi fields, property names, DB identifiers, edit tokens and authentication rows from provider payloads.

`GET` at the same owner-authenticated route accepts `section` and `lang` query parameters and returns saved/fallback content plus editor concurrency metadata. It cannot generate. Authentication uses the existing prototype ownership mechanism, not new production accounts. Anonymous property creation is still possible; production identity/trial/abuse/privacy gates remain open even with bounded global quotas.

Live wiring defaults off. Only a trusted server binding `TRANSLATION_LIVE_ENABLED='true'` can enable the default adapter, with `OPENAI_API_KEY` supplied as a server secret. No binding/settings/environment file was changed. The existing Node preview passes neither binding and does not load .env.local. An explicit callback-binding bootstrap is therefore still needed for a separately authorized local controlled test. Do not enable this flag as a deployment action.

Guest URLs may request saved content with `?lang=el-GR` (or another allowlisted locale). Guest rendering only reads current saved OpenAI translations; missing/unavailable/stale content falls back to original section content. No count/generation/credential callback runs on guest views. Translated field spans carry their own language tags; application UI labels remain English and separate. HTML escaping, noindex/CSP, Wi-Fi behavior, canonical QR/card and PDF logic remain intact. There is no complete host/guest language chooser or translated PDF workflow in this phase.

Raw provider bodies, exceptions and authentication headers are not returned or logged. Exact credential echoes, credential-shaped strings and invalid protected values fail validation; valid usage can still be reconciled. The outer Worker error log is now static. Field allowlists do not certify arbitrary prose as non-sensitive: a host can type private data into otherwise eligible text. A reviewed consent/redaction policy remains necessary before enabling real host-content transfer.

## Verification

- PASS: 26 mocked OpenAI integration cases; no real HTTP destination or real key is used. Cases cover default disablement, authoritative count/generation equivalence, reservation ordering, usage/cost reconciliation, persistence across adapter restart, cache hits, provenance separation, invalidation, concurrency, stale publication, malformed results, limits, 401/429/500, timeouts/abort, oversized body cleanup, owner authentication and guest saved-only access.
- PASS: existing 25 translation-foundation cases and full npm test (nine files), including existing host/guest/QR/PDF suites.
- PASS: installed-Python SQLite migration/local parity, competing claims/corrections, real-mode reconciliation and preservation of existing manual mock rows/reservations through migration 0002. These use disposable databases only.
- PASS: existing Chrome regression suite with in-memory DB and dedicated ignored `.local/qa/sg-p31-phase3b-browser-r2` artifacts: host creation/editing/switching, keyboard/mobile behavior, guest no-JS/escaping/layout, QR/Print and thirteen real SG-P22 fixture PDFs. The first sandboxed attempt failed at subprocess spawn with EPERM; scoped execution approval allowed the unchanged suite to pass. No owner browser profile, SG-SHARE01 process or port 8787 was used.
- Actual Cloudflare D1 local-runtime verification was unavailable: no installed wrangler/node_modules runtime. No packages were installed. D1 migration tracking/rollback, trigger/binding execution, meta.changes semantics and runtime contention must still be verified before deployment. SQLite is supporting evidence, not a D1 certificate.
- Browser translation selection has no UI yet and was verified through mocked HTTP/SSR Node tests, not a new browser language-picker scenario. Real account/model access, live tokenization, generated translation quality, invoices and physical device/print/QR verification are not established here.

Commands: `node tests/openai-integration.test.js`, `node tests/translation-foundation.test.js`, `python3 tests/translation-storage.sqlite.py`, `npm test`, `git diff --check`. No dependency or package/configuration change is required.

## Requirements for ONE separately authorized live test

1. Independent review and explicit new owner authorization for one count and at most one generation, this adapter/model/Global tier, zero retries and concurrency one. Phase 2B permission is consumed and cannot be reused.
2. Approve exactly one frozen synthetic section/direction, its protected values and explicit source language; no owner dataset/private prose. Confirm the actual account/model access, current rates and terms without exploratory generation.
3. Approve secure reuse/read of the existing ignored key into a transient server-only callback; never print/write/hash it. The current task has not read it. A reviewed one-shot test bootstrap must bind it only for the authorized invocation and leave normal server defaults disabled.
4. Use a disposable database with reviewed migrations and **max_requests=1**, **per_minute=1**, **budget_nano=660000**, no reset or refund. This bounds one generation's reserved usage to $0.00066 using the retained 800/800 maximum plus contingency. Failure/uncertainty consumes the authorization; do not retry. Additional account funding or larger budget needs separate approval.
5. Record sanitized calls/usage/reservations/provenance and actual response; verify saved-content reuse with zero further provider calls, then terminate the one-shot bootstrap. Keep output review and independent invoice verification separate from engineering success. A deployment/production D1 migration is not part of this test.

## Mandatory next product checkpoint

“After completing the first functional AI Translation experience, perform a comprehensive StayGuide Product & Architecture Review before the next major feature.”

This review consolidates the complete roadmap, prior product decisions, competitor research, technical architecture, scalability, privacy, operating costs and future business requirements. It is **not a blocker for Phase 3B** and is not being performed or automatically started here. No next major feature follows without the checkpoint and separate owner authorization.

**READY FOR INDEPENDENT REVIEW.** No paid execution, production readiness, migration execution, release or next phase is approved by this report.


## 2026-11-18 — one-shot preparation follow-up

The separately authorized [one-shot preparation](SG_P31_PHASE3B_ONE_SHOT.md) now supplies a default-dry-run harness for frozen H08 English→German, with exclusive durable guard, fresh single-attempt database, 660,000-nanodollar reservation and mocked offline tests. The low-severity reconciliation fixture now genuinely rejects translated content while asserting known usage and original fallback. Preparation awaits independent review; no credential read or live execution occurred. All live-test approval requirements above remain in force.

## SG-P31-P3B-FINAL-01 — post-live finalization and review

2026-11-20. Documentation finalization and offline verification against HEAD `ae28efe7bf35c8c0667d420932ce7a1cdb723731`, main, exactly nineteen unstaged pending paths, no staged changes. Reviewed actual provider/service/store/Worker/adapter/migration changes, tests and documentation against HEAD, including all new files. No implementation changes were made in this task. The earlier live authorization is fully consumed.

### Evidence and interpretation

[Retained live results and original/translated H08 text](SG_P31_PHASE3B_ONE_SHOT.md#post-live-evidence--sg-p31-p3b-final-01-2026-11-20): one count plus one generation, 134 input / 51 output / zero reasoning tokens, estimated Standard $0.00003890, conservative $0.00004279, retained reservation $0.00066. The 6.429-second full harness duration includes local verification and is not isolated API latency. Journal final summary, saved report and disposable database agree; real OpenAI provenance, protected values, persisted translation, zero-additional-call cache verification and saved-only guest SSR were verified. This task inspected retained records; it did not rerun live verification. Estimates are not invoices. Qualified bilingual review remains pending; a single synthetic direction does not satisfy the broader language-coverage gate.

### Exact pending inventory

```text
docs/ARCHITECTURE.md
docs/IMPLEMENTATION_TASKS.md
docs/PROGRESS.md
docs/ROADMAP.md
docs/TESTING.md
node/db.mjs
schema.sql
src/translation-service.js
src/translation-store.js
src/worker.js
tests/translation-foundation.test.js
tests/translation-storage.sqlite.py
docs/SG_P31_PHASE3B_INTEGRATION.md
docs/SG_P31_PHASE3B_ONE_SHOT.md
migrations/0002_openai_translation.sql
scripts/translation-one-shot.mjs
src/openai-translation-provider.js
tests/openai-integration.test.js
tests/translation-one-shot.test.js
```

The first twelve paths are tracked modifications; the last seven are new, unstaged files. Credentials, local databases, journals and generated evidence remain ignored. Finalization changes are limited to the seven documentation files in this inventory. Source, tests, migrations and schema remain identical to their pre-finalization bytes. SG-P22, SG-SHARE01 and historical Phase 2A/2B evidence remain preserved. No new tracked path, staging, commit, push, deployment or production migration is part of this task.

### Remaining acceptance boundaries

No blocking implementation defect was identified in this bounded finalization review. Actual Cloudflare D1 execution remains unverified; SQLite/local parity is supporting evidence only. Lease expiry can overlap externally accepted work; old publication is fenced, reservations stay consumed and exactly-once external execution is not guaranteed. Production recovery/cancellation, privacy/consent for arbitrary host prose, secure accounts/trial/abuse limits and billing verification remain launch gates. UI catalogs/host and guest choosers, translated PDFs, CJK/RTL/font/directional quality and real-device/physical-print/public-URL scanning are not completed by this test. Existing English UI and original-language fallback remain deliberate boundaries.

Owner acceptance of the bounded Phase 3B foundation is separate from full SG-P31 completion, a Git checkpoint and deployment. SG-P31 remains IN PROGRESS. Recommended next task is owner acceptance of Phase 3B; the mandatory comprehensive Product & Architecture Review remains separately authorized work before the next major feature. Do not start Phase 3C automatically.

### Final offline verification results

- PASS: full `npm test`, ten test files, zero failures. Test entry points were inspected before execution: real provider transports are replaced by explicit mocks; historical transport tests use mocked HTTPS objects, not connections. A temporary preloader under ignored `.local/qa/sg-p31-p3b-final-01/` blocks fetch/socket/HTTP/DNS transport and credential-file reads. Only legacy Phase 2A/2B fixture writes are virtualized in memory to preserve retained artifacts; new disposable foundation/one-shot persistence tests still exercise real local files. No tracked runner or configuration was changed.
- PASS: focused harness 26/26, OpenAI integration 26/26 and foundation 25/25, including cache/invalidation, language fallback, authentication, provenance, manual correction fencing, no retries and reservation reporting under unreadable/malformed/contradictory state.
- PASS: installed-Python SQLite tests, four reported groups: legacy/fresh migration and local statement parity; competing claims and cumulative budget; competing manual corrections; migration 0002 preservation plus provenance/usage reconciliation. All databases disposable; no D1 operation.
- PASS: default-dry-run plan, zero transport/credential/guard activity, unchanged frozen H08 and 800/800/$0.00066 configuration. Frozen corpus SHA-256 remains `d08695f229067cda36a8d1113b97cb243b7914c51e1655c8822622702d9d78fd`.
- PASS: unchanged complete Chrome host/guest/QR/PDF suite using a synthetic in-memory database, ephemeral localhost server and dedicated ignored `browser-r3` profile. Includes property creation/switching/edit/save/progress, mobile tabs and keyboard/focus, guest no-JS/fallback/escaping, QR PNG/SVG equivalence, actual A4/A5 downloads, thirteen fixture PDFs and three warm repeats. Two earlier runs stopped because the temporary safety guard blocked localhost DNS, then localhost QR fetch; only the ignored guard was corrected to allow loopback. The final full run passed; no application/test fix or external service request was needed. Chrome external proxy/DNS/background-network restrictions were supplied through an ignored wrapper; Node external transport and credential reads remain blocked. Scoped subprocess approval was used to run Chrome; no persistent permission settings changed.
- PASS: `python3 scripts/verify-welcome-books.py` on the new browser-r3/book output: all thirteen PDFs pass saved-text ordering/completeness, A4/A5 geometry, embedded-font, bounds/overlap/blank-page, cover/pagination/heading and canonical QR module/quiet-zone assertions. Rendered QR matching is not independent decoding or a physical scan. Existing independent decoding evidence remains historical, not rerun here.
- PASS: retained Phase 2A/2B and Phase 3B live artifact SHA-256 and modification timestamps match the pre-task snapshot; consumed guard and request hashes unchanged. All twelve pending non-documentation files are byte-identical to pre-finalization state. No pending changes to SG-P22/SG-SHARE01 or prior committed corpus/evidence sources.
- PASS: exact nineteen-path unstaged inventory, unchanged baseline HEAD, no staged changes, local relative documentation links, all pending-file whitespace and `git diff --check`. Full pending diff, including new files, inspected. No credential-shaped API-key literal found in those files; credentials themselves were never opened or hashed.

Offline logs, disposable verification outputs and the pre-task artifact manifest are retained separately under `.local/qa/sg-p31-p3b-final-01/`; they do not replace live evidence. No new live/count request, credential access, spend, production migration, deployment, stage, commit or push occurred. **READY FOR OWNER ACCEPTANCE of bounded Phase 3B**, subject to the explicit limitations above; not production-ready. STOP for owner approval.
