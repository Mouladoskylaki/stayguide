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
- **SG-P22**: A4/A5 printable PDF from shared content. Acceptance: pagination and fonts verified.

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
- **SG-P50**: marketing/SEO, staging performance, pilot feedback.
- **SG-P51**: production launch only after all gates and user approval.

Tasks may be reordered with documented rationale and user approval; this list is a roadmap, not authorization to implement everything.
