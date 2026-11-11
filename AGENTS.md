# StayGuide — Agent working contract

Read `docs/PRODUCT_SPEC.md`, `docs/ARCHITECTURE.md`, `docs/DESIGN_SYSTEM.md`, `docs/IMPLEMENTATION_TASKS.md`, `docs/DECISIONS.md`, and `docs/TESTING.md` before modifying code. This is a local prototype, NOT production-ready.

Read [docs/ROADMAP.md](docs/ROADMAP.md) before starting an implementation task to establish current status, dependencies and the approved scope. A recommended next task is not authorization to execute it.

## Authority and scope
- The user approves product/architecture changes, purchases, external services, commits/pushes and deployments. Do not infer approval.
- Implement only the explicit task ID and acceptance criteria supplied in the current prompt. Do not independently start the next task.
- Preserve existing working behavior and tests. No broad refactors, new frameworks, dependencies, DB migrations or API breaking changes without approval.
- Never add a feature, framework, dependency, paid service or architectural complexity without justification and explicit user approval.
- Never run `git commit`, `git push`, `wrangler deploy`, create remote resources, or publish without explicit permission. Never alter unrelated files or discard user changes.
- Never expose tokens, credentials, private information or sample access codes in public pages, logs or Git.
- For design tasks, compare against `docs/references/` if reference images exist. Do not claim pixel-perfect equivalence without screenshots.

## Required task workflow
1. Read relevant files and inspect `git status --short`; identify scope and risks.
2. Make smallest coherent implementation; include tests where applicable.
3. Run `npm test`; run local smoke/browser checks when available; record what could not be tested.
4. Inspect `git diff --check` and `git diff --stat`; do not silently fix unrelated issues.
5. Update `docs/ROADMAP.md` when verified task status changes. Append evidence for the task performed to `docs/PROGRESS.md`, distinguishing automated checks, user-reported verification and untested claims. Update `docs/DECISIONS.md` only for user-approved decisions; never infer approval from a recommendation.
6. Report changed files, behavior, tests with pass/fail, screenshots if UI, risks, and exact next suggested task. STOP.

## Quality bar
Semantic accessible HTML; responsive mobile-first CSS; no external runtime fonts/scripts for public guides; server-rendered guest content readable without JS; optimized media; noindex; escape untrusted content; deny access to private APIs without authorization. Treat any production deployment as blocked until the security checklist is completed.

Never prioritize appearance over accessibility, security, performance or core functionality. Keep guest guides exceptionally lightweight and server-rendered. Never claim untested functionality works; state verification limits explicitly.

## Document responsibilities

- [ROADMAP.md](docs/ROADMAP.md): current project state, milestones, statuses, dependencies and next steps.
- [IMPLEMENTATION_TASKS.md](docs/IMPLEMENTATION_TASKS.md): authoritative detailed task scope and acceptance criteria.
- [PROGRESS.md](docs/PROGRESS.md): chronological evidence of completed work and verification limits.
- [DECISIONS.md](docs/DECISIONS.md): approved decisions and open questions; approval is required to resolve them.
- [AGENTS.md](AGENTS.md): agent operating rules.

Link to the product, architecture, design, security and testing specifications rather than copying their full contents into the roadmap. DONE requires evidence; completion does not imply review approval, a commit, a push or deployment.
