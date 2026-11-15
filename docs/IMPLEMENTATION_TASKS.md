# Implementation tasks — controlled milestones

**Rule:** One task ID per prompt. Agent must STOP after reporting; no self-directed continuation. Dependencies are explicit. Do not deploy or push.

This file is authoritative for task definitions and acceptance criteria. See [ROADMAP.md](ROADMAP.md) for live statuses, dependency tracking and next steps, [PROGRESS.md](PROGRESS.md) for verification evidence, [DECISIONS.md](DECISIONS.md) for decisions, and [AGENTS.md](../AGENTS.md) for operating rules. Planned work is not implementation authorization.

## P0 — Repository and baseline
- **SG-P00** (first): read-only audit of imported v0.2; inspect Git, code, routes, tests, security gaps, screenshot/reference mismatches. No code changes. Output audit report. Acceptance: actual test result, accurate inventory, risks, next proposed task.
- **SG-P01**: minimal baseline fixes approved after audit, with tests. Acceptance: no regressions; diff reviewed.

## P1 — Warm host UI (after P00/P01)
- **SG-P10**: design tokens + responsive host shell/sidebar. Acceptance: desktop/mobile screenshots, no broken current flows.
- **SG-P11**: property thumbnail tabs, cards, progress and quick actions using existing data only. Acceptance: state consistent with saved fields; no fake stats.
- **SG-P12**: compact editing drawer/mobile panel. Acceptance: keyboard, focus, save/error behavior.

## P2 — Guest UI and print
- **SG-P20**: warm mobile guest layout, SSR first; no JS required for reading. Acceptance: screenshot parity direction, noindex, Wi-Fi copy.
- **SG-P21**: print/QR screen and QR PNG/SVG exports. Acceptance: scannable QR and correct link.
- **SG-P22**: reliable filled A4/A5 Welcome Book PDF foundation from shared saved content. Preserve SG-P21 workspace, QR exports and single-card implementation; extend their real workspace rather than building a duplicate export application. This planned task requires a separate implementation prompt; no PDF technology is selected.
  - First investigate Workers runtime compatibility, pagination, Unicode/font coverage and embedding, generation/storage/egress costs and maintainability; present evidence and obtain approval for technology/dependencies/services before implementation. D-013 remains open. This documentation task has not performed that investigation.
  - Acceptance: independent downloadable PDF from saved content, A4/A5 pagination and fonts verified; omit empty fields; preserve multiline/long/Unicode text, QR exact destination/quiet zone, grayscale legibility, margins and property association. Guest-facing Wi-Fi credentials intentionally saved by the host for guest use may appear in the appropriate guide or printable. Private owner edit tokens, authentication credentials other than those intentionally guest-facing Wi-Fi details, keybox/access codes, alarm secrets and other non-guest information must never appear in public exports. Do not count a browser-printed single QR card as a book.
  - Reuse canonical content/section definitions, with no separate PDF editor. Photos and language selection apply when their separately approved capabilities exist; do not make SG-P30/SG-P31 prerequisites for the first text-only book. First public release still requires its approved translation scope.
  - Filled/blank evaluation: shared primitives are useful, but handwriting space, section selection and empty-property export need different tests. Recommend filled foundation first and proposed SG-P23 separately. Any combined delivery needs an explicit bounded scope approval after feasibility evidence; blank output is not silently included in SG-P22 acceptance.

## P3 — Feature completeness
- **SG-P30**: photos, validation, size variants, storage decision.
- **SG-P31**: multilingual architecture/cost comparison; implementation only after decision.
- **SG-P32**: multiple-account property management, duplication, language settings.

## P4 — Commercial readiness
- **SG-P40**: true 24h anonymous trial and migration, with abuse controls.
- **SG-P41**: secure accounts/sessions/recovery.
- **SG-P42**: payment/tax research and approved billing integration.
- **SG-P43**: monitoring, backup/restore, GDPR/legal and security review.

