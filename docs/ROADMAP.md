# StayGuide — Living roadmap

## Where we are now

StayGuide is a local v0.2 prototype, not production-ready. SG-P00 is DONE as a read-only audit; Developer Experience Setup is DONE. The user reports manually verifying `npm start`, guide editing and guest rendering in VS Code. SG-P01 host state reliability was approved and checkpointed as `46763c6`. The SG-P10 foundation passed owner functional/visual review; requested final mobile property-selector polish is now implemented and validated, awaiting final review before a checkpoint. No production deployment is authorized.

Current task: **SG-P10 — Warm Host Dashboard Shell & Design Tokens**, implementation and validation DONE; awaiting user review. No further implementation task is IN PROGRESS. Next recommended task: **SG-P11 — property thumbnail tabs, cards, progress and quick actions**, only after SG-P10 review and explicit authorization. SG-P11 has not started.

Resumed after SG-SHARE01: the existing six-file SG-P10 work was inspected and preserved; no further application changes were needed against SG-P10 acceptance criteria. Fresh tests, browser checks and 1440px/390px/320px screenshots passed. See the resumed-validation entry in [PROGRESS.md](PROGRESS.md). The temporary sharing helpers and services were left untouched; validation used a separate ephemeral local server and in-memory data.

Final selector follow-up: native scrollbars are hidden while horizontal scrolling remains available; the active tab is revealed after initial render, selection and resize. The add button stays outside the scrollable area; subtle edge chevrons indicate additional properties. Fresh 1440px/390px/320px browser checks include keyboard selection/focus, many/long tabs, scroll-cue updates and usable editor cards at 320px. Only selector presentation/visibility changed; switching/authentication/recovery logic and SG-SHARE01 remain untouched. See the latest evidence in [PROGRESS.md](PROGRESS.md).

Repository snapshot before SG-P10: clean `main` at `46763c6` (`fix: harden host state recovery and property switching`). The prior authorized checkpoint was pushed to `origin/main`. SG-P10 edits are uncommitted; this task performs no commit, push or deployment. This records local Git and prior checkpoint evidence, not a fresh remote-state check.

## Mission and non-negotiable principles

Build a warm, intuitive, exceptionally fast guest guide and a simple host dashboard. Guide creation in 2–3 minutes is a measured objective, not a verified achievement. The [product specification](PRODUCT_SPEC.md) remains authoritative:

- Preserve the initial €1/property/year goal, pending payment/tax viability; no permanent free plan or feature tiers. Volume discounts remain provisional.
- Guests open a stable link or QR without an app/account, ads or per-view fees. Public guides are noindex and must not contain entry/keybox/alarm secrets.
- Keep public content lightweight, server-rendered and readable without JavaScript; no unnecessary framework or external runtime fonts/scripts.
- Preserve the signup-free trial direction, stored multilingual content from first public release, QR exports and shared-content printable welcome book requirements. Their absence in the prototype does not remove them from scope.
- Prioritize accessibility, security, performance and core functionality. Use the two [design references](DESIGN_SYSTEM.md) as the warm visual direction, not evidence that photographed layouts or features already exist.
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
| SG-P10 — warm host shell and tokens | DONE | Foundation reviewed by owner; final selector polish verified at 1440px/390px/320px, including active-tab bounds after reload/click/keyboard/resize, hidden scrollbars, many/long tabs, visible add button, scroll cues and narrow cards. All 35 named tests and expanded Chrome smoke pass; no page overflow in tested views. Marketing desktop/mobile, guest mobile and print captures match committed shared CSS exactly. Final polish awaits user review; no checkpoint authorized by this task. |

Latest automated baseline, rerun during SG-P10: **35 named tests pass** (27 host-state regressions and 8 existing worker tests). Host coverage includes malformed JSON/invalid structures, untouched originals, recovery copies and storage failures, response ordering, active-property/auth association and stale saves. Worker coverage remains create, SSR/noindex/no edit-token exposure, authorization, updates, escaping/validation, QR/card responses and invalid/missing guides. `npm test` reports 2 passing test files in this environment; direct execution confirms the named counts. No production readiness, latency, QR decoding or complete security certification follows from these tests.

## Phases, tasks and dependencies

[IMPLEMENTATION_TASKS.md](IMPLEMENTATION_TASKS.md) is authoritative for detailed scope and acceptance criteria. Summaries below do not extend it. Explicit existing gates are SG-P00 first, P1 after SG-P00/SG-P01, decision approval before translation implementation, and all release gates plus approval before launch. Other dependency relationships below are planning prerequisites to confirm when approving each task, not approved reordering or architecture decisions. Each task also requires its own authorization.

