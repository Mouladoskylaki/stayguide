# StayGuide — Living roadmap

## Where we are now

StayGuide remains a local prototype, not production-ready. SG-P11 was approved, committed and pushed as `91d59fced91150b347451df2ddfd22584b77387e`. SG-P12 implementation and validation are **DONE, pending owner review**: the section editor now has modal focus handling, guarded draft dismissal, inline save errors and a responsive scrolling panel. No production deployment is authorized.

Current task: **SG-P12 — Premium Accessible Section Editor & Mobile Panel**. Next step: owner review of the editor and screenshots. Next recommended implementation task: **SG-P20 — warm SSR guest layout**, only with explicit authorization.

SG-P12 began on clean `main` at `91d59fc`. Its seven changed files remain uncommitted; no commit, push or deployment was performed. SG-SHARE01 helpers, configuration, processes and port 8787 were left untouched; browser validation used a separate ephemeral local server and in-memory test guides. See [PROGRESS.md](PROGRESS.md) for evidence and limitations.

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
| SG-P10 — warm host shell and tokens | DONE | Owner approved the foundation and final mobile selector polish; all original 35 named tests and browser checks passed before the authorized checkpoint. Committed/pushed as `50cc34e`; no production deployment. |
| SG-P11 — property identity, cards, progress and actions | DONE | Initials placeholders, all ten cards, explicit empty/started/complete criteria and one quick-action group. 42 host regressions plus 8 worker tests pass; Chrome verifies saved progress after UI saves/reloads/switches, pending/stale states, correct URLs, keyboard/scrolling, long/many names and 1440px/390px/320px layouts. Owner approved and checkpointed/pushed as `91d59fc`. |
| SG-P12 — accessible section editor | DONE | Native modal drawer/full-screen mobile panel, exact draft comparison, explicit discard, duplicate-save guard, inline retry and retained property/request guards. 47 host tests plus 8 worker tests pass; Chrome checks all ten editors, focus/keyboard/dismissal, failure/retry, slow/stale saves, responsive layouts and existing flows. Owner review pending. |

Latest automated baseline, rerun during SG-P12: **55 named tests pass** (47 host regressions and 8 worker tests). `npm test` reports 2 passing test files in this environment; direct execution confirms the named counts. Chrome verifies the new editor at 1440px/390px/320px and a reduced-height viewport, plus creation/switching, saved progress, sharing, guest/no-JS, QR download/print routing and recovery. Guest/mobile, marketing/desktop/mobile and print captures match the committed shared CSS. Real phone keyboards, other browser engines, assistive technology, physical QR scanning/printing and production readiness are not verified.

## Phases, tasks and dependencies

[IMPLEMENTATION_TASKS.md](IMPLEMENTATION_TASKS.md) is authoritative for detailed scope and acceptance criteria. Summaries below do not extend it. Explicit existing gates are SG-P00 first, P1 after SG-P00/SG-P01, decision approval before translation implementation, and all release gates plus approval before launch. Other dependency relationships below are planning prerequisites to confirm when approving each task, not approved reordering or architecture decisions. Each task also requires its own authorization.

| Phase | Task | Status | Scope summary and dependencies |
|---|---|---|---|
| P0 — Repository and baseline | SG-P00 | DONE | Audit first; evidence above. |
| P0 | SG-P01 | DONE | Approved host-state reliability scope implemented: validated saved state with explicit recovery-copy reset, guarded loads/saves and focused regressions. Evidence above; approved and checkpointed as `46763c6`. |
| P1 — Warm host UI | SG-P10 | DONE | Approved responsive host shell and mobile selector polish; checkpointed/pushed as `50cc34e`. |
| P1 | SG-P11 | DONE | Approved identity/card/progress/action scope implemented using existing saved data. Empty/started/complete criteria explained; loading/stale states protected. Evidence above; approved/checkpointed as `91d59fc`. |
| P1 | SG-P12 | DONE | Accessible editing drawer/mobile panel, dirty confirmation, inline retry, focus and safe async saves verified; pending owner review. |
| P2 — Guest UI and print | SG-P20 | NEXT | Warm SSR guest layout; retain current guide model and non-JS reading. Confirm sequencing after baseline fixes. |
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
- **Host reliability:** SG-P01 addresses invalid stored state and outdated load/save UI updates. Recovery copies remain private browser-local data and require technical help to restore; cross-tab concurrent edits and account recovery are not addressed. SG-P12 adds modal focus containment/restoration; comprehensive assistive-technology and real-device testing remain unverified.
- **Public content privacy:** editor currently lacks explicit safeguards against private entry information; escaping is not confidentiality protection.
- **Open decisions:** D-008–D-013 cover architecture/storage, translation cost/quotas, payment/tax viability, authentication/trial policy, name/domain conflict, PDF/photo policy and provisional discounts. No provider, purchase or architecture change is approved by this roadmap.
- **Verification gaps:** no real Cloudflare/D1 smoke test, measured field performance, QR decoding, physical print verification or comprehensive accessibility/security review. User-confirmed local flows do not close these gates.
- **Visual completeness:** SG-P11 supplies initials-based visual identities, enhanced cards, saved-field progress and quick actions on the SG-P10 shell. Real photos/storage remain SG-P30, the SG-P12 editor is implemented pending review; guest tiles/languages and the print workspace remain later tasks. Initials are placeholders, not actual photography. No reference parity is claimed.
- **Repository review:** SG-P11 is approved and checkpointed/pushed as `91d59fc`. SG-P12 awaits owner review and remains uncommitted. No new commit or push is authorized by SG-P12.

## Document responsibilities

| Document | Responsibility |
|---|---|
| [ROADMAP.md](ROADMAP.md) | Current state, milestones, statuses, dependencies and next steps. |
| [IMPLEMENTATION_TASKS.md](IMPLEMENTATION_TASKS.md) | Authoritative task definitions and acceptance criteria. |
| [PROGRESS.md](PROGRESS.md) | Chronological work evidence, test results and verification limits. |
| [DECISIONS.md](DECISIONS.md) | Approved decisions and open questions. |
| [AGENTS.md](../AGENTS.md) | Operating rules. |

Product, architecture, visual direction and verification requirements remain in [PRODUCT_SPEC.md](PRODUCT_SPEC.md), [ARCHITECTURE.md](ARCHITECTURE.md), [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md), [SECURITY.md](SECURITY.md) and [TESTING.md](TESTING.md). Consult those sources rather than duplicating full specifications here.
