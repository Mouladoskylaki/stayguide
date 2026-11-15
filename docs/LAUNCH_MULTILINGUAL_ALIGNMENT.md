# Launch and multilingual product alignment

2026-11-15. Owner-approved **product direction**, documentation only. No implementation, provider integration, purchase, schema change, commit, push or deployment is authorized. Existing IDs, completed work and architecture remain intact. This record updates future launch intent, not the acceptance scope of completed SG-P22.

## Current implementation and authority

SG-P22 is owner-accepted and checkpointed/pushed as `c76f32628d83f89855c0dc2c6e5e9bff2a1c141e`: filled text-based A4/A5 books, saved-content projection, embedded bounded Noto Sans coverage and canonical QR. Preserve [PDF evidence and limits](SG_P22_PDF_INTEGRATION.md), SG-UX-01's compact workspace and SG-SHARE01. Photos, blank books, extra printables, translations and new showcases are not implemented. SEO research is completed; editorial routes/publication remain proposed in [the SEO report](SEO_GUIDES_PROPOSAL.md).

## Approved v1 launch direction

Public v1 should be substantially complete and polished: excellent digital guest guides; optional property and section photography; photographic Welcome Book PDFs; filled and blank books; essential individual printables; optional additional information sections; suggested content templates; useful one-tap guest actions; comprehensive multilingual support; and a polished public homepage showing actual results.

More value, not more complexity. Beautiful by default, with no design decisions required. A beautiful basic guide in 2–3 minutes is a usability target to measure, not an achieved claim. Keep the dashboard a clean workplace, mobile-first and exceptionally fast. Advanced features use progressive disclosure and never add mandatory onboarding steps. Optional photos/sections are optional for the host even though their capabilities are part of the intended launch direction. Exact launch languages, printable subset and acceptance thresholds still need owner approval.

Three proposed real showcase booklets are **Aegean House — Mediterranean / Coastal**, **Kyoto Garden Stay — Japanese / Minimal**, and **The Manhattan Loft — Urban / Contemporary**. These are examples, not mandatory themes or country-based aesthetic assignments. The homepage should show them before entry into My Properties; Print & Download may offer a small View Example option. Use rights-cleared imagery and synthetic/non-sensitive content in any later approved production. No showcase is created here. Advertise only implemented, verified capabilities. Japanese-character PDF support needs validated fonts, Unicode coverage, extraction and layout before any claim or Japanese-text example; current Noto coverage is not proof.

## Approved multilingual requirements

1. Pretranslate application UI strings; provide language selection for hosts and guests.
2. Translate host-authored content with AI through server-side requests. Do not put provider keys or direct provider requests in guest browsers.
3. Save and reuse translations, including in PDFs. Cache by property, language, section and source-content version; do not translate on every view.
4. Invalidate translations when original content changes. Preserve manual host corrections; define how corrected prior-version text is retained and identified as stale before deciding how it can be reused. Never silently overwrite corrections or serve obsolete instructions as current.
5. Provide clear fallback when translation fails, without mandatory popups, accounts or additional guest steps. SSR guest content must remain readable without JavaScript.
6. Keep costs low and prevent abuse. Guest-trigger limits, budgets, retries and automatic pretranslation policy remain decisions, not approved mechanisms.
7. Preserve numbers, times, addresses, special characters and practical instructions accurately. Evaluate meaning, negation, safety instructions, terminology and mixed scripts with qualified language review; visual polish is not translation-quality proof.
8. Never send private credentials or account secrets to translation providers. Guest-facing Wi-Fi may be printed under existing policy, but permission to print it is not permission to send its password to a provider. Define minimal translatable fields, credential exclusion and privacy review before integration.

These are behavioral requirements, not a schema/API design. Locale identifiers, revision concurrency, cache storage/expiry, correction provenance and request orchestration must be proposed and approved separately. Translation failure must not make the original guide unreadable.

## Current provider desk research

Subsequent SG-P31 Phase 1 research is now prepared in [the Phase 1 report](SG_P31_PHASE1_RESEARCH.md). The original planning observations below are retained; Phase 1 expands verification, uncertainties, scenarios and benchmark design without selecting a provider or authorizing Phase 2.

