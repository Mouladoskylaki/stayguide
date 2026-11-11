# Git and VS Code workflow

1. Open this folder in VS Code. Ensure Node.js 20+ and Git installed.
2. Initialize locally (`git init -b main`), inspect `git status`, run `npm test`, then create first baseline commit **manually** once satisfied.
3. Create a private/public GitHub repository as you decide. Connect remote manually; never place credentials in prompts.
4. Give Codex one task ID prompt. Agent reads AGENTS.md and relevant docs, implements only scope, runs tests, reports diff. You send report back to ChatGPT for review.
5. After review, you approve commit/push and next task. Prefer small, reversible commits and named branches for risky work.
6. Never commit `.local/`, `.wrangler/`, `node_modules/`, `.env`, credentials or screenshots containing private information.
7. Do not run deployment commands until security and commercial readiness gates pass.

Example initial commands:
```bash
npm test
git init -b main
git add .
git commit -m "chore: import StayGuide v0.2 prototype and project docs"
```
Create GitHub repo and add remote through GitHub UI or CLI after reviewing repo visibility and files.
