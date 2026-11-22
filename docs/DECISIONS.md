# Decision log

| ID | Status | Decision / open question |
|---|---|---|
| D-001 | Fixed | Fast, simple, international, mobile-first, no guest account |
| D-002 | Fixed | Target €1/property/year, no permanent free plan or tiers; price not to change unilaterally |
| D-003 | Fixed | Multilingual from first public release, with stored translations |
| D-004 | Fixed | QR and printable welcome book are core features |
| D-005 | Fixed | Guest guides noindex; no entry/keybox/alarm codes |
| D-006 | Fixed | Vanilla HTML/CSS/JS direction; no unnecessary framework |
| D-007 | Fixed | User reference mockups define warm design direction |
| D-008 | Open | Final cloud architecture, caching/invalidation and storage pricing |
| D-009 | Partially resolved — model and initial language set selected | OpenAI gpt-6-luna, Standard Global selected for v1; D-022 records the six-language milestone set. Production quota, quality validation, cost/privacy and integration controls remain open; no paid generation from guest views in v1. |
| D-010 | Open | Payment processor, VAT/merchant of record and micro-payment viability |
| D-011 | Open | Authentication, trial expiry and abuse controls |
| D-012 | Open | Final brand/domain; StayGuide name overlaps existing services |
| D-013 | Open | Exact volume discounts and photo/remaining PDF policy; SG-P22 browser pdfmake/Noto Sans technology is already approved, not reopened. |

Only mark a decision fixed after explicit user approval. The owner explicitly approved the SG-DOC02 strategic principles below; proposed capabilities and technology choices remain open.

## SG-DOC02 — principle approval and open expansion questions

