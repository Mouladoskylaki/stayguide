# StayGuide — Agent working contract

Read `docs/PRODUCT_SPEC.md`, `docs/ARCHITECTURE.md`, `docs/DESIGN_SYSTEM.md`, `docs/IMPLEMENTATION_TASKS.md`, `docs/DECISIONS.md`, and `docs/TESTING.md` before modifying code. This is a local prototype, NOT production-ready.

## Authority and scope
- The user approves product/architecture changes, purchases, external services, commits/pushes and deployments. Do not infer approval.
- Implement only the explicit task ID and acceptance criteria supplied in the current prompt. Do not independently start the next task.
- Preserve existing working behavior and tests. No broad refactors, new frameworks, dependencies, DB migrations or API breaking changes without approval.
- Never run `git commit`, `git push`, `wrangler deploy`, create remote resources, or publish without explicit permission. Never alter unrelated files or discard user changes.
- Never expose tokens, credentials, private information or sample access codes in public pages, logs or Git.
- For design tasks, compare against `docs/references/` if reference images exist. Do not claim pixel-perfect equivalence without screenshots.

## Required task workflow
1. Read relevant files and inspect `git status --short`; identify scope and risks.
2. Make smallest coherent implementation; include tests where applicable.
3. Run `npm test`; run local smoke/browser checks when available; record what could not be tested.
4. Inspect `git diff --check` and `git diff --stat`; do not silently fix unrelated issues.
5. Update `docs/PROGRESS.md` only for the task performed, and `docs/DECISIONS.md` only when a decision is approved.
6. Report changed files, behavior, tests with pass/fail, screenshots if UI, risks, and exact next suggested task. STOP.

## Quality bar
Semantic accessible HTML; responsive mobile-first CSS; no external runtime fonts/scripts for public guides; server-rendered guest content readable without JS; optimized media; noindex; escape untrusted content; deny access to private APIs without authorization. Treat any production deployment as blocked until the security checklist is completed.