Primary documentation checked 2026-11-15; no accounts, API calls, benchmarks or spending. Rates and availability must be rechecked at selection time. No provider/model is selected and no measured StayGuide cost, latency or quality is claimed.

| Candidate | Observed offering and consequence for research |
|---|---|
| OpenAI | General text models are candidates for instruction-sensitive translation. The [API deprecation register](https://developers.openai.com/api/docs/deprecations) lists `gpt-4.1-mini-2025-04-14` as deprecated on October 14, 2026, with shutdown January 14, 2027 and `gpt-6-luna` as the suggested replacement. Do not default to GPT-4.1 mini or automatically adopt that replacement. Evaluate currently supported candidates against the [model catalog](https://developers.openai.com/api/docs/models) and [pricing](https://openai.com/api/pricing/) after checking lifecycle and data handling. |
| Google Gemini Developer API (separate candidate) | Evaluate `gemini-2.5-flash-lite` or a currently supported successor such as `gemini-3.5-flash-lite`, subject to project access and fresh lifecycle checks. Google's current [deprecation register](https://ai.google.dev/gemini-api/docs/deprecations) lists no announced shutdown for stable 2.5 Flash-Lite but restricts 2.5 access to prior users; do not confuse it with the retired preview. [Standard paid pricing](https://ai.google.dev/gemini-api/docs/pricing) lists 2.5 Flash-Lite text input/output at $0.10/$0.40 per million tokens, and 3.5 Flash-Lite at $0.30/$2.50, including thinking in output billing. These are list rates, not measured StayGuide costs. Evaluate this generative API independently from Cloud Translation; no model is selected. |
| Google Cloud Translation | Current [offering](https://cloud.google.com/translate) includes NMT and Translation LLM. The [pricing page](https://cloud.google.com/products/translate/pricing?hl=en) meters Translation LLM input and output separately at $10 per million characters each. That is a list rate, not per-property cost. Its [data-usage FAQ](https://docs.cloud.google.com/translate/data-usage) distinguishes regional Advanced endpoints from global processing and says submitted text is not used to train translation features. Confirm exact chosen feature/endpoint terms and supported pairs. |
| DeepL API | The [current plan documentation](https://support.deepl.com/hc/en-us/articles/360021200939-DeepL-API-plans) describes Developer, Growth and Enterprise plans; legacy Free/Pro are no longer purchasable. Growth includes usage controls and next-generation language-model access; its stated immediate text deletion is plan-specific. Verify target-language/model availability, regional pricing, minimum commitments, retention and contracts for the chosen plan; do not reuse historical Free/Pro cost assumptions. |

Gemini data handling must be evaluated under its own [Additional Terms](https://ai.google.dev/gemini-api/terms), not Cloud Translation's FAQ: unpaid-service input/output can be used for product improvement and human review; paid-service prompts/responses are not used for product improvement but can be logged temporarily for abuse/security/legal purposes. The terms apply paid-service data-use provisions to EEA/Swiss/UK users even for unpaid quota, and require Paid Services for API clients made available to users there. Verify applicable account, region, retention and contractual conditions before any integration; neither free access nor paid processing establishes zero retention. No private credentials/account secrets may be submitted. This is documentation research only, not authorization to enable billing or call either tier.

SG-P31 research should use a common, non-sensitive hospitality corpus and language-pair matrix. Report reviewer-assessed fidelity and severity, terminology, preserved entities, failure rate, cold/warm latency percentiles, request limits and repeatability. Model full property lifecycle costs: source volume × targets × edits/cache misses, input/output billing, retries, minimum subscription, hosting and review/support costs; compare to the provisional €1/property/year goal without currency or viability assumptions. Cache hits and corrections need explicit scenarios. Any paid experiment or real data transfer requires separate authorization.

## Open decisions and release gates

D-009 remains open: provider/model, quality criteria, measured costs/latency, launch languages, guest-trigger limits, failure/retry behavior, privacy/provider handling and popular-language pretranslation. D-013 remains open for photo policy and other remaining questions; completed SG-P22's approved runtime/font choice is not reopened. D-008 covers storage/processing architecture. Font licenses/coverage, CJK and RTL shaping/bidirectional layout, PDF accessibility, photo storage/transforms/limits/PDF memory, exact showcases and launch feature dependencies/acceptance gates remain unresolved. No multilingual completeness or Japanese/RTL support is certified.

Before public launch: obtain owner-approved bounded scope and measurable acceptance per capability; validate saved/translated content across SSR and PDFs, invalidation/corrections, unavailable languages, privacy, abuse/cost ceilings, real devices and physical print/QR behavior. Complete existing [security gates](SECURITY.md), trial/account/billing/backup/monitoring requirements and final manual production approval. No photo or translation extension may regress current export rejection safeguards, guest noindex/SSR or lightweight delivery.

## Proposed work and dependencies

All entries below require separate authorization. Existing IDs/statuses stay unchanged; unnumbered work packages reserve no new SG ID.

| Proposed bounded work | Existing owner / dependency / boundary |
|---|---|
| Translation Research & Validation | **SG-P31**, existing PLANNED architecture/cost-comparison scope: current provider/lifecycle/privacy review, corpus/evaluation plan, cost/latency evidence where separately authorized, font/RTL risk matrix and D-009 recommendation. This is a proposed research phase, not permission to run benchmarks or implement. |
| UI locale and content-translation implementation plans | Unnumbered proposals after SG-P31 and owner D-009 approval; split UI catalog/selection/SSR fallback from server translation/cache/version/correction/limits and saved-translation PDF reuse. SG-P32 retains its existing management/language-settings scope; agree boundaries before allocating IDs or changing contracts. |
| Photo validation/storage plan, then media implementation | Existing **SG-P30** remains photos/validation/variants/storage. Resolve D-008/D-013 first. Property/section placement must be scoped explicitly; do not silently expand its acceptance. |
| Photographic PDF extension | Separate unnumbered proposal after approved media path and photo/PDF limits, regressions and real-device evidence. Reuse SG-P22, do not reopen its DONE status or make photography a retroactive prerequisite. |
| Blank books; essential individual formats | Existing **SG-P23 / SG-P24**, still PROPOSED / NOT AUTHORIZED. Agree blank identity/selection/writing space and exact essential-format subset/overflow separately; preserve guide QR versus Wi-Fi connection QR distinction. |
| Additional sections | Existing **SG-P33**, still PROPOSED / NOT AUTHORIZED; resolve D-015 activation/hiding/deletion/order/compatibility before implementation. |
| Suggested content; one-tap actions | Two unnumbered bounded proposals. Approve template copy/insertion/overwrite rules, then separately validated URL/phone/action behavior and privacy. No automatic publication or external messaging. |
| Three showcase booklets and homepage examples | Unnumbered proposal coordinated under **SG-P50**'s existing marketing scope after actual photo/PDF/language capabilities, rights review and truthful-claims audit. It is distinct from the three SEO article outlines and does not approve D-018 routes or publication. View Example placement remains optional. |
| Launch acceptance matrix | Unnumbered planning proposal to agree feature dependencies/languages/formats/devices and measurable gates, coordinating existing SG-P40–SG-P43, SG-P50 and SG-P51. No production scope reduction or automatic launch. |

Recommended next task: separately authorize **SG-P31 — Translation Research & Validation**, confined to its existing architecture/cost-comparison research remit. A recommendation is not authorization.

## Reconciliation with earlier specifications

The earlier SG-DOC02 catalog treated blank books, printables and optional tools as candidates rather than launch commitments. The owner now approves their inclusion in the intended polished v1 direction; exact technical scope, essential subset and acceptance gates remain open. Older candidate statuses are preserved as implementation statuses. Earlier sequencing protected a first useful text-only PDF; that milestone is complete and remains valid, while the fuller public-launch ambition now includes photography and multilingual output.

Multilingual UI/content, stored translations/manual correction, fast SSR and host simplicity are existing requirements. Newly explicit details include AI/server-only requests, the section/source-version cache key, correction/invalidation interaction, shared translated PDF output and precise privacy/fallback/abuse constraints. Homepage-before-workspace placement and the three named showcase examples are new specifics; they do not require country themes or validate Japanese font support. No conflict is resolved by selecting a service, changing prices, expanding completed task acceptance or weakening security.
