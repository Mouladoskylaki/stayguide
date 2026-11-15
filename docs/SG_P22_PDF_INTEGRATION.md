# SG-P22 — Filled Welcome Book integration evidence

2026-11-15. **SG-P22 implementation deliverables accepted by the owner; commit/push explicitly approved**, for the approved local prototype scope. Owner approves R1 visual direction and reports decoding success for all four R1 review PDFs. Owner reports successful actual-interface manual testing. Push is conditional on deployment safety; deployment and public-launch readiness remain separate. See the [latest acceptance record](#sg-p22--final-acceptance-and-commit-readiness-review-2026-11-14); original integration/R1 entries below retain their historical verification limits.

Latest presentation: see [SG-P22-R1 evidence](#sg-p22-r1--editorial-refinement-evidence-2026-11-14). The following original SG-P22 measurements remain historical baseline evidence.

## Implemented behavior

Filled Welcome Book extends the existing QR & Print dialog: native A4/A5 choice, selected property, one Download PDF action, preparing/success/retry/error feedback, contextual guest-content privacy guidance. No dashboard redesign or guest layout change. SVG/PNG and the A5 welcome card remain intact. Paper sizes have separate margins and typography; headings/sublabels keep following text, long fields flow over pages, and empty fields/sections disappear. A property name alone produces a one-page cover, canonical guest QR and the applicable link warning.

The host's existing field definitions moved unchanged to `public/guide-content.js`. The PDF uses an explicit immutable projection of accepted saved strings, not DOM/form drafts or a spread API/DB object. Property/load/workspace/model guards invalidate delayed results before a download. Exports are blocked during editing/saving, duplicate submissions are disabled, and close/switch/new accepted render clears feedback. No owner token is sent with the canonical QR request or supplied to pdfmake. Known owner credentials pasted into any exported field are rejected before projection.

The actual Regular/Bold font cmap intersection controls preflight. Greek, polytonic/decomposed accents, Latin and tested Cyrillic work; unsupported characters and unsafe control characters identify the field and Unicode codepoints without echoing private values. Nothing is silently removed or transliterated. Arabic, Hebrew, CJK and emoji fixtures are rejected. This does not promise universal multilingual/shaping support or satisfy first-release translations.

## Dependency and license inventory

- **pdfmake 0.3.14**, original published browser bundle, MIT, exactly versioned in `public/vendor/pdf-assets.json` and its filename/hash. There is no application npm dependency graph or new bundler: the approved prebuilt browser distribution is vendored. `package.json` and the existing dependencies are unchanged.
- **Noto Sans v2.015 Regular/Bold**, unmodified TTF bytes, embedded in a local VFS. SIL OFL 1.1 retained. Both TTFs are byte-checked against the original release ZIP. SHA-256 and sizes are in the manifest; the source fonts are not duplicated as separate runtime assets.
- `pdfmake-LICENSE.txt`, `NotoSans-OFL.txt`, `svg-to-pdfkit-LICENSE.txt` and `THIRD-PARTY-NOTICES.txt` preserve notices. The actual publisher source map inventories 25 bundled modules in `bundled-modules.json`: MIT predominates; @swc/helpers and Brotli source notices include Apache-2.0, ieee754 uses BSD-3-Clause, sax uses BlueOak-1.0.0. Fontkit's missing packaged LICENSE was obtained from its upstream repository. dfa/brotli npm archives have no standalone license; their published declarations and applicable source notices are retained. Apache license text is included in the combined notices.
- Separate isolated audit install: `pdfmake@0.3.14` with lifecycle scripts disabled; `npm audit --json` reports **zero advisories** for the resolved runtime dependency tree. Browser-only bundled-module notices were also collected in that temporary audit directory. Most comparable source-map modules match this tree exactly. dfa has no directly comparable source file, pdfkit differs, and two core-js files differ; `auditVersion` is explicitly an audit resolution, not a claim of a publisher-supplied bundle lockfile. Binary/source hashes, source comparison counts and this limitation are retained. Zero advisories is not a security certification of every shipped byte.

Provenance: [official pdfmake 0.3.14 npm archive](https://registry.npmjs.org/pdfmake/-/pdfmake-0.3.14.tgz), [Noto Sans v2.015 release](https://github.com/notofonts/latin-greek-cyrillic/releases/tag/NotoSans-v2.015), [pdfmake browser documentation](https://pdfmake.github.io/docs/0.3/getting-started/client-side/), [custom-font documentation](https://pdfmake.github.io/docs/0.3/fonts/custom-fonts-client-side/), [upstream fontkit license](https://github.com/foliojs/fontkit/blob/master/LICENSE). No runtime CDN calls.

Maintenance: `python3 scripts/prepare-pdf-assets.py /path/to/approved/SG-P22-POC` verifies registry SHA-512, extracts the exact bundle/licenses and verifies both fonts against the original ZIP, then reproduces VFS/cmap/hash/gzip artifacts. It does not download anything. `node scripts/audit-pdf-assets.mjs /path/pdfmake-0.3.14.tgz /path/isolated/node_modules` prints the source-map inventory and packaged notices for review. Preserve additional upstream/source notices when refreshing. Any version/font change needs owner approval and the complete PDF/browser checks; do not replace assets from mutable CDN URLs.

## Measurements

Local Linux desktop, Chrome 131 headless, synthetic fixtures and ephemeral in-memory Worker. These are individual observed runs, not device/performance guarantees.

| Lazy asset | Raw bytes | Gzip bytes (deterministic gzip) |
|---|---:|---:|
| pdfmake browser bundle | 835,141 | 294,839 |
| Noto Sans VFS (both weights) | 2,218,566 | 1,013,506 |
| Combined main payload | 3,053,707 | 1,308,345 |

The small adapter/coverage modules load on export too; exact resource/asset figures accompany `performance.json` and `payload.json` in the technical evidence. The ordinary dashboard loads the shared field registry, without the library/font/coverage payload. Opening QR & Print still does not load those payloads. The local test server transfers uncompressed assets: gzip figures are measured compressed artifacts, not a claim that the local server enabled HTTP compression.

Final Chrome run: first successful UI export **350 ms** including lazy module/library/font loading, generation and polling overhead. Identical warm A4 exports **99.8 / 105.7 / 115.1 ms**; typical A4/A5 generation **119.2 / 136.5 ms**. Long fixtures **114.8 / 131.0 ms**; all-max-field A4/A5 **153.7 / 138.9 ms**. Sampled JS heap rose from 5,173,856 bytes before first use to 28,656,561 bytes afterward; fixture samples are in `performance.json`. Repeated-fixture samples are GC-dependent, not peak memory measurements or a memory budget. Fonts/library remain in memory for reuse; PDFs are transient Blobs and download URLs are revoked after 30 seconds. No PDF is persisted remotely or generated on startup/save/guest view.

## Verification

- `npm test`: **PASS**, five files, zero failures. Direct named suites: **125 tests** (55 host, 22 PDF, 12 guest, 28 QR/print, 8 Worker).
- Complete Chrome suite: **PASS**. Existing creation/switching/stale requests, ten editors/save/error/retry/discard/focus, saved progress, property tabs, compactness at 1440/1280/768/390/320, recovery, QR PNG/SVG and single-card PDFs all pass. Marketing comparison passes; guest SSR/no-JS/anchors/copy/sparse/long/injection tests pass. Guest fixture HTML/CSS/JS bytes remain 9405/6668/1142.
- SG-P22 Chrome: actual A4/A5 UI downloads; native radio keyboard operation; font-load and QR-fetch failure/retry; duplicate-click and stale-close/switch guards; no eager PDF assets; 1440/390/320 workspace checks. Eleven real PDFs plus warm repeats generated from actual saved-field fixtures.
- Independent Poppler: **PASS** across eleven fixture PDFs: complete ordered text, embedded subset Noto fonts/Unicode maps, A4 595.28 × 841.89 pt / A5 419.53 × 595.28 pt, all word boxes inside measured bounds, no measured line overlaps or unintended blank pages, heading/first-text association. Typical A4/A5: 3/4 pages; Greek: 4; minimal: 1/1; 80-character unbroken Greek names: 3/4; long: 4/6; all-max fields: 12/15. Every page rendered at 110 dpi, with grayscale A5 copies. Selectable text verified by extraction, not screenshots.
- QR raster: **PASS**, canonical module-centre pixels and four-module quiet borders match on all eleven rendered covers. Visible destination and PDF URL annotations match each selected fixture's canonical guest URL. **Independent decoding NOT TESTED**: OpenCV, zbar/ZXing and Chrome BarcodeDetector unavailable in the inspected environment. This is not a decode/scannability claim. Local evidence URLs include explicit unsuitable-for-permanent-use warnings and cease to serve after tests.
- Firefox desktop: actual A4/A5 UI download smoke and independently extracted Greek/name/dimensions **PASS** on Firefox 159. Full Firefox regression/keyboard/stale/performance coverage **NOT TESTED**. No general compatibility certification.
- Safari, real iOS/Android downloads/keyboards, assistive technology, physical phone QR scan/printing and production Cloudflare/D1 execution: **NOT TESTED**.

The isolated Firefox runner uses an ignored, dedicated `.local/sg-p22-firefox-*` test profile and ephemeral DB/port. It does not touch the owner's normal browser profile or `.local/guides.json`. Profiles/binaries are excluded from deliverables.

## Privacy, risks and owner review

Only the canonical allowlisted saved strings and token-free guest URL enter the PDF; metadata uses static StayGuide labels. Host text stays plain PDF text, with no arbitrary HTML/JS/images/attachments or user-controlled network assets. No external processor, public PDF endpoint, PDF remote cache, API/schema/auth change or CSP relaxation. Guest-facing Wi-Fi is intentional. Known owner tokens and recognizable private access/authentication patterns reject export; error messages do not echo their values. **Unknown secrets in arbitrary free text cannot be reliably classified**: hosts must review saved guest content and remove private arrival/reservation/access information. The warning and tests do not resolve the broader security/privacy gate. PDFs are selectable but are not tagged accessible PDFs; screen-reader PDF accessibility is not certified.

Owner package and separate technical evidence are under `/home/konstantinos/StayGuide-Reviews/SG-P22/Integration-2026-11-14/` (exact inventory/hash manifest in that directory). Package contains realistic A4/A5, distinct Greek and long fixture PDFs, workspace screenshots, concise report and exact changed files; no dependencies/fonts/profiles/binaries. Owner visual acceptance is **pending**. Next step: review these outputs and validate independent QR decode/real devices/physical printing under separately approved verification scope. No further roadmap task, commit, push or deployment follows automatically.


## SG-P22-R1 — editorial refinement evidence (2026-11-14)

Owner authorized only PDF presentation/pagination refinement, preserving all 32 pending paths and functionality. Before sources and original review PDFs were copied inside `.local/qa/SG-P22-R1/` without changing external evidence. Changes are limited to the PDF presentation region, focused PDF verification/tests and this task's documentation. No dependency, font, projection, privacy/glyph, lazy-loading/generation, stale-export, dashboard/guest/API/schema/auth or configuration change.

**Presentation:** pale cream cover with discreet masthead, larger property-name hierarchy, restrained rules and a lower canonical vector QR/link band. Long names retain their text at the same cover font size with reduced introductory spacing. Interior uses consistent icons for all ten sections, subtle dividers, static headers/footers and better Wi-Fi/arrival hierarchy. Body size remains 11pt A4 / 10.5pt A5; side margins remain 48pt / 32pt, with increased body-top allowance for page headers. Short Wi-Fi credentials pair only when conservatively fitting; long/wide/multiline/Greek values keep full-width flow. Short paragraphs travel together, long paragraphs remain breakable, and saved blank lines retain their height. Compact three-page A4 books can move a late section to the existing short final page to balance their interior spread; long books retain natural flow. Heading/label checks target their own saved-value IDs, not decorative child nodes.

| Same saved fixture | Before pages | R1 pages |
|---|---:|---:|
| Typical A4 | 3 | 3 |
| Typical A5 | 4 | 3 |
| Greek A5 | 4 | 3 |
| Long A4 | 4 | 3 |
| Long A5 | 6 | 5 |
| Minimal A4 / A5 | 1 / 1 | 1 / 1 |
| Maximum Greek name A4 / A5 | 3 / 4 | 3 / 3 |
| Maximum saved fields A4 / A5 | 12 / 15 | 11 / 14 |

All eleven original saved models and paper sizes match byte-for-byte in fixture JSON; no content was shortened. Two additional 80-character W-name checks produce three-page books on both sizes. These are fixture-specific results, not fixed page-count guarantees.

**Automated verification:** npm test PASS, five files/zero failures; 130 named tests (55 host, 27 PDF, 12 guest, 28 QR/print, 8 Worker). Complete final Chrome suite passes, including original compact dashboard/property/editor/progress/guest/QR/card regressions, no eager assets and PDF failure/retry/stale guards. Original guest asset bytes remain 9405/6668/1142. Firefox desktop A4/A5 download smoke is recorded in workspace-local evidence; comprehensive Firefox/Safari/real mobile remain unverified.

**Independent PDF checks:** thirteen actual fixture PDFs, 56 pages rendered at 110dpi. Poppler verifies ordered complete text, exact A4/A5 page dimensions, embedded Noto subsets, measured word bounds/line overlaps, headings sharing a page with their first saved text, one-page minimal covers and no unintended blank pages. The validator excludes only geometric header/footer bands when reconstructing cross-page saved text, preserving raw pdftotext/bbox outputs. It additionally checks subtitle/QR-panel separation on long covers and verifies the actual UI-downloaded A4/A5 files. All thirteen canonical QR module grids and four-module quiet borders match after rasterization. Independent decoding remains NOT TESTED: no installed decoder; none installed for this task. Physical scans/printing, Safari, real devices and comprehensive PDF accessibility remain unverified.

**Iteration evidence:** the initial paired long Wi-Fi layout interleaved extraction; long/multiline values now use full width. A first render still had a final-page line in typical A5; spacing refinement removed it, then short-paragraph keeps removed a lone continuation word while retaining three pages. The raster validator's round-to-nearest sampling caused 46 false module mismatches at the smaller A5 QR scale; sampling geometric pixel cells with floor yields zero, with the canonical SVG unchanged. No source content, QR encoding, font or privacy guard was altered to pass checks.

**Artifacts:** `.local/qa/SG-P22-R1/final/` holds technical evidence; `.local/reviews/SG-P22-R1/` holds the compact owner package with updated A4/A5/Greek/long PDFs, every-page contact sheets, before/after cover/final-page comparisons, report/checks and hashes. Original external SG-P22 review/POC artifacts remain unchanged. Final owner visual approval is pending. Parent SG-P22 stays IN PROGRESS for unresolved acceptance/release gates; no commit, push, deployment or following roadmap task is authorized.


## SG-P22 — final acceptance and commit-readiness review (2026-11-14)

**Verdict: ready for owner commit approval.** No scoped code/test blocker identified; no commit, push, deployment or subsequent task performed/authorized. The approved prototype implementation remains unchanged by this review. Only existing acceptance/status/evidence documents are updated; all 23 pending non-documentation files are preserved byte-for-byte.

**Scope/provenance:** all 32 intended paths accounted for (9 docs, 14 public host/PDF/vendor assets, 3 maintenance/verification scripts, 6 tests). Complete tracked patch and new source/tests/scripts/notices reviewed; large vendor/font payloads verified against pinned hashes, decoded TTF bytes and the original publisher archive. MIT/OFL/third-party notices retained. No detected credential patterns or unrelated changes. No QA PDFs/ZIPs/profiles/caches enter the intended Git set; versioned library/font VFS are intentional approved runtime assets. No guest/Worker/server/schema/API/dependency/infrastructure/SG-SHARE01 changes.

**Fresh automated checks:** npm test PASS, 5 files/0 failures; direct named suites PASS, 130 tests (55 host, 27 PDF, 12 guest, 28 QR/print, 8 Worker). Complete Chrome suite PASS, including A4/A5 actual downloads, immutable accepted saved projection, drafts excluded, property/load/workspace guards, duplicate prevention, failure/retry, unsupported-glyph/known-token/privacy rejection, lazy assets and all existing host/guest/QR/card checks. Firefox 159 desktop A4/A5 download smoke PASS with independently extracted Greek/name/dimensions. Poppler/raster checks PASS on 13 freshly generated PDFs / 56 pages: complete ordered text, embedded Noto fonts, exact paper sizes, measured boundaries/overlaps, heading/body and cover/QR separation, minimal and maximum-content pagination, UI downloads, canonical destinations and all 13 module/quiet-zone grids. No application or test changes were required. Evidence is retained in `.local/qa/SG-P22-acceptance/`.

**Owner-reported independent decoding:** the owner reports that decoding previously succeeded for `Welcome-Book-A4.pdf`, `Welcome-Book-A5.pdf`, `Welcome-Book-Greek.pdf` and `Welcome-Book-Long-A5.pdf` in `.local/reviews/SG-P22-R1/pdfs/`. Their original R1 manifest hashes were reverified unchanged. Decoder/method/date/output details were not supplied in this turn; the agent did not rerun decoding or attribute success to a particular decoder. This owner-reported evidence supersedes the earlier “not tested by agent” gap for those four frozen review PDFs; it does not claim independent decoding of every freshly generated regression PDF.

Software decoding does **not** establish a physical phone-camera scan, paper-print scannability, publicly reachable HTTPS destination or successful guide opening on another device. The review files contain warned local test URLs whose isolated servers have stopped. Original review packages/manifests remain unchanged as historical artifacts.

**Remaining gates:** owner actual-interface acceptance and explicit commit permission remain pending, without an identified code/test blocker to requesting that approval. Before public guest use, test intended Safari/iOS/Android devices, download behavior/performance, physical print/grayscale and phone scan/opening of a separately authorized stable public HTTPS URL. PDF text is selectable but remains untagged; assistive-technology usability is unvalidated. Noto's supported-script preflight remains bounded; English/Greek evidence does not fulfill first-public-release translations. Arbitrary free-text secrets cannot be comprehensively classified by the existing heuristic; known-token/pattern checks plus host review do not certify semantic privacy. Temporary localStorage edit-token authentication, accounts/ownership/recovery/revocation, abuse/trial/payment/privacy/backup/monitoring and the [security launch gate](SECURITY.md) remain production blockers. The earlier resolved-tree dependency audit is historical and has its documented exact-bundle coverage limits. None of these authorizes an unrequested feature or prevents a local Git checkpoint of this reviewed prototype.

### Actual-interface owner acceptance checklist

1. Reload the running StayGuide interface, select a non-sensitive test property, wait for “All changes saved” and confirm QR & print identifies it.
2. Download A4 and A5; inspect the property name, saved Wi-Fi/arrival/contact text, Greek/line breaks, omitted empty sections, selectable text and page boundaries.
3. Save a small edit and re-export; confirm the new value. Discard an unsaved edit and confirm it does not appear in the next PDF.
4. Close QR & print, switch properties and export again; confirm the filename/name/destination match the selected property and repeated downloads recover correctly.
5. On the test property only, check actionable unsupported-character feedback and successful retry after restoring supported text; verify keyboard access, QR PNG/SVG and existing welcome-card preview. Never test using real private access information.

Next step: owner actual-interface acceptance and explicit SG-P22 commit approval. No photographic PDF work, showcase, next roadmap task or Git/deployment action follows automatically.


## SG-P22 — owner acceptance and Git checkpoint authorization (2026-11-15)

The owner reports completing manual testing in the actual StayGuide interface and confirms SG-P22 works correctly. They explicitly authorize one commit and push of the 32 reviewed SG-P22 paths, conditional on confirming deployment safety. No deployment, application/design change, photographic or multilingual feature, subsequent task or expansion brief is authorized. Earlier entries retain their historical pending statuses and validation limits.

Checkpoint checks: all 23 implementation/test/vendor/script paths match the acceptance baseline byte-for-byte; all 32 intended paths remain accounted for. Fresh npm test passes (5 files, zero failures). Previously successful full Chrome, Firefox desktop A4/A5 smoke and 13-PDF/56-page verification evidence is preserved; unchanged code requires no affected-browser rerun. Four R1 independent decodes remain owner-reported software evidence, not physical phone scanning or publicly reachable URL validation. Prelaunch limitations above remain open.
