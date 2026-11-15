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
| D-009 | Open | Translation provider, quota, supported languages and cost model |
| D-010 | Open | Payment processor, VAT/merchant of record and micro-payment viability |
| D-011 | Open | Authentication, trial expiry and abuse controls |
| D-012 | Open | Final brand/domain; StayGuide name overlaps existing services |
| D-013 | Open | Exact volume discounts, PDF generation approach and photo policy |

Only mark a decision fixed after explicit user approval. The owner explicitly approved the SG-DOC02 strategic principles below; proposed capabilities and technology choices remain open.

## SG-DOC02 — principle approval and open expansion questions

| ID | Status | Decision / open question |
|---|---|---|
| D-014 | Fixed — owner-approved SG-DOC02 principles | More value, not more complexity; optional advanced tools and no extra mandatory onboarding; approximately 2–3 minutes for a basic guide remains a measured goal. One shared source and reusable sections for digital/print products, no separate export editors. Preserve ten-section contracts, mobile-first lightweight SSR, accessibility, warm design and privacy exclusions; no PMS/booking/CRM/chatbot/page builder. See [PRODUCT_SPEC.md](PRODUCT_SPEC.md#approved-expansion-principles). This does not approve candidate implementation. |
| D-015 | Open | Optional-content taxonomy and lifecycle: extend existing sections before duplication; choose activation, hiding versus deletion/retention, empty-state behavior, ordering, export eligibility and backward compatibility. No new section/schema/API contract approved. |
| D-016 | Open | Blank-book and other printable scope: shared primitives versus separate delivery, handwriting space, blank identity/section selection, one-page overflow policy and formats. Filled A4/A5 book remains core; candidates are not launch gates. PDF technology, Workers compatibility, pagination/fonts and operating cost remain under D-013. |
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
