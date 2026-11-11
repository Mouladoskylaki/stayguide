# StayGuide · Working Prototype (November 2026)

A tiny, fast, framework-free digital welcome guide for vacation rentals. Built as a real end-to-end prototype for the StayGuide Master Brief v1.0.

**Status:** working local prototype. **NOT production-ready**. No payments, account recovery, public deployment, or 24-hour expiration. Host edit tokens in localStorage are an intentional temporary demo shortcut, not production authentication.

## Project status and roadmap

Start with [the living roadmap](docs/ROADMAP.md) for verified status, milestones, dependencies and the next recommended task. [Implementation tasks](docs/IMPLEMENTATION_TASKS.md) define scope and acceptance criteria; [progress](docs/PROGRESS.md) records chronological evidence, and [decisions](docs/DECISIONS.md) tracks approved constraints and open questions. Agents follow [AGENTS.md](AGENTS.md). Recommendations do not authorize implementation or deployment.

## Edit the interface

Open the repository folder in VS Code. The frontend files stay together in `public/`:

- `public/index.html` — marketing page.
- `public/app.html` — host editor markup.
- `public/styles.css` — shared styles.
- `public/app.js` — host editor JavaScript ES module.

### Go Live — static UI preview

With the VS Code **Live Server** extension installed, click **Go Live**. Workspace settings serve `public/` as the web root. Open `/index.html` for the marketing page or `/app.html` for the editor's initial layout; edit HTML/CSS/JS and save to refresh.

This is **static-only**: Live Server does not run `/api/*` or the server-rendered `/g/*` routes. Creating/loading/saving guides, guest previews, QR generation and print cards require `npm start`. Existing guides from the full app are not shared with Live Server's separate browser origin. Do not use `file://` to open the ES module interface.

### npm start — full local application

Requires Node.js 20+; no `npm install` needed for this local preview.

```bash
npm start
```

Open **http://127.0.0.1:8787** in a browser. Click **Create your guest guide**, enter a name, edit the Wi-Fi or other cards, preview, or download the QR SVG. Guides and edits persist across server restarts in `.local/guides.json` (local dev only).

Run the command from the repository root, or choose **Terminal → Run Task → StayGuide: Start full local app** in VS Code. Stop the server with **Ctrl+C** in its terminal or **Tasks: Terminate Task** from the Command Palette.

To run tests:

```bash
npm test
```

You can also choose **Terminal → Run Task → StayGuide: Run tests**. Both tasks use the existing npm scripts; no build step or second application is involved.

QR codes generated locally point to `127.0.0.1` and therefore **will not open from a separate phone**. After real deployment the same feature will automatically use the public HTTPS domain. Local preview data is test-only.

## What works already

