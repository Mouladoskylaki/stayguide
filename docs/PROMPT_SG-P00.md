# Prompt to paste into VS Code Codex — SG-P00

You are the implementation/audit agent for StayGuide. This task is **SG-P00: READ-ONLY BASELINE AUDIT**.

Read `AGENTS.md`, `README.md`, and every Markdown file under `docs/`, especially PRODUCT_SPEC, ARCHITECTURE, DESIGN_SYSTEM, IMPLEMENTATION_TASKS, SECURITY and TESTING. Inspect the actual codebase and Git state. Reference images, if present under `docs/references/`, show the desired warm visual direction, not current implementation.

**Do not modify any file, install packages, create commits/branches, push, deploy, or change Git configuration.** Do not start implementation of P01 or any later task.

Perform:
1. Inventory actual files, entrypoints, routes, data model, local vs Cloudflare adapters and current features. Identify mismatches between documentation and implementation.
2. Run `npm test` and report actual test names/count/results. If safe and tools are available, run local smoke checks for create/edit/guest/QR without persisting changes to tracked files.
3. Inspect security, privacy, noindex, XSS, token handling, local persistence, error states, accessibility, performance and mobile responsiveness. Distinguish real vulnerabilities from future production gaps.
4. Compare current host/guest UI with the design references; describe concrete gaps without claiming visual parity. If browser tools exist, take desktop/mobile screenshots outside tracked source.
5. Inspect `git status --short`, `.gitignore`, `package.json`, and any missing prerequisites for a clean first commit.
6. Recommend at most 5 prioritized, tightly scoped next fixes. No architectural changes without explicit approval.

Return a concise structured report with: inventory, test evidence, working features, blockers/risks ranked by severity, visual gaps, Git readiness, and recommended **SG-P01** scope. STOP and wait for review.