## P5 — Launch (explicit authorization only)
- **SG-P50**: marketing/SEO, staging performance, pilot feedback. Own approved implementation, publication and launch validation; proposed SG-SEO-01 supplies research/architecture recommendations only, not a second marketing implementation task.
- **SG-P51**: production launch only after all gates and user approval.

Tasks may be reordered with documented rationale and user approval; this list is a roadmap, not authorization to implement everything.


## SG-DOC02 — documentation/planning scope

Record approved expansion principles, reconcile actual SG-P21 checkpoint/evidence, map candidate overlap and prioritize without implementing. Acceptance: consistent product/roadmap/decision boundaries, unique candidate IDs, valid internal references, documentation-only diff, actual test/diff results. See [PRODUCT_SPEC.md](PRODUCT_SPEC.md) for authoritative candidate requirements and [PROGRESS.md](PROGRESS.md) for completion evidence.

## Proposed tasks — NOT AUTHORIZED

These IDs are reserved proposals checked against the existing catalog. They do not alter completed task statuses, approve implementation or add MVP launch gates. A separate user prompt must approve each precise scope. Unnumbered candidates in the product specification are not implementation tasks yet.

### SG-P23 — Blank Welcome Book (PROPOSED / NOT AUTHORIZED)

- Depends on an approved shared PDF foundation/technology under SG-P22 and D-013, unless a separately approved combined scope replaces this proposal; no new data editor.
- Candidate acceptance: A4/A5 default basic template and optional section selection from the same definitions, no saved field values, adequate writing space, useful for a new property with otherwise empty content; Unicode, blank-content/identity policy and pagination verified independently from filled output. No additional mandatory setup.

### SG-P24 — Quick Guide and Individual Printables (PROPOSED / NOT AUTHORIZED)

- Depends on reusable section definitions and approved rendering approach; approve individual formats incrementally rather than bundling all candidates into a release requirement.
- Candidate scope: one-page filled/blank Quick Guide where practical, Wi-Fi card, connection-QR card, House Rules sign, departure checklist and emergency sheet. Reuse SG-P21 for a Welcome QR sign; new A4/compact card variants require explicit scope. Connection-QR output depends on separately approved encoding/privacy work, not the guide-link encoder alone.
- Acceptance per approved format: readable page count/overflow policy, correct shared values or intentionally blank writing fields, Unicode/grayscale/margins/QR checks, clear selected property. Guest-facing Wi-Fi credentials intentionally saved by the host for guest use may appear in the appropriate guide or printable. Private owner edit tokens, authentication credentials other than those intentionally guest-facing Wi-Fi details, keybox/access codes, alarm secrets and other non-guest information must never appear in public exports. Organize implemented exports in the existing workspace; ZIP kit deferred, no separate editor.

### SG-P33 — Optional Content Expansion (PROPOSED / NOT AUTHORIZED)

- Depends on approved taxonomy/lifecycle/compatibility design, not on SEO, photos or speculative analytics. Coordinate ordering with SG-P32 if necessary without changing SG-P32's existing scope.
- Candidate acceptance: proposed + Add more information flow, overlap map and reuse of logical sections; additional content hidden until explicitly enabled; defined activation/hiding/removal/retention/empty-value/order/export eligibility; reusable section/editing patterns, keyboard/mobile usability, unchanged default ten-section flow. Approve any needed API/schema work separately before implementation.

### SG-SEO-01 — SEO Guides Research & Architecture Proposal (PROPOSED / NOT AUTHORIZED)