| Phase | Task | Status | Scope summary and dependencies |
|---|---|---|---|
| P0 — Repository and baseline | SG-P00 | DONE | Audit first; evidence above. |
| P0 | SG-P01 | DONE | Approved host-state reliability scope implemented: validated saved state with explicit recovery-copy reset, guarded loads/saves and focused regressions. Evidence above; approved and checkpointed as `46763c6`. |
| P1 — Warm host UI | SG-P10 | DONE | Host tokens and CSS-only responsive sidebar/header implemented after SG-P01. Existing DOM IDs and application JavaScript retained; visual review pending. |
| P1 | SG-P11 | NEXT | Property tabs/cards/progress/actions using existing data; P0 gate applies; expected to build on SG-P10 shell. |
| P1 | SG-P12 | PLANNED | Compact accessible editing panel; P0 gate applies; coordinate with SG-P10/SG-P11 and saved-state behavior. |
| P2 — Guest UI and print | SG-P20 | PLANNED | Warm SSR guest layout; retain current guide model and non-JS reading. Confirm sequencing after baseline fixes. |
| P2 | SG-P21 | PLANNED | Print/QR screen and PNG/SVG exports; preserve stable guest URLs and prove QR decoding. Coordinate with SG-P20. |
| P2 | SG-P22 | PLANNED | A4/A5 welcome-book PDF from shared data; PDF approach remains open (D-013), with pagination/font verification required. Coordinate with SG-P20/SG-P21. |
| P3 — Feature completeness | SG-P30 | PLANNED | Photos and validated size variants; storage/photo policy decisions D-008/D-013 required before implementation choices. |
| P3 | SG-P31 | PLANNED | Multilingual architecture/cost comparison; research can precede decision D-009, implementation cannot. |
| P3 | SG-P32 | PLANNED | Multiple-account management, duplication and language settings; account ownership from SG-P41 and language direction from SG-P31 are prerequisites for corresponding behavior. Sequencing needs user review. |
| P4 — Commercial readiness | SG-P40 | PLANNED | True 24h trial/migration and abuse controls; D-011 lifecycle/ownership decisions and coordination with SG-P41 required. |
| P4 | SG-P41 | PLANNED | Secure accounts/sessions/recovery; D-011 authentication decision; coordinate with SG-P40 migration. |
| P4 | SG-P42 | PLANNED | Payment/tax research and approved billing integration; D-010 decision and verified ownership/trial lifecycle needed for integration. |
| P4 | SG-P43 | PLANNED | Monitoring, backup/restore, GDPR/legal and security review; review implemented account/trial/payment/storage behavior. |
| P5 — Launch | SG-P50 | PLANNED | Marketing/SEO, staging performance and pilot feedback; staging/external activity needs authorization and relevant safety controls. Final name remains open (D-012). |
| P5 | SG-P51 | BLOCKED | Production launch: all product/release gates, SG-P43 review, launch validation and explicit user authorization required. None is implied by prototype tests. |

Phase numbering is not permission to bypass dependencies. In particular SG-P32's account work crosses the current P3/P4 grouping; any reordering must be explicitly approved, with rationale documented. No reordering is approved here.

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
- **Host reliability:** SG-P01 addresses invalid stored state and outdated load/save UI updates. Recovery copies remain private browser-local data and require technical help to restore; cross-tab concurrent edits and account recovery are not addressed. Drawer focus handling remains an accessibility issue for a separately approved scope.
- **Public content privacy:** editor currently lacks explicit safeguards against private entry information; escaping is not confidentiality protection.
- **Open decisions:** D-008–D-013 cover architecture/storage, translation cost/quotas, payment/tax viability, authentication/trial policy, name/domain conflict, PDF/photo policy and provisional discounts. No provider, purchase or architecture change is approved by this roadmap.
- **Verification gaps:** no real Cloudflare/D1 smoke test, measured field performance, QR decoding, physical print verification or comprehensive accessibility/security review. User-confirmed local flows do not close these gates.
- **Visual completeness:** SG-P10 supplies the dark host sidebar, warm workspace and coherent tokens. Thumbnail tabs, enhanced cards/progress/quick actions, reference photography, guest tiles/language switch and print workspace remain future work. Drawer behavior/redesign remains SG-P12. No reference parity is claimed.
- **Repository review:** SG-P10 awaits visual review and remains uncommitted. SG-P01 was approved and pushed in the preceding checkpoint; no new commit or push is authorized here.

## Document responsibilities

| Document | Responsibility |
|---|---|
| [ROADMAP.md](ROADMAP.md) | Current state, milestones, statuses, dependencies and next steps. |
| [IMPLEMENTATION_TASKS.md](IMPLEMENTATION_TASKS.md) | Authoritative task definitions and acceptance criteria. |
| [PROGRESS.md](PROGRESS.md) | Chronological work evidence, test results and verification limits. |
| [DECISIONS.md](DECISIONS.md) | Approved decisions and open questions. |
| [AGENTS.md](../AGENTS.md) | Operating rules. |

Product, architecture, visual direction and verification requirements remain in [PRODUCT_SPEC.md](PRODUCT_SPEC.md), [ARCHITECTURE.md](ARCHITECTURE.md), [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md), [SECURITY.md](SECURITY.md) and [TESTING.md](TESTING.md). Consult those sources rather than duplicating full specifications here.
