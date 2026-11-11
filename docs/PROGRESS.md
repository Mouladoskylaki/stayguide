# Progress log

Chronological verification evidence lives here; [ROADMAP.md](ROADMAP.md) tracks current status and next steps. Historical entries describe their state at the time, not current authorization. Task definitions remain in [IMPLEMENTATION_TASKS.md](IMPLEMENTATION_TASKS.md).

## 2026-11-11 — Import baseline
- Starting source: StayGuide local prototype v0.2 warm UI.
- Reported prior state: 8 passing Node tests, but re-run required in VS Code environment.
- No Git repository, remote, commit or deployment is asserted by this package.
- Next authorized task: **SG-P00 read-only audit**.

## Agent entries
For each approved task record: ID, date, files changed, tests with actual results, screenshots, blockers, and review status. Do not mark complete without verification.

## SG-P00 — Read-only baseline audit (history recorded during SG-DOC01)

- Source: completed audit report in this conversation, reconciled with the user's SG-DOC01 history. No files were changed by SG-P00; this entry is retrospective, not a new audit.
- Inspected code/routes/data adapters, Git state, privacy/security, accessibility and design references. Browser smoke checks used an in-memory DB; create/edit, guest SSR with JS disabled, denied unauthenticated API requests, QR/card responses and 320px/390px overflow checks passed.
- `npm test` exited successfully with 1 file-level pass; direct `node tests/worker.test.js` passed all 8 named worker tests. `git diff --check` passed; Git was clean at that audit.
- Desktop/mobile captures were saved outside the repository under `/tmp/sg-p00-audit-XXXXXXWQIxIL/`; these are temporary local artifacts, not durable Git evidence. No visual parity was claimed.
- QR decoding, physical printing, restart persistence, Cloudflare/D1 execution, measured performance and comprehensive accessibility/security were not verified.
- Recommended SG-P01 host state reliability work remains unimplemented. No commit, push or deployment was authorized or performed by the audit.

## 2026-11-11 — Developer Experience Setup (user-requested, no task ID assigned)
- Added `.vscode/settings.json` with Live Server rooted at `/public` and `.vscode/tasks.json` for the existing `npm start` and `npm test` scripts.
- Updated `README.md` with frontend file locations, static-only Go Live limitations, full application startup and task usage.
- Application HTML/CSS/JS, URLs, architecture, schema and security behavior are unchanged; no source formatting changes were needed for this setup.
- Validation: `npm test` passed (1 file-level pass reported in this environment); direct `node tests/worker.test.js` confirmed all 8 named tests pass. Both VS Code JSON files parse; `git diff --check` passed.
- No UI changes or new screenshots. VS Code task execution and the Live Server extension UI were not exercised in this environment.
- Ready for review; no commit, push or deployment. Suggested next step: manually verify both workflows in VS Code before approving a separate SG-P01 scope.

## User verification follow-up (reported in SG-DOC01)

- The user reports manually confirming `npm start`, guide editing and guest rendering in VS Code. This is user-reported verification, not a new agent browser run.
- Live Server's Go Live interaction and the VS Code task picker were not separately confirmed. This report does not approve SG-P01 or deployment.

## 2026-11-11 — SG-DOC01: Project Governance & Living Roadmap

- Created `docs/ROADMAP.md` with evidence-based statuses, P0–P5 tasks, dependency distinctions, milestone criteria, risks and next recommended scope. SG-P00 and Developer Experience Setup are complete; SG-P01 is NEXT and unimplemented; production launch is BLOCKED.
- Updated `AGENTS.md` operating/document-maintenance rules, `docs/IMPLEMENTATION_TASKS.md` responsibility links, and `README.md` roadmap navigation. Corrected README's unsupported QR-scanner claim; preserved prior developer-experience edits.
- Recorded audit history and user-reported manual verification here. SG-DOC01 changes exactly five documentation files: `AGENTS.md`, `README.md`, `docs/IMPLEMENTATION_TASKS.md`, `docs/PROGRESS.md`, `docs/ROADMAP.md`. Existing untracked `.vscode/` files belong to the prior task and were not changed.
- Validation: `npm test` passed (1 file-level pass, 0 failures); direct `node tests/worker.test.js` passed 8/8 named tests. Checked local Markdown link targets/anchors and roadmap coverage against defined task IDs; `git diff --check` passed. No new browser checks were required for documentation-only changes.
- No application code, styles, tests, schema, dependencies, runtime behavior or approved decisions changed. No commit, push, deployment or purchase. Documentation complete, awaiting review.
- Next recommended task: approve a narrow SG-P01 scope for safe saved-state parsing/validation, stale-response protection and focused regressions. Stop pending review; this is not implementation authorization.