- Independent research/planning task; no dependency on SG-P22 and no authority to implement routes or publish. Deliver `docs/SEO_GUIDES_PROPOSAL.md` only when this research task is separately authorized; do not create it during SG-DOC02.
- Verify commercially relevant search intent and competitor/content evidence for vacation-rental owners researching digital guidebooks, welcome books, house manuals, QR guides and printables. Cite sources/access dates; no invented keyword volume, ranking difficulty, traffic, sales or customer evidence. Include verifiable guidebook-service and Etsy printable comparisons where relevant, distinguishing observed listings from proven sales.
- Recommend exactly three evidence-based initial guides, with proposed titles, URLs, outlines, distinct value and factual availability claims. No generic mass-produced AI articles; human approval before publication.
- Propose an elegant design-system-aligned `/guides/` landing page, static/SSR indexable pages, metadata, canonical URLs, sitemap inclusion, internal links and appropriate structured data. Preserve noindex `/g/:id`; inspect existing response-header/metadata boundaries so editorial indexing never relaxes guest privacy. Fast mobile/minimal dependencies; justify any architecture changes rather than selecting them unilaterally.
- Describe a future AI-assisted research/refresh workflow using Search Console data subject to access/approval, with human review and no automatic publishing. SG-P50 owns approved marketing implementation/publication/performance/pilot work, avoiding duplication.

## Proposed sequencing — requires later authorization

1. Finish existing core MVP obligations and the focused SG-P22 filled-book foundation; retain security, translations, trial/accounts and commercial gates for public release.
2. Evaluate bounded low-complexity Wi-Fi connection QR, static suggested content, one-tap/native-sharing actions and copy/share message templates. They need individual task scopes; all remain optional, no auto-sending/integrations.
3. Consider SG-P23/SG-P24 and SG-P33 only for justified value; do not block a first useful filled book on blank variants or additional sections.
4. Continue approved SG-P30 photo planning/implementation when separately authorized, with storage/limits/validation decisions. Themes, offline access, analytics and advanced organization remain deferred/research-only, without new task IDs or release dependencies.

This recommendation balances UX and test cost, not proven demand. It does not approve reordering P3/P4 or change SG-P31/SG-P40–SG-P43 requirements. SG-SEO-01 research can run independently once authorized.

## SG-UX-01 — Premium, compact host dashboard (owner-authorized 2026-11-13)

- Focused host-only visual/layout revision after isolated SG-P22-POC-R1: remove dashboard hero/marketing headings; compact top bar/property tabs; one coherent selected-property surface with saved state, three existing actions and ten existing editable cards. Preserve drawer, creation/switching, progress semantics, API/model, guest SSR/noindex and privacy boundaries.
- Compact 260–320px desktop progress panel beside the section grid, including ten truthful saved complete/started/empty statuses; reposition below editing on small screens. No mandatory property photos. Warm off-white/navy/violet direction from the two owner references; no new navigation/features/dependencies.
- Polish SG-P21 QR/Print presentation with implemented output choices and a useful selected-property layout preview. Preserve canonical QR, actual SVG/PNG downloads and native A5-card Print / Save as PDF. No Welcome Book button/generator, fake actions, API/schema change or SG-SHARE01 modification.
- Acceptance: actual rendered inspection at 1440/1280/768/390/320px; visible editing/cards earlier on laptop; no horizontal page overflow/clipped controls; tab stress, accessible editor/keyboard/save-state and QR/Print regressions pass; unchanged guest pages. Run unit/integration/browser checks, record evidence/limits, provide an owner-review ZIP under 10 MB with manifest and full evidence separately outside Git. No commits/push/deploy. STOP for owner visual review.
- Record approved future PDF visual direction in DESIGN_SYSTEM.md; this does not select technology, close D-013 or authorize PDF integration. Minimize approval requests through the existing repository browser harness and scoped local review artifacts; never weaken sandbox or configuration.

## SG-UX-01-R1 — Final dashboard polish (owner-authorized 2026-11-14)

- Preserve the reviewed SG-UX-01 layout and all pending changes. Remove only the duplicate property-strip plus button (keep the labelled top-bar Add a property) and sidebar slogan. Retain current creation behavior.
- Reuse one status-mark presentation in cards/checklist: neutral outlined circle for Empty, solid amber circle for Started, green check for Complete, with readable labels/accessible descriptions. Do not change saved data, completion rules/counts or transitions.
- Verify multiple/long property tabs at 320/390px: fully visible selected tab, discoverable overflow, native horizontal scroll and keyboard access without page overflow. Keep tabs; no dropdown/workflow replacement.
- Strengthen compactness acceptance using stable position/visibility limits that remain valid after commit, independently of Git HEAD comparisons. Complete Node/Chrome regressions and screenshot review at 1440/1280/768/390/320px; compact review ZIP under 10 MB and separate full evidence in StayGuide-Reviews.
- Owner reports successful actual local-app interaction testing and approves the overall layout in principle; record separately from automated verification. No guest/API/schema/dependency/PDF/accommodation-type/terminology/SG-SHARE01 changes, unrelated task, commit/push/deploy. STOP for explicit final owner approval.