- Fully working host creation, editing and multiple-property switching on the same browser.
- Ten simple cards, with empty guest sections automatically hidden.
- Persistent property data in local dev, with Cloudflare D1 adapter in the deployment version.
- Owner-only edit API using a random secret token; the public guide contains no edit token.
- Real, stable URL `/g/<id>` for every guide; updates appear at the same URL.
- Server-rendered responsive HTML guests can read without any JavaScript.
- Optional ~0.4 KB enhancement to copy the Wi-Fi password.
- Dependency-free QR generator (SVG) and print-friendly QR card.
- `noindex`, HTML escaping, CSP on public pages, basic field validation.
- Lighthouse-style priorities: system fonts, no images/fonts/CDNs/frameworks/tracking on real guest pages.
- Automated Node tests and audit desktop/mobile visual review. QR decoding and physical print verification remain outstanding; see the [verified baseline](docs/ROADMAP.md#verified-baseline-and-completed-work).

## Not yet included

- **No** sign-up/login/account recovery, 24-hour demo expiry, user migration, anti-abuse rate limiting, translations, guest language switching, image uploads, multiple host accounts, property duplication, billing, PDF welcome books, operational monitoring, backups, complete GDPR/legal pages.
- **No** public deployment or real Cloudflare/D1 smoke test: no external account or permission was supplied.
- No assertion that this prototype may be safely exposed to the Internet yet.

These are next milestones, not silently omitted features. Do not publicly deploy without the safety gate below.

## Architecture

Production-oriented prototype:

```text
Browser (host) ── /app.html + app.js (static assets)
      │ POST /api/guides, authenticated PATCH/GET
      ▼
Cloudflare Worker ── Cloudflare D1 (one row/guide, JSON content)
      │
      ├── /g/:id → server-rendered HTML (no framework needed)
      ├── /g/:id/qr.svg → pure JS QR (no third-party QR API)
      └── /g/:id/card → printable HTML QR card

All .css/.js/.html assets served as static assets.
```

The production Worker is `src/worker.js` and the SQL D1 schema is `schema.sql`. The local `node/server.mjs` + `node/db.mjs` is a minimal, dependency-free preview adapter that persists JSON for local work, **not** an extra production service.

This vertical slice intentionally uses one `guides` table and simple JSON fields. A real host account model is introduced only at the commercial readiness stage.

## Moving to Cloudflare *after approval*

1. Create a Cloudflare account and database through the official console. Do not activate billing without approval.
2. Install Wrangler with `npm install` on your own development machine (network access required).
3. Create a D1 database: `npx wrangler d1 create stayguide` and replace `REPLACE_WITH_D1_DATABASE_ID` in `wrangler.jsonc` with its actual database ID.
4. Apply `schema.sql` to the **local** D1 first: `npx wrangler d1 execute stayguide --local --file=schema.sql`.
5. Develop using `npx wrangler dev`; then review authentication, CAPTCHA/rate limits, time expiry, legal/backup and all security checks before deciding whether to deploy publicly.

**Do not run `wrangler deploy` yet.** No production deployment was performed.

## Decisions vs open questions

**Fixed in the Master Brief:** €1/property/year as starting target, no tiers, real no-registration test, multilingual guide from first public release, downloadable QR, printable A4/A5 book, no ads/views billing, no booking/PMS/AI bot, no public SEO indexing for individual guest guides.

**Open:** translation vendor and usage caps, VAT handling / merchant-of-record / billing, account signup method, 24-hour trial abuse defenses, host-to-guest language workflow, image delivery and optimization, domain selection, cache invalidation, analytics privacy.

## Next implementable milestones

The following are capability areas, not the authorized execution order. See the [roadmap](docs/ROADMAP.md) for current sequencing; SG-P01 remains recommended and unimplemented.

1. **Trial and sign-in:** 24-hour anonymous trial, expiry policy, rate limits, conversion to durable account, secure server-side sessions and recovery. No guest-visible access controls or exposed entry codes.
2. **Multilingual:** fixed UI localization and **stored** host-text translations, invalidation on source changes and manual correction. First choose a provider using real per-character price and reliable maximum monthly usage.
3. **Completeness:** image upload with validation/compression, A4/A5 welcome PDF from the **same** data, QR cards, duplication and per-account property lists.
4. **Commercial:** checkout with verification webhooks, renewal handling, tax and privacy review, backup, monitoring, load test, production security gate.
5. **Launch:** English marketing SEO, user testing with 5–10 real hosts, conversion funnel, only then public release.

## Performance budget (initial targets, not measured field results)

- Target public guide HTML typically under 15 KB without photos.
- Target total CSS < 20 KB uncompressed, zero web fonts.
- No guest framework, no third-party API fetch when opening a guide.
- Typical page: 1 SSR HTML request + 1 shared CSS request + optional tiny guest JS.
- Real-world mobile metrics and Cloudflare production latency still **must be measured**.

## Important business economics

At €1 **including** illustrative Greek VAT of 24%: ex-VAT amount ≈ €0.806. A standard EU/EEA card payment at **1.5% + €0.25** costs ≈ €0.265; using Stripe Billing pay-as-you-go **0.7%** of billing volume adds ≈ €0.007. Result ≈ €0.53 before hosting, translation, support, refunds and other taxes/fees. This illustration is not a final tax calculation; VAT varies and should be reviewed professionally.

Cloudflare D1 has an included usage quota and Workers Paid starts at $5/month, with included request and CPU allowances. Public guides must stay extremely lean so large traffic is affordable. Actual cost scenarios depend on request/DB use, image storage and traffic shapes; perform a load test before publication.

Verified primary sources (as of November 2026):

- https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/
- https://developers.cloudflare.com/workers/platform/pricing/
- https://developers.cloudflare.com/d1/platform/pricing/
- https://developers.cloudflare.com/r2/pricing/
- https://stripe.com/en-gr/pricing
- https://guestary.com/
- https://touchstay.com/digital-guidebook

## Files

`src/worker.js` — HTTP routing and SSR / `src/qr.js` — QR encoder / `schema.sql` — D1 schema / `public/` — host and guest interface / `node/` — local preview / `tests/` — regression checks.

## Naming warning (discovered 2026-11-11)

**StayGuide is a working name only.** Existing similarly positioned products operate at `https://stayguide.gr/` and `https://stayguide.com/`. Check trademark registers, naming availability and domains before launching publicly. Do not buy a domain or commit to the brand yet.
