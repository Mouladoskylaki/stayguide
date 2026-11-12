# StayGuide — Living roadmap

## Where we are now

StayGuide remains a local prototype, not production-ready. SG-P21 is checkpointed as `e32819af76d96996c35d16dd21b2e7b99d72b918`, SG-DOC02 as `79fb51e1602d1b374c5205bd19b104017b622cc3`, and owner-reviewed SG-SEO-01 research as `60aad7a8d6d794b440731fe7baf98b630ed5a93a`; these were committed/pushed under their separate approvals. SG-P22 feasibility research independently began on clean `main` at `60aad7a`, matching locally recorded `origin/main`; no remote fetch this task.

Current task: **SG-P22 — feasibility/architecture evaluation only**. The [PDF feasibility report](SG_P22_PDF_FEASIBILITY.md) is complete, owner-reviewed and approved as documentation for this Git checkpoint; **PDF implementation has not started and is not authorized**. It recommends browser-local, lazy-loaded pdfmake with approved embedded fonts and a native Print / Save as PDF supporting fallback. No library, font, provider or D-013 decision has been selected as approved. Actual generated-book output, runtime/device compatibility, payload/performance, glyph coverage and semantic privacy policy remain gates, not verified results.

Next step: owner approval of a technology/font/distribution/privacy scope and separately authorized bounded proof/implementation stage. Blank books/individual printables remain separate proposals; photos/translations/optional sections do not block the first text-only book. First-public-release/security requirements remain unchanged. SG-SEO-01 remains CONDITIONAL GO research only; no SEO pages, article publication, Search Console integration or SG-P50 implementation approved or started.

SG-P21's pre-checkpoint evidence includes 97 named tests, the complete Chrome suite and three repeated property-tab runs. Independent OpenCV decoding is owner-reported, not rerun here. The intermittent aborted QR-image GET remains unexplained; physical-phone scanning, physical printing and other browser engines remain unverified. No production deployment is authorized. SG-SHARE01 helpers/configuration/processes and port 8787 remain untouched. See [PROGRESS.md](PROGRESS.md) for historical evidence and limits.

## Mission and non-negotiable principles

Build a warm, intuitive, exceptionally fast guest guide and a simple host dashboard. Guide creation in 2–3 minutes is a measured objective, not a verified achievement. The [product specification](PRODUCT_SPEC.md) remains authoritative:

- Preserve the initial €1/property/year goal, pending payment/tax viability; no permanent free plan or feature tiers. Volume discounts remain provisional.
- Guests open a stable link or QR without an app/account, ads or per-view fees. Public guides are noindex and must not contain entry/keybox/alarm secrets.
- Keep public content lightweight, server-rendered and readable without JavaScript; no unnecessary framework or external runtime fonts/scripts.
- Preserve the signup-free trial direction, stored multilingual content from first public release, QR exports and shared-content printable welcome book requirements. Their absence in the prototype does not remove them from scope.
- Prioritize accessibility, security, performance and core functionality. Use the two [design references](DESIGN_SYSTEM.md) as the warm visual direction, not evidence that photographed layouts or features already exist.
- Follow the [approved expansion principles](PRODUCT_SPEC.md#approved-expansion-principles): more value without complexity, optional advanced tools, one shared content source and no extra mandatory onboarding. Proposed features are not implementation commitments.
- Preserve the MVP exclusions and approval boundaries in the product specification and [agent contract](../AGENTS.md).

## Status and maintenance rules

| Status | Meaning |
|---|---|
| DONE | Task deliverables completed with recorded verification evidence; review, commit and deployment approval are separate. |
| IN PROGRESS | Explicitly authorized task currently being worked on. |
| NEXT | Recommended next task; not authorization to start. |
| PLANNED | Defined future scope, not started; prerequisites may remain unresolved. |
| BLOCKED | A named decision, prerequisite or authorization prevents execution of the item. |

Before implementation, read this roadmap and the task definition. Execute only the user-approved ID and scope. Update status only when supported by evidence, append that evidence to [PROGRESS.md](PROGRESS.md), and record approved decisions in [DECISIONS.md](DECISIONS.md). Stop after reporting; never start NEXT automatically. Do not invent completion percentages, schedules or approvals.

## Verified baseline and completed work

Evidence is recorded in [PROGRESS.md](PROGRESS.md); historical audit and user manual checks are distinct from the SG-P01 and SG-P10 automated/browser checks.

| Item | Status | Verification evidence and limits |
|---|---|---|
| SG-P00 — read-only baseline audit | DONE | Audit report in this conversation: inventory, Git/security review, desktop/mobile screenshots, in-memory create/edit/guest/QR/card smoke checks and guest reading without JS. Direct test execution passed all 8 worker tests. No repository files changed during that task. QR decoding, physical printing and Cloudflare/D1 execution were not verified. |
| Developer Experience Setup — no task ID assigned | DONE | `.vscode/settings.json`, `.vscode/tasks.json` and README workflows exist; JSON parsed and all 8 tests passed by direct execution. User now reports `npm start`, editing and guest rendering verified manually in VS Code. Go Live and task-picker interaction have not been separately confirmed. |
| SG-DOC01 — governance and living roadmap | DONE | Documentation-only changes; at SG-DOC01, `npm test` passed with 1 file-level pass, 0 failures. Direct `node tests/worker.test.js` passed all 8 named tests. Local Markdown links/task coverage and `git diff --check` checked before reporting. Review outcome was not recorded; changes are tracked in the baseline commit. |
| SG-P01 — host state reliability | DONE | 27 host regressions and 8 existing worker tests passed by direct execution; `npm test` passed with 2 file-level passes. Real Chrome/in-memory Worker smoke passed create/edit, delayed success/error switching, correct owner association, guest/QR and recovery-copy checks. Screenshots at 1440px/390px and recovery at 320px; no page overflow in tested views. Approved by the user and checkpointed/pushed as `46763c6`; no deployment. |
| SG-P10 — warm host shell and tokens | DONE | Owner approved the foundation and final mobile selector polish; all original 35 named tests and browser checks passed before the authorized checkpoint. Committed/pushed as `50cc34e`; no production deployment. |
| SG-P11 — property identity, cards, progress and actions | DONE | Initials placeholders, all ten cards, explicit empty/started/complete criteria and one quick-action group. 42 host regressions plus 8 worker tests pass; Chrome verifies saved progress after UI saves/reloads/switches, pending/stale states, correct URLs, keyboard/scrolling, long/many names and 1440px/390px/320px layouts. Owner approved and checkpointed/pushed as `91d59fc`. |
| SG-P12 — accessible section editor | DONE | Native modal drawer/full-screen mobile panel, exact draft comparison, explicit discard, duplicate-save guard, inline retry and retained property/request guards. 47 host tests plus 8 worker tests pass; Chrome checks all ten editors, focus/keyboard/dismissal, failure/retry, slow/stale saves, responsive layouts and existing flows. Owner approved and checkpointed/pushed as `3b8981a`. |
| SG-P20 — premium mobile guest guide | DONE | Guest-only CSS, SSR tiles/sections, empty-guide state and enhanced Wi-Fi copy/fallback. 12 new guest tests, 47 host tests and 8 worker tests pass. Chrome checks all saved values with JS disabled, native anchors, clipboard success/failure/absence, long/injected/sparse content and 1440px/390px/320px layouts. Owner approved and checkpointed/pushed as `e7aa12b`. |
| SG-P21 — QR & print workspace | DONE | One accessible workspace, exact visible destination, local/temporary warnings, canonical SVG plus PNG export and one-page A5 welcome card. 97 named tests and the complete Chrome suite pass; actual downloads, SVG/PNG pixel equivalence and normal/long-name PDFs verified. Owner approved implementation and regression correction; checkpointed/pushed as `e32819a`. Independent OpenCV decoding is owner-reported. Three repeated tab-regression runs and final complete Chrome suite pass after test-only synchronization corrections. Physical scanning/printing remain unverified. |
| SG-DOC02 — product expansion and SEO alignment | DONE | Owner reviewed the complete patch; corrected printable privacy/current-status wording; committed/pushed exactly five documents as `79fb51e`. No application behavior changed. |
| SG-SEO-01 — SEO research and architecture proposal | DONE | Research/documentation only, owner-reviewed and checkpointed/pushed as `60aad7a`. No implementation/publication approval. Dated sources, qualitative intent/competitor assessment, exactly three outlines and static-route/indexing proposal. Conditional go; no volumes, traffic or ROI claimed. See [proposal](SEO_GUIDES_PROPOSAL.md) and [progress](PROGRESS.md). |

SG-P21 pre-checkpoint automated baseline (historical browser evidence, not rerun for SG-DOC02): **97 named tests pass** (12 guest, 49 host, 28 QR/print and 8 worker tests). `npm test` reports 4 passing test files; direct execution confirms named counts. Chrome verifies workspace layouts/focus/downloads/errors/stale responses and existing host/guest/recovery flows. SVG and PNG samples for three URLs have matching crisp opaque pixels and quiet zones; this is **not independent decoding**. The agent browser harness has no QR BarcodeDetector; the owner subsequently reported successful independent OpenCV decoding of exports and rendered cards. Normal and 80-character-name welcome cards render as one-page A5 PDFs with controls excluded. Marketing captures match committed shared CSS; guest rendering/assets remain unchanged. Real-phone/physical-print and production gates remain open. The 2026-11-12 regression investigation records two diagnosed test synchronization races and one intermediate QR-image timeout with an aborted GET; that timeout did not recur in the diagnostic or final full run, and its cause remains unresolved.

## Phases, tasks and dependencies

[IMPLEMENTATION_TASKS.md](IMPLEMENTATION_TASKS.md) is authoritative for detailed scope and acceptance criteria. Summaries below do not extend it. Explicit existing gates are SG-P00 first, P1 after SG-P00/SG-P01, decision approval before translation implementation, and all release gates plus approval before launch. Other dependency relationships below are planning prerequisites to confirm when approving each task, not approved reordering or architecture decisions. Each task also requires its own authorization.

| Phase | Task | Status | Scope summary and dependencies |
|---|---|---|---|
| P0 — Repository and baseline | SG-P00 | DONE | Audit first; evidence above. |
| P0 | SG-P01 | DONE | Approved host-state reliability scope implemented: validated saved state with explicit recovery-copy reset, guarded loads/saves and focused regressions. Evidence above; approved and checkpointed as `46763c6`. |
| P1 — Warm host UI | SG-P10 | DONE | Approved responsive host shell and mobile selector polish; checkpointed/pushed as `50cc34e`. |
| P1 | SG-P11 | DONE | Approved identity/card/progress/action scope implemented using existing saved data. Empty/started/complete criteria explained; loading/stale states protected. Evidence above; approved/checkpointed as `91d59fc`. |
| P1 | SG-P12 | DONE | Accessible editing drawer/mobile panel, dirty confirmation, inline retry, focus and safe async saves verified; owner-approved and checkpointed as `3b8981a`. |
| P2 — Guest UI and print | SG-P20 | DONE | Warm SSR guest layout and real section anchors; existing model, security headers and non-JS reading preserved. Owner-approved and checkpointed as `e7aa12b`. |
| P2 | SG-P21 | DONE | Approved workspace/exports/single-card scope implemented and automated checks passed. Owner-approved including regression correction; committed/pushed as `e32819a`. Independent OpenCV decoding is owner-reported; real-phone scan remains unverified. |
| P2 | SG-P22 | IN PROGRESS | Feasibility research phase only: [report](SG_P22_PDF_FEASIBILITY.md) complete and owner-approved as documentation only; technology approval still pending; generator implementation NOT STARTED / NOT AUTHORIZED. Browser-local pdfmake + native print fallback recommended, not approved; actual runtime/output/font/privacy/performance proof pending. Filled A4/A5 only; blank books/individual printables remain separate. |
| P3 — Feature completeness | SG-P30 | PLANNED | Photos and validated size variants; storage/photo policy decisions D-008/D-013 required before implementation choices. |
| P3 | SG-P31 | PLANNED | Multilingual architecture/cost comparison; research can precede decision D-009, implementation cannot. |
| P3 | SG-P32 | PLANNED | Multiple-account management, duplication and language settings; account ownership from SG-P41 and language direction from SG-P31 are prerequisites for corresponding behavior. Sequencing needs user review. |
| P4 — Commercial readiness | SG-P40 | PLANNED | True 24h trial/migration and abuse controls; D-011 lifecycle/ownership decisions and coordination with SG-P41 required. |
| P4 | SG-P41 | PLANNED | Secure accounts/sessions/recovery; D-011 authentication decision; coordinate with SG-P40 migration. |
| P4 | SG-P42 | PLANNED | Payment/tax research and approved billing integration; D-010 decision and verified ownership/trial lifecycle needed for integration. |
| P4 | SG-P43 | PLANNED | Monitoring, backup/restore, GDPR/legal and security review; review implemented account/trial/payment/storage behavior. |
| P5 — Launch | SG-P50 | PLANNED | Marketing/SEO implementation/publication, staging performance and pilot feedback; proposed SG-SEO-01 supplies research only. External activity requires authorization/safety controls; final name remains open (D-012). |
| P5 | SG-P51 | BLOCKED | Production launch: all product/release gates, SG-P43 review, launch validation and explicit user authorization required. None is implied by prototype tests. |

Phase numbering is not permission to bypass dependencies. In particular SG-P32's account work crosses the current P3/P4 grouping; any reordering must be explicitly approved, with rationale documented. No reordering is approved here. Proposed expansion tasks below are separate from these existing phase commitments.

## Expansion proposals and prioritization — NOT AUTHORIZED

Detailed candidate requirements and overlap assessments live in [PRODUCT_SPEC.md](PRODUCT_SPEC.md#optional-content-expansion--proposal-not-implemented) and the [candidate task catalog](IMPLEMENTATION_TASKS.md#proposed-tasks--not-authorized). PROPOSED / NOT AUTHORIZED is a separate candidate classification, not PLANNED implementation approval or a completed milestone.

| Candidate ID | Classification | Proposed dependency / boundary |
|---|---|---|
| SG-P23 — Blank Welcome Book | PROPOSED / NOT AUTHORIZED | Reuse approved SG-P22 foundation; separate writing-space, empty-property and selection tests. May be reconsidered only with explicit combined-scope approval; not an SG-P22 prerequisite. |
| SG-P24 — Quick Guide and Individual Printables | PROPOSED / NOT AUTHORIZED | Shared section/rendering foundation; authorize formats incrementally. Reuse existing QR welcome card; connection-QR card needs separate encoding/privacy approval. ZIP kit deferred. |
| SG-P33 — Optional Content Expansion | PROPOSED / NOT AUTHORIZED | Approved overlap/lifecycle/compatibility design first; preserve default ten sections. No SEO/photo/analytics dependency. |

SG-SEO-01 was subsequently authorized for research only and is now complete, owner-reviewed and checkpointed as `60aad7a`; the candidate catalog records its original proposal, while this roadmap records current status. Its conditional recommendation does not approve D-018 architecture, SG-P50 implementation or publication. SG-DOC02 defines planning only; its evidence is appended in [PROGRESS.md](PROGRESS.md). Prioritize the core filled book and existing MVP obligations, then evaluate narrowly scoped Wi-Fi connection QR/static suggestions/actions/messages, followed by optional content/useful printables and optimized photos. Low-complexity candidates have no new task IDs yet; approve separate bounded definitions before work. Photos remain SG-P30; copying/ownership overlap SG-P32/SG-P41. Themes, offline access, analytics and advanced organization remain deferred or research-only. This recommendation does not authorize phase reordering, change first-public-release requirements or make speculative features launch blockers. SEO research need not delay PDF work.

## Milestone completion criteria

These summarize the existing task acceptance criteria; they do not replace detailed definitions or authorize new scope.

| Milestone | Completion criteria |
|---|---|
| P0 | Audit evidenced; approved baseline fixes implemented with regression checks passing and diff reviewed. Audit alone does not complete P0. |
| P1 | SG-P10–SG-P12 accepted: responsive screenshots, preserved working flows, truthful saved-field state, keyboard/focus/save/error behavior verified. |
| P2 | SG-P20–SG-P22 accepted: SSR/noindex/non-JS reading and Wi-Fi copy, correctly decoded QR exports, A4/A5 pagination/fonts verified against shared content. |
| P3 | SG-P30–SG-P32 accepted: approved storage/translation choices, validated media, language behavior and authorized account ownership verified. |
| P4 | SG-P40–SG-P43 accepted with trial/auth/payment/privacy/monitoring/restore evidence and the [security gate](SECURITY.md) satisfied; tests alone are insufficient. |
| P5 | SG-P50 launch validation completed and SG-P51 gates passed; explicit production approval required before execution. |

## Open blockers and major risks

- **Production blocked:** temporary localStorage edit tokens, missing account recovery/revocation, trial expiry, abuse controls, billing verification, privacy/monitoring and tested restore remain launch gaps. Follow [SECURITY.md](SECURITY.md).
- **Host reliability:** SG-P01 addresses invalid stored state and outdated load/save UI updates. Recovery copies remain private browser-local data and require technical help to restore; cross-tab concurrent edits and account recovery are not addressed. SG-P12 adds modal focus containment/restoration; comprehensive assistive-technology and real-device testing remain unverified.
- **Public content privacy:** editor currently lacks explicit safeguards against private entry information; escaping is not confidentiality protection.
- **Open decisions:** D-008–D-013 cover architecture/storage, translation cost/quotas, payment/tax viability, authentication/trial policy, name/domain conflict, PDF/photo policy and provisional discounts. No provider, purchase or architecture change is approved by this roadmap.
- **Verification gaps:** no real Cloudflare/D1 smoke test, measured field performance, real-phone QR scanning, physical print verification or comprehensive accessibility/security review. User-confirmed local flows do not close these gates.
- **Visual completeness:** SG-P11 supplies initials-based visual identities, enhanced cards, saved-field progress and quick actions on the SG-P10 shell. Real photos/storage remain SG-P30, SG-P20 supplies guest tiles/readable content and SG-P21 supplies the QR workspace/welcome card. Languages and the multi-page welcome book remain later tasks. Initials are placeholders, not actual photography. No reference parity is claimed.
- **Repository review:** SG-SEO-01 was owner-approved and checkpointed/pushed as `60aad7a8d6d794b440731fe7baf98b630ed5a93a`. SG-P22 feasibility began clean and changes only its report, roadmap and progress evidence; the owner now authorizes a three-document feasibility checkpoint and normal push only. No PDF proof of concept, application implementation or deployment is authorized.
- **Expansion/viability:** D-013 and D-015–D-018 remain open: PDF runtime/pagination/Unicode/cost, optional-content lifecycle, format scope, privacy/caching and editorial architecture. The provisional €1/property/year goal still needs payment/tax, hosting/storage, translation/PDF, support and demand evidence. SG-DOC02 performed no external research. SG-SEO-01 now provides qualitative commercial/content observations, not verified keyword volume, conversion, market size, listing-level sales or pricing viability. Domain choice, publication posture and useful original content/maintenance capacity remain unresolved. SG-P22 feasibility now documents library/runtime/font/pagination and cost tradeoffs; no generated-book compatibility benchmark or dependency selection is approved. Current free-text fields cannot guarantee exclusion of access secrets through a field allowlist alone; an approved privacy review/rejection policy is required.

## Document responsibilities

| Document | Responsibility |
|---|---|
| [ROADMAP.md](ROADMAP.md) | Current state, milestones, statuses, dependencies and next steps. |
| [IMPLEMENTATION_TASKS.md](IMPLEMENTATION_TASKS.md) | Authoritative task definitions and acceptance criteria. |
| [PROGRESS.md](PROGRESS.md) | Chronological work evidence, test results and verification limits. |
| [DECISIONS.md](DECISIONS.md) | Approved decisions and open questions. |
| [AGENTS.md](../AGENTS.md) | Operating rules. |

Product, architecture, visual direction and verification requirements remain in [PRODUCT_SPEC.md](PRODUCT_SPEC.md), [ARCHITECTURE.md](ARCHITECTURE.md), [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md), [SECURITY.md](SECURITY.md) and [TESTING.md](TESTING.md). Consult those sources rather than duplicating full specifications here.