## SG-P22 — Filled Welcome Book integration (owner-authorized 2026-11-14)

- Approved: exactly pdfmake 0.3.14, locally served browser bundle, embedded Noto Sans Regular/Bold with MIT/OFL/third-party notices; lazy browser-only generation. No service, storage, endpoint, new framework or broad build pipeline.
- Extend existing QR & Print with Filled Welcome Book, A4/A5 and one Download PDF action, selected-property feedback and failure/retry. Preserve compact dashboard, canonical guest/QR/card and API/schema.
- Capture only accepted saved canonical fields; reject unsupported font characters and flagged private content, with contextual privacy guidance. Invalidate pending exports on property/load/save/workspace changes, never include drafts or credentials. All ten nonempty sections, multiline/long/Greek text; minimal-content sensible output.
- Independently inspect generated PDFs: A4/A5 dimensions, embedded fonts, selectable complete ordered text, pagination/bounds, rendered visual review and canonical QR decoding where available. Test unsupported glyphs/privacy/failures/stale/duplicate exports, no eager assets, desktop/390/320 workspace and all existing Node/Chrome regressions. Measure actual raw/compressed payload and browser timings/memory where feasible.
- Compact owner package under 10 MB (A4, A5, Greek, long fixture PDFs; desktop/mobile workspace; report/file list/hash manifest), technical evidence separately outside Git. Record unavailable browsers/devices/physical scans/prints; first-release security/multilingual gates remain. No blank book, extra printables, photos/translations, SG-SHARE01, commit/push/deploy or next task. STOP for owner review.


## SG-P22-R1 — Premium editorial design and pagination (owner-authorized 2026-11-14)

- Refine only the existing filled-book presentation: warm editorial cover with composed top/middle/bottom, integrated canonical QR/link, restrained rules/geometry and discreet branding; consistent interior icons, typography/rhythm/dividers, page furniture and Wi-Fi/arrival hierarchy. No imagery, host fields, themes or new product features.
- Improve Greek/typical A5 sparse final-page flow with spacing/keep-with-next rules; no content loss, tiny type, unsafe margins, clipping or stranded headings. Preserve exact saved projection, privacy/glyph checks, fonts/pdfmake pin, lazy assets, stale-export guards, canonical QR and host/guest/QR/card/API/schema behavior.
- Preserve all 32 pending SG-P22 paths. Compare the existing review fixtures/PDFs; inspect typical A4/A5, Greek, long, minimal and max-content output with independent text/font/bounds/QR raster checks and available decoding. Run relevant complete regressions.
- Keep all new QA artifacts within `.local/qa/SG-P22-R1/`; owner package under `.local/reviews/SG-P22-R1/` with updated A4/A5/Greek/long PDFs, every-page sheets, before/after images, report/checks/limits and manifest. No dependency/network/config/rule change, external copy, commit/push/deploy or next task. STOP for owner review.


### SG-P22 final acceptance / commit-readiness review — 2026-11-14

Owner approves R1 visual direction and reports prior independent decoding of all four R1 review PDFs. Authorized review only: inspect the complete 32-path pending implementation, credentials/scope/provenance; rerun Node/Chrome/Firefox/PDF checks; distinguish refreshed automation from owner reports and launch gates; provide an actual-interface checklist and commit-readiness verdict. Preserve application/SG-SHARE01; no fixes/features, dependencies, photographs/showcase, commit/push/deployment or next task. Implementation deliverables verified; actual-interface acceptance and explicit Git approval remain owner actions.


## Launch alignment planning clarification (2026-11-15)