## 2026-11-11 — SG-P01: Host State Reliability

- User explicitly authorized saved-browser-state recovery, safe property switching and focused regression tests. Starting Git state was clean at `0942b17`; earlier developer-experience/governance changes are now tracked. No commit or push was performed by this task.
- Changed exactly six files: `public/app.js`, `public/app.html`, `tests/host-state.test.js`, `tests/host-state.browser.mjs`, `docs/ROADMAP.md` and `docs/PROGRESS.md`.
- Validate saved lists, entries, IDs/tokens, optional labels, duplicate IDs and active selection before using them. Invalid/unreadable state blocks creation/editing and presents retry or an explicitly confirmed fresh start. Normal valid browser state retains the existing routes and owner authorization.
- Invalid originals are not silently rewritten. Fresh start first saves exact original property/active strings to a unique `stayguide-demo-recovery-<timestamp>` localStorage key, preserving older copies; a failed backup prevents reset. Recovery UI explains privacy, technical restoration and storage errors without showing stored data or exception details. To restore with technical help, read the chosen backup's `properties` and `active` strings and put them back under `stayguide-demo-properties` and `stayguide-demo-active` (remove a working key if its original backup value is null), then use Retry/reload. Never share recovery values: they contain editing credentials.
- Guard property GET responses by request version and property ID; both stale successes and errors are ignored, including A→B→A switching. Disable editing/share actions while the selected property loads. Leaving for a new property invalidates pending loads. Pending PATCH responses are also tied to their original property, drawer and save versions, so stale saves cannot repaint another property or unlock a newer save.
- Automated validation: `npm test` passed with 2 file-level passes, 0 failures. Direct `node tests/host-state.test.js` passed 27/27 named regressions; direct `node tests/worker.test.js` passed the existing 8/8. The host tests execute the actual host entrypoint using Node VM browser-boundary doubles, with deferred fetch responses; no new dependencies.
- Browser validation: `node tests/host-state.browser.mjs` passed in real headless Chrome against the existing Worker with an in-memory DB. It exercised create, rapid switching with delayed success/failure, correct selected-property owner save, guest/QR routes, guest rendering with JS disabled, invalid-state recovery and backup-before-reset. Localhost port/Chrome execution required sandbox escalation; no persistent guide data or external resources were created.
- Screenshots outside Git: `/tmp/sg-p01-browser-XXXXXXVkSg7K/` contains `host-desktop.png` (1440px), `host-mobile.png` (390px), `guest-mobile.png`, `guest-no-js.png`, `recovery-desktop.png`, `recovery-mobile.png` and `recovery-320.png`. No page-level overflow in these tested views. The existing design is retained using existing classes; references remain aspirational, with no parity claim.
- `git diff --check` passed; reviewed tracked diffs, new tests and diff stat. No changes to CSS, backend, APIs, schema, dependencies or authentication model.
- Limits: recovery copies share the existing private localStorage credential model and may need technical help to restore. Damaged source data cannot be reconstructed automatically; clearing browser data removes recovery copies. Cross-tab concurrency, disk/Cloudflare persistence, physical QR decoding/printing and broader launch-security gaps remain outside this task. Drawer focus issues remain for separately approved work.
- SG-P01 implementation/validation DONE, awaiting user review. Next recommended task: SG-P10 design tokens and responsive host shell/sidebar, only after review and explicit authorization. STOP; SG-P10 was not started.