| ID | Status | Decision / open question |
|---|---|---|
| D-014 | Fixed — owner-approved SG-DOC02 principles | More value, not more complexity; optional advanced tools and no extra mandatory onboarding; approximately 2–3 minutes for a basic guide remains a measured goal. One shared source and reusable sections for digital/print products, no separate export editors. Preserve ten-section contracts, mobile-first lightweight SSR, accessibility, warm design and privacy exclusions; no PMS/booking/CRM/chatbot/page builder. See [PRODUCT_SPEC.md](PRODUCT_SPEC.md#approved-expansion-principles). This does not approve candidate implementation. |
| D-015 | Open | Optional-content taxonomy and lifecycle: extend existing sections before duplication; choose activation, hiding versus deletion/retention, empty-state behavior, ordering, export eligibility and backward compatibility. No new section/schema/API contract approved. |
| D-016 | Open | Blank-book and other printable detail: handwriting space, blank identity/selection, overflow and exact essential formats. D-020 supersedes the historical candidate-only launch framing: these public-v1 capability classes remain required, with exact acceptance open. Filled A4/A5 implementation/technology remains accepted; photo/font/remaining policy questions stay under D-013. |
| D-017 | Open | Value-feature/privacy design: Wi-Fi QR security types/encoding and credential exposure, validated action links, safe template insertion/copying, offline caching/staleness and minimal statistics usefulness/cost/privacy. No tracking, automatic messaging, provider or service approved. |
| D-018 | Open | Proposed indexable editorial `/guides/` architecture/content research, separate from noindex `/g/:id`; SG-SEO-01 requires separate authorization, verified evidence and human publication approval. SG-P50 retains implementation/publication scope; Search Console access/workflow not approved. |

Existing D-001–D-013 remain unchanged. SG-DOC02 selects no PDF technology, provider, storage, new price, subscription structure or volume discount. The €1/property/year direction remains provisional pending payment/tax, hosting/storage, translation, PDF, support/maintenance and demand verification; no commercial evidence is invented.

## SG-UX-01 — limited visual-direction approval (2026-11-13)

| ID | Status | Decision / boundary |
|---|---|---|
| D-019 | Fixed — owner-authorized SG-UX-01 direction | Compact host workspace, coherent property header/actions/ten-section editing surface, truthful saved-data progress alongside on desktop and after editing on mobile, warm restrained visual identity and clearer existing QR/card outputs. Future A4/A5 book direction is minimal/premium with readable type, icons, distinct Wi-Fi, clear arrival/departure, good spacing and realistic content. See [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md#sg-ux-01--owner-approved-workspace-and-future-book-direction). This is visual direction and the bounded SG-UX-01 implementation authorization; final visual acceptance, PDF integration, technology/font/privacy/browser choices and D-013 remain separate. |

2026-11-14, SG-UX-01-R1: the owner reports successful interaction testing of the actual local application and approves the overall dashboard direction in principle. They explicitly authorize only the final refinement scope in [IMPLEMENTATION_TASKS.md](IMPLEMENTATION_TASKS.md#sg-ux-01-r1--final-dashboard-polish-owner-authorized-2026-11-14): one labelled Add button, no sidebar slogan, consistent outlined/solid/check status marks and stronger mobile/layout regression coverage. This is not final R1 acceptance, commit/push/deployment or next-task/PDF integration approval.


## SG-P22 technology approval — 2026-11-14

Owner explicitly approves pdfmake **0.3.14**, embedded Noto Sans Regular/Bold, client-side generation and lazy local assets for filled A4/A5 integration. No external processor, storage or PDF endpoint. Approval is limited to this technology and SG-P22 implementation/testing/documentation; D-013 remains **Open** for its other unresolved photo/discount/policy questions. Unsupported font coverage must block export with actionable feedback, never substitute text; guest Wi-Fi may print but private access/keybox/alarm/authentication content must be excluded. Arbitrary free-text privacy and first-public-release multilingual/security gates are not certified by heuristics or desktop PDF tests. No publication/commit/push/deployment approved.

Implementation note: the approved browser distribution is vendored and hash-pinned, with original Noto Sans v2.015 TTF bytes encoded in a local VFS; no additional application package dependency or build pipeline. Current tests do not resolve D-013's other questions or certify arbitrary free-text privacy, universal glyph support, mobile compatibility or public-release readiness. Owner final visual acceptance remains pending.


## SG-P22 final review — owner approval/evidence boundaries (2026-11-14)

The owner approves **SG-P22-R1's visual direction** and reports that independent decoding previously succeeded for all four R1 owner-review PDFs (A4, A5, Greek and long A5). This records owner-reported software-decoding evidence, not an agent rerun, physical phone/printed-paper scanning or successful access to a public HTTPS guide. Actual-interface acceptance and explicit commit/push/deployment permissions remain separate; no further feature/task is authorized. Existing technology approval and all other open D-013/privacy/multilingual/security decisions remain unchanged.


## Owner-approved launch and multilingual direction (2026-11-15)

| ID | Status | Decision / boundary |
|---|---|---|
| D-020 | Fixed — product direction only | Polished v1 includes optional property/section photography, photographic filled books, blank books, essential printables, additional sections, templates/actions, comprehensive languages and actual-results homepage; beautiful defaults and progressive disclosure preserve the compact fast workplace. Three proposed real example booklets and homepage-before-workspace placement are recorded in [alignment](LAUNCH_MULTILINGUAL_ALIGNMENT.md). No implementation or exact showcase mechanism approved. |
| D-021 | Fixed — behavioral requirements only | Pretranslated UI, host/guest language selection, AI server-side content translation, saved reusable section/source-version translations, invalidation with manual-correction preservation, PDF reuse, clear SSR fallback without extra guest steps, cost/abuse protection, accurate entities/instructions and no provider transfer of private credentials/account secrets. See [requirements and open choices](LAUNCH_MULTILINGUAL_ALIGNMENT.md#approved-multilingual-requirements). At original approval these did not select implementation; later D-009/model authorization and Phase 3A/3B govern the implemented foundation, D-022 the initial language set. Production policy remains open. |

Current reconciliation: D-009 is partially resolved for the approved model and D-022 initial language set. Quality evaluation, representative costs/latency, public-launch language acceptance, production quotas/recovery, privacy and pretranslation policy remain open. No paid guest-view generation in v1; guest-initiated AI generation is future scope. D-008/D-013 remain Open for media/storage and remaining PDF/photo policy; Unicode fonts/RTL, exact showcases and launch acceptance dependencies are unresolved. D-015–D-018 retain Open status; D-016's earlier candidate-only launch framing is superseded by D-020's launch direction, not by implementation approval. SG-P22's exact technology approval and DONE status remain preserved. Owner manual acceptance and the authorized Git checkpoint completed at `c76f326`; this is not deployment approval.


## SG-P31 Phase 3A — explicit owner model/storage authorization

Owner selects **OpenAI gpt-6-luna, Standard Global** for v1 and authorizes additive migrations, local storage extensions and mock-only translation infrastructure. This supersedes prior provider/model-unselected statements for that choice only; it does not close D-009's quota, quality, language coverage, privacy, billing or production gates. [Phase 3A](SG_P31_PHASE3A_FOUNDATION.md) records the bounded implementation. No other provider comparison, live call, credential operation, paid service, live migration, commit/push or deployment follows.


## SG-PAR-02 — explicit owner language decision (2026-11-22)

| ID | Status | Decision / boundary |
|---|---|---|
| D-022 | Fixed — initial milestone language selection only | Greek, English, German, French, Italian and Spanish are the initial intended validated Multilingual v1 language set, not a permanent restriction on future languages. Selection is approved; validation is pending. [Acceptance matrix](LAUNCH_ACCEPTANCE_MATRIX.md) separates this milestone from full public StayGuide launch; its numeric thresholds, regional identifiers, directed sample/reviewer plans and implementation sequence are proposals awaiting approval. |

Preserve gpt-6-luna Standard Global, saved translations, no paid generation from guest views in v1, simple mobile-first UX, €1/property/year target and approximately 24-hour signup-free trial direction. D-020/D-021 and every previously approved public-v1 capability remain intact. D-008/D-010/D-011/D-013/D-015–D-018 stay open for their unresolved details; no proposal becomes an approved architecture, quota, API, purchase or deployment here. Bounded Phase 3B owner acceptance and Git checkpoint at `46ea431817c88f9f5d7e0ed2270f7462bef558fa` do not complete parent SG-P31 or authorize public launch.
