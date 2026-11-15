# SG-P31 Phase 2A — offline benchmark preparation

2026-11-15. Owner-authorized offline infrastructure only, starting clean on `main` at `017fe434d6dc69c0a773748f8a74c8eb56b1ab47`. No real translations tested, provider selected, credential/environment-file access, network/provider calls, billing, installations or production changes. SG-P31 remains IN PROGRESS; live benchmarking requires separate authorization.

## Exact source inventory

Created:

- [scripts/translation-benchmark.mjs](../scripts/translation-benchmark.mjs): standalone built-in Node module/CLI; no SDK, transport, API endpoint, environment read or credential interface.
- [tests/fixtures/translation/corpus.jsonl](../tests/fixtures/translation/corpus.jsonl): exact machine-readable extraction of the approved Phase 1 block, final LF included.
- [tests/fixtures/translation/proposed-live.json](../tests/fixtures/translation/proposed-live.json): unapproved future execution proposal, with live execution disabled and prerequisite/funding notes.
- [tests/translation-benchmark.test.js](../tests/translation-benchmark.test.js): 24 focused offline regression checks, included by unchanged `npm test` discovery.
- This preparation report.

Updated only directly relevant [IMPLEMENTATION_TASKS.md](IMPLEMENTATION_TASKS.md), [ROADMAP.md](ROADMAP.md) and chronological [PROGRESS.md](PROGRESS.md). No package/test-runner configuration, application, dashboard, guest guide, PDF generator, server, database, authentication, decisions, completed statuses, SG-SHARE01 or prior evidence changed.

## Running and artifacts

From the repository root, using installed Node 20 and built-ins only:

```sh
node scripts/translation-benchmark.mjs
node tests/translation-benchmark.test.js
npm test
```

The CLI accepts no arguments; live mode, input paths and output overrides are rejected. It loads only the fixed approved corpus and proposal fixture, then writes four fixed files under ignored `.local/qa/sg-p31-phase2a/`: `manifest.json`, `mock-results.json`, `human-review-template.json`, `proposed-execution.json`. Generated output is not tracked. Dedicated artifacts are reproducibly refreshed; no external directory or owner dataset is used. Output directories must be real directories, and artifact symlinks are not followed. These filesystem checks are guardrails, not a replacement for the existing sandbox.

The corpus has **24 cases, 20 English and 4 Greek**, SHA-256 **`d08695f229067cda36a8d1113b97cb243b7914c51e1655c8822622702d9d78fd`**. The harness rejects altered bytes or caller-supplied corpus content. It generates exactly **192 jobs per variant / 960 total** across OpenAI Luna, Gemini 3.5 Flash-Lite, Cloud Translation NMT, Cloud Translation LLM and DeepL quality mode. DeepL's mock inclusion does not establish live eligibility. Each job contains case ID, source/target locale, section, protected strings, semantic assertions, source text and provider/model variant. Validation compares the complete manifest to the approved matrix, catching substitutions, duplicate/missing jobs and lost assertions. Execution order uses deterministic seed 3101.