[Launch alignment](LAUNCH_MULTILINGUAL_ALIGNMENT.md#proposed-work-and-dependencies) maps approved product direction onto existing task IDs and proposed bounded work; none is authorized for implementation here. Historical SG-P22/SEO proposal passages above retain their original scope; current DONE status and evidence live in ROADMAP/PROGRESS. The owner now intends fuller v1 launch capabilities, superseding the earlier candidate-only launch-priority framing without changing any task's existing status or expanding completed SG-P22.

**SG-P31 — Translation Research & Validation (proposed research phase within existing scope):** existing SG-P31 retains multilingual architecture/cost comparison, originally PLANNED; its authorized Phase 1 research is now IN PROGRESS as recorded below, with implementation only after decision. Proposed acceptance: compare current OpenAI, Google Gemini Developer API, Google Cloud Translation and DeepL offerings/lifecycle as four separate candidates (Gemini 2.5 Flash-Lite or an appropriate currently supported successor, subject to access/lifecycle verification), define hospitality quality/number/time/address/privacy tests, assess launch-language/font/RTL risks, compare full lifecycle cost and latency evidence with measurement limits, propose cache/source-version/correction/fallback/abuse/privacy policies and present D-009 choices for owner review. Paid/API experiments require separate authorization; this documentation alignment runs none. UI catalogs/selection, server translation/cache and PDF reuse are separate implementation proposals needing bounded scope and ID allocation after research/decision. Do not fold them into SG-P31 research or silently expand SG-P32's management/language-settings scope.

Reuse proposed SG-P23/SG-P24/SG-P33 for blank books, essential-format selection and additional sections. SG-P30 remains photo validation/variants/storage; photographic PDF integration is a distinct unnumbered proposal after approved media/limits decisions. Templates, guest actions, showcase production and a launch acceptance matrix remain separately scoped unnumbered proposals. Showcase homepage coordination belongs with SG-P50 marketing, not a second SEO task; the three booklets are not the existing three SEO article outlines. Existing SG-P40–SG-P43 and SG-P51 release/security gates remain mandatory.


### SG-P31 Phase 1 — authorized research boundary (2026-11-15)

Owner authorized documentation research, provider comparison, hypothetical cost modeling and preparation of a reproducible benchmark within SG-P31's existing research scope. See [Phase 1 report](SG_P31_PHASE1_RESEARCH.md). Scope: OpenAI API, Gemini Developer API, Google Cloud Translation and DeepL independently; lifecycle/pricing/languages/European terms/limits; synthetic hospitality corpus and nine-language matrix; versioned cache/corrections/SSR/PDF/privacy/quotas architecture proposal; explicit facts versus assumptions/unknowns and per-candidate GO/NO-GO. No new task ID or completed status change.

Phase 1 deliverables are prepared for owner review. SG-P31 remains IN PROGRESS, not implemented. No credentials/provider requests, paid use, installations, schema/API changes, commit/push/deploy. Proposed Phase 2 needs separately approved exact models/endpoints, synthetic corpus, attempt and token/character limits, privacy terms, measured-usage instrumentation, enforceable usage ceiling and distinct funding/subscription ceiling. DeepL quote/coverage and TLLM output-cost bound are unresolved prerequisites. No automated next phase follows.


### SG-P31 Phase 2A — offline preparation only (2026-11-15)

Owner authorizes a minimal provider-neutral Node harness, machine-readable frozen corpus, 192-job/variant manifest, deterministic mocks, structured result/review formats, proposed live execution limits and focused tests. See [Phase 2A preparation](SG_P31_PHASE2A_PREPARATION.md). No SDK/dependency, live adapter/API call, credential/private-environment access, account/billing, production translation/schema/route/app changes, commit/push/deployment or live benchmarking. Preserve the corpus SHA, Phase 1 directional/eligibility/regional-cost qualifications and all pilot caps. SG-P31 remains IN PROGRESS; no new task ID or completed status changes. Preparation is ready for independent owner review; live benchmarking remains separately gated.