Only English and Greek are sources; the other seven locales are targets. The pilot does not validate hosts authoring directly in those languages. The [Phase 1 directional coverage gate](SG_P31_PHASE1_RESEARCH.md#directional-coverage-gate-before-multilingual-authoring-claims) remains required before comprehensive authoring claims. No extra source cases or pilot jobs were added.

## Mock evaluation and reusable review format

Mocks deliberately echo frozen source with `[MOCK ONLY — NOT TRANSLATED]`. The CLI exercises deterministic missing results, malformed outputs, simulated unavailable errors and protected-string omissions. These failures are test fixtures, not provider reliability or translation-quality measurements. A separate all-success mock path is covered by tests.

Every result records provider/model, case/source/target identity, request status, output, allowlisted simulated error, automated structural/protected-string findings, and pending human review. Duplicate or unknown response records are surfaced; malformed raw exception fields are not copied into reports. `mode=offline-mock` and `simulated=true` are explicit. `measurements.provenance=unavailable-offline`; input/output tokens, actual billed cost/currency and latency are **null**, not fictional measurements or zero-cost claims. The evaluator rejects response records trying to inject measurement fields or claim live provenance. Timing from test execution is harness runtime, not provider latency.

The emitted human-review template provides one pending row per job with semantic assertions, reviewer identity, notes and null 0–4 score slots for meaning, negation/safety, numbers/times, names/addresses, terminology, naturalness, and missing/invented information. Critical-error classification is null until qualified human review; automated protected-string checks cannot assign semantic safety. Use the [Phase 1 methodology](SG_P31_PHASE1_RESEARCH.md#reproducible-methodology--prepared-not-executed): independent target references, two bilingual reviewers and adjudication, per-direction reporting and zero critical errors. Do not score mock source echoes as real translations. Live-response ingestion/measurement provenance and reviewer score validation are future scope, not implemented here.

## Verification results

- Focused suite: **24 named tests PASS**, including corpus/report-byte parity, tampering rejection, 192/variant and 960 total, uniqueness, 16 sampled directed pairs/variant, rejected manifest changes, exact Unicode protected strings, malformed/missing/duplicate/unknown results, simulated errors, null measured data/scores, config caps and cost arithmetic.
- Full `npm test`: **6 files PASS, zero failures**, including the five pre-existing regression files. No browser/PDF rerun for standalone offline tooling; prior evidence remains unchanged.
- Complete offline run twice: all four artifact byte sequences identical. Network/DNS/socket/fetch and subprocess entry points were trapped during both runs; **zero attempts observed**. Static import audit permits only fs, crypto, util, url and path built-ins; no dynamic imports, API transport or environment reads in the harness. This verifies this offline code path, not a general security proof for future adapters.
- CLI result: 960 rows, 888 structurally `ok`, 24 simulated provider errors, 24 missing and 24 malformed; eight protected-string failures among structurally valid mock rows. These intentional negative cases were detected as expected. Unexpected records: zero. Human review pending and real translations tested false.
- Generated artifacts confirmed ignored. Local documentation links, task/decision/completed-status scope and `git diff --check` pass.

An initial subprocess-based test design encountered sandbox `spawnSync EPERM`; tests were changed to exercise the complete exported run in-process with restored network/subprocess traps. Final focused/full suites pass without escalation or permission/configuration changes. No test was skipped to hide the restriction.

## Preserved future limits and unresolved live prerequisites

The [proposed configuration](../tests/fixtures/translation/proposed-live.json) is **not** a live runner, enforceable spending ledger or spending authorization. All five variants retain the Phase 1 one-pass proposal: 192 jobs/variant, at most one retry/job, 384 attempts/variant and 1,920 across all five. Limits stay 1,200 source code points, 800 general-model input tokens and 800 total billable output tokens including thinking. The specialist 2,400-output-character validation assumption remains **unproven as a billing bound**. No retries are dispatched by this offline harness.

Phase 1 standard usage estimates remain $0.18432 Luna, $0.86016 Gemini, $9.216 NMT and conditional $13.824 TLLM, totaling $24.08448. The proposed $30 USD ceiling covers those four priced variants only, excludes DeepL, taxes and account funding, and is **not authorization**. Optional applicable OpenAI 10% regional processing yields $0.202752/$24.102912; no EU residency is enabled or approved. Exact limits, pricing, models and terms must be reverified before any future live run; this phase did not perform fresh network research.

| Candidate | Account/funding prerequisite retained from Phase 1 — no setup performed |
|---|---|
| OpenAI GPT-6 Luna | Confirm model/endpoint/account and applicable residency terms. Phase 1 official documentation recorded $5 minimum prepaid funding; verify current minimum/expiry and obtain a distinct funding cap. Existing credits are not authorization. |
| Gemini 3.5 Flash-Lite | Confirm project/region, thinking/token settings and current purchase minimum (Phase 1: typically $5, account/region dependent). Public family-accessible QR guides raise explicit under-18 API-client eligibility risk; provider clarification/qualified review required for production. Server-side or saved-result delivery is not an assumed exemption. |
| Cloud Translation NMT | Confirm Cloud project/API/billing eligibility, exact endpoint/languages and app-level hard budget. No assumed free-credit, promotional or commitment discount. Any actual funding/commitment condition needs separate approval. |
| Cloud Translation LLM | Same account/endpoint checks plus a documented enforceable output-charge bound. The output validator cannot prevent a provider charging for an oversized response; proposed estimate is conditional. |
| DeepL quality mode | Obtain official regional API quote (fixed/recurring fee, included usage, overage, currency/tax), language/model capability evidence, terms/DPA and separate subscription/funding/usage caps. No numeric live maximum is justified yet. Do not substitute a free tier with different privacy terms. |

No credentials/private environment files were inspected. The runner uses only approved synthetic source, not application state or host data. Real provider latency, tokenization, translation fidelity, reliability and billed cost remain unmeasured. Gold references and qualified review coverage remain outstanding. CJK/RTL fonts/shaping/PDF handling and the wider directional coverage gate remain unresolved; offline mocks close none of these launch gates.

Next authorization boundary: owner independently reviews this preparation. Any later live benchmark requires exact variants/accounts/endpoints, applicable privacy/age/residency terms, credential handling, synthetic matrix, attempt/token/billing bounds, separate API-usage and funding/subscription caps, measurement/logging protocol and qualified reviewers, plus explicit permission to build a live adapter. No automatic network enablement or live execution exists in this harness. No commit, push or deployment performed. STOP.
