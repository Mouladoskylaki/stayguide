# SG-SEO-01 — SEO guides research and architecture proposal

Research/access date: **2026-11-12** (Europe/Athens). Status: research/documentation complete for owner review; no implementation or publication approved. Product and launch authority remain in [PRODUCT_SPEC.md](PRODUCT_SPEC.md), [DECISIONS.md](DECISIONS.md), [SECURITY.md](SECURITY.md) and [IMPLEMENTATION_TASKS.md](IMPLEMENTATION_TASKS.md).

## Executive recommendation

**CONDITIONAL GO** for a deliberately small, three-guide experiment once separately authorized. There is credible qualitative evidence of a commercial category: active guidebook offers, public user reviews and printable shops with platform-reported sales. This does **not** establish query volumes, attainable rankings, conversion or StayGuide demand. Generic templates and free guidebooks already exist, so publishing interchangeable advice is a poor use of time.

Ranked by assessed commercial usefulness and truthful product fit, not measured traffic:

1. **QR Code Guest Guide: Set Up, Print and Test a Welcome Card** — strongest match to implemented SG-P21 workflows; a concrete job close to choosing a tool.
2. **Vacation Rental Welcome Book Template: A Practical Host Checklist** — tangible composition help with original examples; substantial visible competition and a current book-PDF product gap.
3. **Digital Guest Guidebook vs PDF vs Printed House Manual: A Host’s Decision Guide** — buyer-oriented choice aid; difficult established competition, but useful for hosts deciding whether software is necessary.

Finish useful core product work rather than diverting the project into a content operation. Planning may continue independently of SG-P22. Do not launch the local host prototype to capture visitors, promise an available Welcome Book PDF, advertise the provisional €1 price as a purchasable plan or imply production security. A separately approved public editorial-only release could be evaluated without opening host/API routes; it would still need explicit deployment approval and its own safety review. No release is authorized here.

## Baseline and research method

- Independently inspected clean `main` at **`79fb51e1602d1b374c5205bd19b104017b622cc3`**, matching the locally recorded `origin/main`; no remote fetch this task. Git history confirms the SG-DOC02 checkpoint and preceding SG-P21 work.
- Read the project contract/specifications/roadmap/decisions/progress/security/testing. Inspected `src/worker.js`, `node/server.mjs`, `wrangler.jsonc`, host/guest/marketing markup and existing static-asset structure. No server on port 8787 or private guide data was used.
- Used live web search and direct page retrieval. Query families included digital guest guidebooks, vacation rental welcome books/templates/information books, Airbnb house manuals/check-in instructions, QR guest guides, Wi-Fi cards and guest communication templates. Added format-comparison and print-testing angles where observed products overlapped.
- Search outputs are discovery samples, **not** a controlled Google rank audit: no fixed search geography, device, personalization or position tracking. “Competing” means a relevant observed page, not a verified top-three ranking. English research predominates; StyQR adds a French commercial example, not evidence of equivalent English query demand.
- **Measured/observed:** repository facts, retrieved text, prices/offers as displayed and platform counters. **Self-reported:** vendor capabilities and reviewer experiences. **Inference:** audience, intent, priority, differentiation, difficulty and acquisition potential. **Unavailable:** first-party Search Console, query volumes, keyword difficulty, traffic, conversion, revenue, paid-customer counts and listing-level transaction totals. No numerical SEO-tool estimates were used.
- No accounts, trials, downloads requiring signup, purchases or software installations. Products were not hands-on tested. Cached/extracted pages may omit interactive elements; search crawl dates are not article publication dates. Price displays can vary by currency, promotion, tax and locale; the observations below are not checkout quotes.

## Evidence register

Every external URL below was opened or explicitly attempted on **2026-11-12**. IDs elsewhere refer to these dated sources; claims are limited to what was retrievable. Evidence ratings assess the specific claim, not the trustworthiness of an entire business. No source establishes StayGuide's market demand.

| ID | Source URL | Access date | Observation and evidence quality |
|---|---|---|---|
| E01 | [Touch Stay pricing](https://touchstay.com/pricing) | 2026-11-12 | Retrieved live pricing calculator and trial entry. **Strong evidence of an active offer**, not completed purchases. Interactive total was not retrievable; no paid amount recorded. |
| E02 | [Touch Stay user reviews](https://www.trustpilot.com/review/touchstay.com) | 2026-11-12 | Platform displayed 22 reviews, with recent positive and negative experiences. **Moderate interaction signal**, self-selected and unverified individually; not paid-customer count or representative satisfaction. |
| E03 | [Hostfully guidebook plans](https://www.hostfully.com/pricing/digital-guidebooks/) | 2026-11-12 | One free guidebook; Pro/Enterprise offers and signup/quote links. **Strong offer evidence**; no Pro dollar amount in retrieved page, no purchase/revenue proof. |
| E04 | [Hostfully product](https://www.hostfully.com/digital-guidebooks/) | 2026-11-12 | Vendor describes link/PDF sharing, branding, recommendations and integration-led positioning. **Primary product claims**, not independently tested functionality or quantified outcomes. |
| E05 | [StyQR pricing](https://styqr.fr/tarifs) | 2026-11-12 | Vendor displays €49 excluding tax/year for a rental booklet and optional printable posters; active trial path. **Strong offer evidence**, not a checkout or sales audit. Do not treat vendor booklet-creation counts as paid users. |
| E06 | [StyQR user reviews](https://fr.trustpilot.com/review/styqr.fr) | 2026-11-12 | Platform displayed 66 reviews including accommodation-host accounts. **Moderate interaction evidence**; opinions/selection bias, not verified subscription totals. |
| E07 | [RoomForTwo shop](https://www.etsy.com/shop/RoomForTwo) | 2026-11-12 | Retrieved three relevant digital listings, displayed 1,334 shop sales and 67 reviews. Visible welcome-book asks: $14 and $28. **Strong platform shop-activity signal**, not specific-listing sales, revenue or willingness to pay for SaaS. |
| E08 | [EscapeTemplates shop](https://www.etsy.com/shop/EscapeTemplates) | 2026-11-12 | Retrieved welcome-book/sign/checklist offerings; displayed 72 shop sales and 8 reviews. **Shop-level commercial signal**, not per-product transactions or proof that all sales concern welcome books. |
| E09 | [RoomForTwo listing](https://www.etsy.com/listing/1111003611/airbnb-welcome-book-template-vacation) | 2026-11-12 | Direct listing inaccessible; shop page links to it and shows associated book reviews. **Partial verification only**; no independently verified listing-level sales. |
| E10 | [EscapeTemplates listing](https://www.etsy.com/listing/1485846869/airbnb-cabin-welcome-book-template-with) | 2026-11-12 | Direct listing inaccessible; shop listing card observed. **Partial verification**, no item-level sales or full product-quality audit. |
| E11 | [Airbnb house-manual guidance](https://www.airbnb.com/resources/hosting-homes/a/write-a-house-manual-to-share-info-about-your-space-22) | 2026-11-12 | Retrieved platform guidance on concise property instructions and Wi-Fi. **Strong evidence of a platform-supported host job**, not query demand. Article states updated 2021; current UI details need fresh checking before publication. |
| E12 | [Touch Stay welcome-book article](https://touchstay.com/blog/vacation-rental-welcome-book) | 2026-11-12 | Retrieved content outline, copyable template, format comparison and product CTA. **Direct competitor content evidence**; a substantial existing answer, not proof it attracts traffic. |
| E13 | [Touch Stay QR help](https://help.touchstay.com/en/articles/13715551-how-to-create-a-qr-code-for-your-guide) | 2026-11-12 | Retrieved PNG-download/display guidance and distinctions between export resolutions. **Primary workflow evidence**; independent print/scan performance not tested. |
| E14 | [Nowistay welcome-book resource](https://www.nowistay.com/airbnb-welcome-book-template-free) | 2026-11-12 | Retrieved ungated PDF/Word download links and a content/preview explanation. **Competitive utility evidence**, not a file-quality or sales audit; downloads not exercised. |
| E15 | [HostGreeter check-in template](https://hostgreeter.com/airbnb-check-in-instructions-template) | 2026-11-12 | Retrieved substantial template and QR/trial CTA. **Direct content/funnel evidence**, not customer/traffic proof; its access-code advice must not be copied into StayGuide public content. |
| E16 | [Hotelier Tools messaging article](https://hotelier.tools/blog/booking-com-guest-messages) | 2026-11-12 | Retrieved Booking.com-focused tutorial/template and product funnel; links to official help. **Commercial content evidence only**; platform instructions remain unverified independently. |
| E17 | [Booking.com template help](https://partner.booking.com/en-us/help/reservations/contact-extranet/setting-templates-automatic-replies-and-message-notifications) | 2026-11-12 | Direct retrieval returned **403**. Official navigation steps, attachment/link limits and automation claims are **unverified**; do not publish them as confirmed facts. |
| E18 | [Wi-Fi sign result](https://qrivel.com/vacation-rental-wifi-qr-sign/) | 2026-11-12 | Search surfaced a rental Wi-Fi sign tool; direct retrieval failed. **Discovery snippet only**, insufficient to validate product/commercial activity. |
| E19 | [Google noindex guidance](https://developers.google.com/search/docs/crawling-indexing/block-indexing) | 2026-11-12 | **Authoritative technical source**: indexing control requires readable directives; robots.txt blocking can prevent discovery of noindex. Not a confidentiality mechanism. |
| E20 | [Google canonicals](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls) | 2026-11-12 | **Authoritative technical source** for consistent absolute canonical URLs and duplicate handling. Canonical selection is not guaranteed. |
| E21 | [Google sitemap guidance](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap) | 2026-11-12 | **Authoritative technical source** for absolute preferred URLs and sitemap maintenance; submission is not indexing assurance. |
| E22 | [Google Article markup](https://developers.google.com/search/docs/appearance/structured-data/article) | 2026-11-12 | **Authoritative technical source** with JSON-LD/Microdata examples and testing guidance; markup does not promise rich results. |
| E23 | [Search Console performance report](https://support.google.com/webmasters/answer/7576553?hl=en) | 2026-11-12 | **Authoritative product documentation** for queries/pages, clicks, impressions, CTR and position. No StayGuide property/data access obtained. |
| E24 | [Google people-first guidance](https://developers.google.com/search/docs/fundamentals/creating-helpful-content) | 2026-11-12 | **Authoritative quality guidance** on original effort, accuracy and truthful authorship; no ranking guarantee. |
| E25 | [Cloudflare HTML handling](https://developers.cloudflare.com/workers/static-assets/routing/advanced/html-handling/) | 2026-11-12 | **Authoritative runtime documentation**: default directory-index HTML gets trailing-slash handling. Actual StayGuide deployment not tested. |
| E26 | [Cloudflare Worker routing](https://developers.cloudflare.com/workers/static-assets/routing/worker-script/) | 2026-11-12 | **Authoritative runtime documentation** on asset-first versus selective Worker-first routing; deployed edge/header rules remain unverified. |

Additional attempted URLs excluded from positive evidence: `https://www.hostfully.com/blog/vacation-rental-welcome-book/` and `https://makeitquick.co/kits/airbnb` were inaccessible on 2026-11-12. No claims rely on their unseen bodies. Search discovery was useful even where direct access failed; failures are not evidence a business/product is absent.

## Search-intent and acquisition assessment

Qualitative assessment only. Proximity labels describe likely reader intent, not observed conversions. Established platforms/vendors are strong incumbents by category relevance and content coverage; no domain-authority score was measured.

| Cluster / representative query family | Intent, audience and purchase proximity | Demand proxy / competing results | Quality gap and truthful StayGuide fit | Organic potential assessment |
|---|---|---|---|---|
| Digital guest guidebooks / digital guidebook for vacation rentals | Compare tools; independent hosts and small managers; relatively close to a software choice | E01/E03/E04/E05 active offers and E02/E06 interactions | Vendor-led answers already substantial. An impartial fit/limitations matrix is more useful than claiming to be best. Current digital/QR core fits; integrations do not. | Commercially attractive but crowded; low confidence in near-term acquisition. No traffic evidence. |
| Vacation rental welcome books | Learn what to include; new Airbnb/Booking.com/direct-booking hosts; medium proximity | E12 detailed vendor guide; E14 utility-first free resource; E07 shop activity | Needs worked content, maintenance/privacy decisions, not a longer section list. Ten saved sections fit; book export remains SG-P22. | Plausible long-tail opportunity; substantial competition, PDF expectation gap. |
| Airbnb house manuals | Create/edit a manual or find Airbnb's own setting; host/support intent; mixed proximity | E11 platform guidance, E12/E15 vendor alternatives | Airbnb already answers platform setup. Explain channel-neutral information reuse without pretending to replace private channel messaging. | Broad head term difficult; pursue problem-specific subtopics inside the selected guides. |
| QR code guest guides | Setup/export/display/test; hosts ready to share; relatively close to use | E13 actual vendor instructions; E05 print offer | Distinguish URL QR from Wi-Fi connection QR, exact destination and print-testing/privacy. Current SVG/PNG/card workflows fit best. | Best product-aligned experiment; query size unknown and generic QR tools compete. |
| Vacation rental information books / holiday-let guest folders | Compile practical house details; small accommodation businesses; medium proximity | E11/E12/E14 cover equivalent house-information needs | Treat synonyms as one composition topic; do not create near-duplicate regional pages. | Plausible English long tails, unmeasured; UK/local terminology needs local SERP validation. |
| Guest welcome book templates | Want an immediate reusable asset; owners shopping/free-seeking; medium–high proximity to a template, not necessarily SaaS | E07/E08 priced listings and shop counters; E14 free PDF/Word offer | Free editing downloads are real competition. Provide an original usable in-page skeleton/checklist; do not bait a nonexistent PDF download. | Credible commercial category signal; software conversion uncertain. |
| Printable house manuals | Want a file or physical binder; owners avoiding software; high proximity to a printable | E07/E08 shops, E14 ungated files | Clear filled/blank and paper/mobile distinctions; readable print examples after supported. SG-P21 is a card, not a manual PDF. | Worth exploring after SG-P22; weak fit for today's book-download promise. |
| Airbnb check-in instructions | Setup, communication or guest help; ambiguous host/guest intent; low–medium SaaS proximity | E15 full template and trial funnel; E16 messaging tutorial; E17 blocked | A concise public/private information split could add value; exclude access secrets from public guides. StayGuide has text instructions, no automated messages. | Do not spend one of the first three articles on a platform tutorial we cannot fully verify. |
| Vacation rental Wi-Fi cards | Make a sign/connect QR; property hosts plus generic sign seekers; high utility intent, uncertain recurring-software fit | E07 sign listing and E08 sign category; E18 snippet only | Honest guide-QR versus connection-QR explanation; no present connection-QR/card generator. | Later narrow utility candidate; free tools and current feature gap lower initial priority. |
| Guest communication templates | Copy arrival/departure messages; host/managers wanting time savings; medium proximity, automation expectations | E15/E16 copyable content with product CTAs | Small human-editable messages can link to a guide; no auto-sending/PMS claims. Booking.com mechanics unverified (E17). | Possible assisted acquisition later; message automation is outside StayGuide's scope. |
| Expanded angle: QR print/export troubleshooting | Fix blur, wrong destination or expired preview link; tool-selection/active-use intent | E13 export-quality distinction; E05 printable offer | Original scan/export evidence and a stable-link checklist map directly to SG-P21. | Stronger differentiation within guide 1, not proof of a larger query market. |

Booking.com managers and B&B/small accommodation operators plausibly share these information tasks (E05/E16), but platform-specific demand and relative segment sizes are unknown. Do not extrapolate Airbnb-oriented evidence to a measured Booking.com audience.

## Competitor and printable validation

Each material observation below refers to the dated URL/evidence-quality record above. No competitor account was created and no paid transaction was independently audited.

| Competitor | Commercial qualification and limits | Observed acquisition/content pattern | Opportunity and constraint for StayGuide |
|---|---|---|---|
| Touch Stay | Active calculator/trial E01 plus public interaction evidence E02. Paid transaction totals unknown. | Substantial welcome-book article E12 and practical QR help E13 connect education to product. | Compete through original concise examples/testing, not a claim that QR guidance is absent. Avoid its public-template access-secret pattern. |
| Hostfully | Free and paid-plan offers E03, supported by detailed product page E04; vendor-hosted testimonials are not independent sales proof. | Broad guidebook/PMS funnel, lower-friction free alternative. | “Cheaper than paid products” alone is insufficient against a free plan. StayGuide intentionally omits the wider operations stack. |
| StyQR | Rental price and optional posters E05, independent-platform interactions E06; revenue/subscriber totals unverified. | Digital booklet plus tangible print products. | Confirms QR/print adjacency already exists; cannot market the combination as unique. French evidence is not English keyword volume. |
| RoomForTwo | E07 distinguishes active listings, public reviews (including book-associated reviews) and shop-level sales. E09 listing body inaccessible; exact item sales unknown. | Visual editable Canva manuals and a separate welcome sign. | Demonstrate readable content without design work; do not claim listing reviews establish exact sales or SaaS conversion. |
| EscapeTemplates | E08 shows active cards/listings, reviews and shop sales across multiple product types; E10 item unavailable. | Theme-specific book/sign/checklist family. | Curated print aesthetics have competition; a Canva-style builder is outside scope. Shop sales cannot be allocated to a particular template. |
| Nowistay / HostGreeter | E14/E15 establish useful competing resources and product funnels only; commercial success not verified. | Immediate template utility before CTA. | These qualify as content competitors, not validated market leaders. A thin checklist or gated “free PDF” with no real file is not competitive. |

Etsy evidence ladder: listing observed ≠ purchase; reviews ≠ exact transaction counts; shop-level sales ≠ specific-listing sales; asking price ≠ realized revenue. **No independently verifiable specific-listing sales total was found.** Public platform indicators support category activity, not a sales forecast. Reviews are observations, not representative customer research.

## Exactly three initial guides

All titles, slugs, outlines, example concepts and CTAs below are proposals, not published articles. Suggested URLs use trailing slashes consistently with the static-directory recommendation. The three guides answer different jobs: implement a QR, compose information, choose a format. Do not create separate synonym pages for “house manual”, “information book” and “welcome book”.

### 1. QR Code Guest Guide: Set Up, Print and Test a Welcome Card

- **Intent/audience:** tactical setup for an independent rental host or small manager who has information ready and needs a reliable sharing/display method. Commercial rank 1: shortest path to existing product value.
- **URL:** `/guides/qr-code-guest-guide/`.
- **Main phrase:** QR code guest guide. **Secondary phrases:** vacation rental QR guide, QR welcome card, print guest guide QR, PNG versus SVG QR.
- **Evidence/competition:** E13 is a directly inspected practical competitor; E05 sells adjacent poster functionality; E01/E03 show existing guidebook choices. These support the job/category, not its search volume. Strongest directly inspected rivals for this answer: [Touch Stay QR instructions](https://help.touchstay.com/en/articles/13715551-how-to-create-a-qr-code-for-your-guide) and [StyQR offer](https://styqr.fr/tarifs), accessed 2026-11-12; primary claims/offer evidence, no rank measurement.
- **Differentiation:** reproduce a fictional property flow from saved content to exact URL to exported image to paper test. Show failures as well as success: local-only/tunnel destination, low-resolution scaling and stale printed content. Include a concise privacy audit. Do not imply competitors lack these capabilities.
- **Original value to create later:** annotated synthetic workspace/export images, URL-versus-Wi-Fi QR comparison diagram, a reproducible decode/phone-scan log and print checklist; keep owner tokens/private guide URLs out. Existing OpenCV evidence is owner-reported; publish only evidence whose artifact/permission can be rechecked. Physical scan/print results must be newly verified before claiming them.
- **Internal links:** composition checklist (guide 2) before setup; format decision (guide 3) if the reader needs a complete book. Product CTA: see a clearly labelled synthetic example; create a guide only once an approved public host flow exists. No live prototype/tunnel CTA now.
- **Available today:** digital guide, same guest-link path after content edits, SVG/PNG exports, A5 card and browser print, local/temporary-URL warnings. Stable path is not a guarantee of domain/service permanence. **Future/proposed only:** Wi-Fi auto-connection QR, A4/compact card choices, Welcome Book PDF and statistics. Automatic message sending is outside approved scope, not a promised future feature.
- **Difficulty/risk/confidence:** medium assessed competition for the narrow job, no numerical KD. Free QR tools compete; public-link privacy, URL longevity and physical scan evidence matter. Medium confidence in usefulness, low confidence in attainable organic traffic/conversion.

Outline (headings only; not article copy):

- H1: QR Code Guest Guide: Set Up, Print and Test a Welcome Card
  - H2: Choose what the QR opens
    - H3: Guest-guide URL versus Wi-Fi connection payload
    - H3: Keep private access and editing details out
  - H2: Prepare a short mobile guest guide
    - H3: Include only useful, saved information
    - H3: Check the exact guest destination
  - H2: Export and display the QR
    - H3: Choose SVG or a suitable PNG without distorting it
    - H3: Keep contrast, quiet space and a readable fallback URL
  - H2: Test before making permanent cards
    - H3: Test a reachable HTTPS link away from the host device
    - H3: Record device, print and decoded-destination results
  - H2: Troubleshoot the most useful failure cases
    - H3: Local/tunnel link expired or unreachable
    - H3: Blurry export or hard-to-scan placement
  - H2: Decide whether a card or a full book is needed

### 2. Vacation Rental Welcome Book Template: A Practical Host Checklist

- **Intent/audience:** hosts creating their first manual or replacing a large binder, across Airbnb, Booking.com and direct bookings. Commercial rank 2: template utility attracts a relevant job, but readers may prefer free paper files over software.
- **URL:** `/guides/vacation-rental-welcome-book-template/`.
- **Main phrase:** vacation rental welcome book template. **Secondary phrases:** guest welcome book checklist, Airbnb house manual template, holiday-let information book, printable house manual.
- **Evidence/competition:** E07/E08 show marketplace activity; E14 provides immediate free-file utility; E11 establishes the information task. Strongest inspected competing pages: [Touch Stay welcome-book guide](https://touchstay.com/blog/vacation-rental-welcome-book), [Nowistay template](https://www.nowistay.com/airbnb-welcome-book-template-free), [RoomForTwo shop](https://www.etsy.com/shop/RoomForTwo), all accessed 2026-11-12; primary content/platform indicators, no ranking claims. These already offer useful material; differentiation is required.
- **Differentiation:** a short original fill-in structure mapped to the actual ten sections, with a worked fictional example, an intentionally empty section and a maintenance/privacy checklist. Explicitly separate guest information from reservation-specific access secrets. Do not create a duplicate content editor or imply all sections are compulsory.
- **Original value to create later:** author-owned in-page copyable skeleton, concise filled-versus-empty comparison, before/after instruction editing and a source-of-truth worksheet. Demonstrate what changes on web versus an already distributed print/PDF copy. No downloadable book promised until it exists; do not claim “free PDF” in metadata for an HTML checklist.
- **Internal links:** guide 1 for QR display; guide 3 for choosing formats. CTA: see the same synthetic information in an approved digital example; book-export CTA only after SG-P22 is released and verified.
- **Available today:** saving all ten core sections, omission of empty guest sections, responsive guest reading and guide QR/card. **Future-only:** independent filled/blank A4/A5 books, photo instructions, translations, optional-section activation and other individual printables. Article's blank in-page text example is editorial content, not a blank-book generator.
- **Difficulty/risk/confidence:** high assessed competition and high immediate-file expectations. Do not launch a template-title page with only marketing prose. Medium confidence in category relevance, low confidence in software conversion; scope must actually deliver usable text before a CTA.

Outline:

- H1: Vacation Rental Welcome Book Template: A Practical Host Checklist
  - H2: Start with the information guests need
    - H3: Core essentials versus optional detail
    - H3: Public information versus private arrival messages
  - H2: Use the ten-section fill-in structure
    - H3: Welcome, Wi-Fi and check-in/check-out
    - H3: Rules, appliances and parking/transport
    - H3: Local favourites, emergencies, contact and extras
  - H2: See a short fictional property example
    - H3: Turn vague instructions into specific, reviewed steps
    - H3: Leave an irrelevant section empty
  - H2: Choose a web, print or PDF companion
    - H3: Keep one saved source and check exported copies
    - H3: Be clear about available formats
  - H2: Review before sharing
    - H3: Verify factual details and remove access secrets
    - H3: Check mobile reading and any actual print output
  - H2: Keep the guide current between stays

### 3. Digital Guest Guidebook vs PDF vs Printed House Manual: A Host’s Decision Guide

- **Intent/audience:** software/format evaluation by owners with one or a few properties, or small B&B managers deciding whether their existing binder is enough. Commercial rank 3: near a tool choice, but harder to acquire and credible comparison work is costly.
- **URL:** `/guides/digital-guidebook-vs-pdf-house-manual/`.
- **Main phrase:** digital guidebook vs PDF house manual. **Secondary phrases:** digital guest guidebook, printed versus digital welcome book, vacation rental guidebook options, Airbnb house manual.
- **Evidence/competition:** E12 already compares formats; E03/E04 provide a free/paid guidebook alternative, E14 an ungated paper-file option, E07/E08 printable offers. Strongest inspected competing answers: [Touch Stay format discussion](https://touchstay.com/blog/vacation-rental-welcome-book) and [Hostfully product/FAQ](https://www.hostfully.com/digital-guidebooks/), accessed 2026-11-12; vendor perspectives, not independent effectiveness trials. Presence of exact long-tail query demand remains unconfirmed.
- **Differentiation:** an honest “keep the binder if it fits” decision matrix, separating internet reachability, update propagation, printable snapshot staleness, private information and recurring content maintenance. Compare formats without manufacturing a vendor league table or claiming hands-on testing of competitors.
- **Original value to create later:** fictional one-property and small-multi-property scenarios; a documented change-once/re-export exercise using StayGuide and ordinary paper/PDF examples; accessible comparison table and maintenance checklist. Disclose test conditions and what has not been tested.
- **Internal links:** guide 2 for what to write, guide 1 for sharing a chosen digital guide. CTA: view an approved synthetic example, then use an available product flow only when released. A competitor's free plan and DIY options should remain visible alternatives.
- **Available today:** digital reading without guest JS, QR/card outputs and saved-content edits in the local prototype. **Future/proposed only:** offline mode, translations, printable book and account-wide management. Booking integrations are outside approved scope; no production service guarantees are available or promised. Wi-Fi copy is not offline support; browser Save as PDF is not SG-P22.
- **Difficulty/risk/confidence:** high assessed competition and commercial bias risk. No verified ranking/demand data for the proposed phrase; medium confidence in decision usefulness, low confidence in acquisition. Recheck offers before publication, do not promise rankings or savings.

Outline:

- H1: Digital Guest Guidebook vs PDF vs Printed House Manual: A Host’s Decision Guide
  - H2: Decide which job matters most
    - H3: Before arrival, in the property and during an outage
    - H3: Information to keep out of public formats
  - H2: Compare the three formats fairly
    - H3: Phone readability and connectivity
    - H3: Updating the source versus refreshing distributed copies
    - H3: Setup, ongoing work and real costs to verify
  - H2: Apply the decision matrix to two host scenarios
    - H3: One property with stable instructions
    - H3: Several properties with different details
  - H2: Combine formats without duplicating editing
    - H3: One maintained source, clearly dated exports
    - H3: A QR card as a companion, not a complete manual
  - H2: Check available tools without assuming feature parity
    - H3: Free, paid and DIY options
    - H3: Prototype features versus released functionality
  - H2: Choose the smallest useful next step

## Proposed landing-page experience

For `/guides/`, use a warm off-white marketing surface, restrained violet accents and white cards; no host sidebar. A short page title/introduction should identify the audience as hosts, not guests browsing accommodation. Show exactly three real article links with problem/outcome summaries; no empty future categories, search box, tag taxonomy, “trending” counters or fake testimonials. Give the first card the QR practical job, the next the content template, the third the decision aid.

Use semantic header/nav/main/article/footer, a skip link, clear current navigation and breadcrumb links. Cards form a modest desktop grid and a readable single column at 320px/390px; visible focus, comfortable touch targets and no horizontal overflow. Article layout: bounded reading width, anchored contents, genuine byline/review dates and optional local illustrations with alt text/dimensions. Do not invent reading times or expert credentials. No remote fonts, icon library or JS-dependent reading. Match the approved design direction without claiming a screenshot or pixel equivalence; no UI was built in this task.

Add a Guides link from relevant marketing header/footer, contextual cross-links among the three articles and a truthful product/example link. Never put actual `/g/:id` property URLs into editorial navigation, canonicals, schema or public sitemaps. Examples must be synthetic and deliberately reviewed for public use, not selected from owner data.

## Technical SEO architecture proposal

### Inspected behavior and hazards

| Existing surface | Repository evidence | Consequence for later work |
|---|---|---|
| Guest guide and card | `src/worker.js` `html()` adds `X-Robots-Tag: noindex, nofollow`; guest/card HTML also has noindex meta. QR SVG has a noindex response header. | Preserve all three exclusions, including errors. Never remove noindex globally to make articles indexable. |
| API / owner editing | `/api/guides` and exact 16-hex-ID routes; edit authorization stays in the current Worker. | Editorial rendering must not read records or carry owner tokens. Existing production-auth gaps are not solved by SEO. |
| Static marketing / host | `public/index.html` has title/description but no canonical or Guides link; `public/app.html` has noindex meta. Worker GET fallback returns `env.ASSETS.fetch()` directly. | The shared guest `html()` helper does not automatically wrap static assets. Marketing/indexing policy needs its own explicit public-release review. |
| Cloudflare asset routing | `wrangler.jsonc` binds `public/`, Worker-first only for `/api/*` and `/g/*`; D1 ID remains a placeholder. | Static editorial files can remain asset-first (E26); no need to put articles through the guest noindex helper or database. Deployed behavior has not been exercised. |
| Local static adapter | `node/server.mjs` maps `/` only, then reads exact file paths; no folder-index resolution or XML MIME entry. | A future local `/guides/` directory URL currently cannot be served as planned. Add narrow editorial path/index and sitemap MIME handling with tests; no adapter change now. |
| Robots/canonicals/sitemap | No tracked `robots.txt`, sitemap, `_headers` or `_redirects` found; no canonical in current marketing page. | Explicitly design publication policy and test edge overrides later; absence of a file is not proof of deployed indexing. Unknown slugs must 404, not return homepage/SPA HTML. |

### Smallest maintainable option

Prefer **four hand-authored static HTML pages**: `public/guides/index.html` plus an `index.html` beneath each of the three proposed slug directories. Use one local editorial stylesheet with the marketing design language and no article runtime JavaScript. Hand-editing four pages is manageable; a framework, CMS, database, content API, new build pipeline and remote scripts are unnecessary. This is a recommendation under D-018, not an approved architecture decision.

Keep Cloudflare static-asset serving and existing `/api/*` / `/g/*` Worker-first paths. Default directory HTML behavior is documented in E25; verify with the project's Wrangler version before relying on redirects. Add a small allowlisted local routing equivalent and correct sitemap MIME handling in a later approved task. Preserve traversal protections; handle GET/HEAD deliberately. Choose a single trailing-slash policy for all four URLs; redirect alternate slash/explicit-index forms consistently where appropriate, verify redirects do not loop and retain queries. Unknown article URLs must produce real 404s. Do not add a catch-all or SPA fallback.

If static delivery cannot satisfy necessary publication headers, investigate a narrow editorial response path separately. Never reuse `html()` unchanged (it prevents indexing), and never globally relax its guest directives. No runtime SSR is needed for these four pages; static HTML is already readable/indexable without JS when access and directives permit it. No deployment/domain or edge configuration is selected here.

### Metadata, indexing and structured data

- On the approved canonical HTTPS origin (D-012 still open), give each published page its own title, honest description, one H1 and absolute self-canonical in the HTML head. The proposed guide titles above are editorial working titles; tune title tags for clarity rather than an invented character-based ranking rule. Keep URL, links, canonical and sitemap consistent (E20/E21).
- `/guides/` and released article URLs should have no blocking robots meta/HTTP directives or authentication on their approved public origin. `index,follow` is optional explicit documentation of intent, not a way to override a noindex header. Review asset/edge/header behavior rather than assuming the static path is sufficient.
- Keep `/g/:id`, card and QR responses noindex, and the host noindex. Never include guests, API routes, owner editor, tokens, temporary tunnel origins, query variants or nonexistent articles in the sitemap. Noindex is not privacy/access control (E19). A blanket robots.txt disallow could prevent bots seeing guest noindex; do not add one as a substitute or claim URL secrecy. Keep protected previews protected and out of public indexing.
- Proposed small static XML sitemap: only approved public marketing/editorial canonical URLs, correct XML MIME and genuine modification dates when maintained. A robots.txt Sitemap declaration may point to it once the origin is approved. Do not submit it now. Crawling/indexing/ranking are not guaranteed (E21).
- Appropriate optional markup: `Article`/`BlogPosting` for actual articles, with truthful author/headline/dates and a real representative image only if one exists; `BreadcrumbList` for real breadcrumbs, `CollectionPage` for the landing page if useful. No fabricated review/rating, business identity, FAQ rich-result promise or vacation-rental listing markup on editorial advice. Google documents Article and both JSON-LD/Microdata (E22). Prefer static Microdata if it keeps CSP unchanged; if JSON-LD is chosen later, validate extraction/CSP rather than allowing unsafe inline scripts globally. Structured data must match visible content and be validated; rich results are not guaranteed.
- Preserve accessible server-delivered reading, optimized local images only where useful, reserved media dimensions, system fonts, reduced motion and native anchor navigation. Measure real transfer/LCP/CLS/TTFB on authorized staging later; no invented performance scores or indexing claims.

## Editorial quality and future AI workflow

**Research → Evidence collection → Outline → Human review → Draft → Fact check → Publish approval → Monitor → Update.** No stage runs automatically in this proposal.

1. Record the query/job, retrieval date, source URL, source type, exact observed fact and uncertainty. Keep a small claim-to-source ledger; do not equate a vendor claim or snippet with verified performance.
2. Review the outline and differentiation against existing coverage. Require an original artifact or worked example and a clear question it answers. Human owner approval before full drafting; the headings in this document are not production articles.
3. AI may help organize evidence, find unanswered questions and propose wording. A person checks every material claim, URL, screenshot and product capability. Do not copy competitor templates, invent quotes/host stories, fabricate bylines or generate regional synonym pages at scale (E24).
4. Produce original synthetic example information, accessible illustrations and reproducible tests. Never paste private guides, edit tokens, real access codes, guest data or host contact details into article content/research tools. Guest Wi-Fi values in examples must be synthetic; genuine guest-facing Wi-Fi may appear only when intentionally shared by the host under existing product rules.
5. Fact-check platform UI/links, prices and availability again before publication; blocked Booking.com/Etsy evidence requires human verification, not guesswork. Mark proposed/future StayGuide capabilities explicitly. Obtain human publication and deployment approval separately; a reviewed Git change alone is not publishing permission.
6. Maintain visible authorship and dates that reflect actual work, a revision note for material corrections and a concise update ledger. Recheck volatile commercial/platform facts on updates and before new recommendations; do not freshen dates without substantive review.
7. **Future Search Console use (E23), not integrated/available:** after authorized ownership verification/access, inspect page/query impressions, clicks, CTR and average position by country/device/time period. Use impressions without useful clicks to investigate title/intent mismatch; avoid claiming CTR proves user satisfaction or conversion. An absent/hidden query or limited sample is not zero demand; average position is not a fixed rank. Compare like periods and note seasonality and indexing delays. No data was retrieved here.
8. Editorial decisions should combine that evidence with consented host feedback and whether people complete useful product actions. Search Console alone does not measure product activation or revenue. Any attribution/usage tracking requires a separate privacy/cost approval; no analytics dependency added now. AI may summarize authorized exports, but humans approve changes and publication.

## Business, effort and risk assessment

- **Worthwhile as a capped experiment, not the immediate growth engine.** Active offers and printable activity indicate a job people use tools for; no evidence establishes StayGuide's organic acquisition economics. Three articles let us test distinct useful jobs without a large taxonomy or ongoing content treadmill.
- **Opportunity cost:** the host prototype lacks production accounts/trial/payment safeguards, translations and book PDF. Sending readers to an unavailable or unsafe product wastes attention and creates support obligations. SG-P22 and existing launch gates retain their priority; this research does not authorize either product work or SG-P50.
- **Build effort (unmeasured judgment):** low relative application complexity for four static pages/shared CSS, but route parity, metadata, privacy boundaries, accessibility and real 404s require deliberate testing. Editorial effort is likely the larger continuing commitment: original examples, physical QR/print checks, sourcing, review and maintenance. No hour estimate, freelancer price or launch date is asserted.
- **Competition:** incumbent product sites, Airbnb's own resources, useful free downloads and Etsy alternatives compete for overlapping intent. Vendor content already answers much of the basics. A new domain should not assume authority or first-page rankings; competitor content presence is not a measured traffic benchmark.
- **Conversion uncertainty:** a free-template reader may never want recurring software; a QR user may only need a generator; a property manager may need integrations StayGuide deliberately excludes. Choose honest fit and retain DIY/free alternatives rather than chase all traffic.
- **Costs:** static articles avoid a CMS/AI runtime/PDF-on-view service, but this is a design assessment, not a zero-cost claim. Verify hosting, bandwidth/media, maintenance time, support, any later tracking and product service costs. Preserve provisional €1/property/year pricing; don't estimate ROI without acquisition, activation, cost and willingness-to-pay data.
- **Go conditions:** owner approves audience/geography, three jobs and original-artifact plan; names a reviewer/maintenance owner; resolves canonical origin/public release posture; approves an available CTA destination and budget/time cap; separately approves implementation and eventual publication. If these cannot be met, defer publication rather than fill the site with generic content.

## Suggested later scope and validation plan

A narrowly scoped **SG-P50 implementation slice, only after separate authorization**, could add the four-page static shell/shared editorial styles, one consistent URL policy, local/Cloudflare routing parity, per-page metadata, sitemap/robots policy, marketing links and privacy-boundary tests. Article drafting/fact-check and publication are separately approved stages; do not ship empty indexable placeholders or the current outlines as articles. A synthetic local preview is sufficient for shell review; creating public resources is not required for the first review.

Acceptance to propose with that prompt:

- Actual HTML content readable without JS, responsive at 1440/390/320, keyboard/skip/anchor/focus checks and no horizontal overflow. Only real destinations; article URLs need substantive reviewed content before indexing.
- On isolated fixtures, editorial pages return intended status/content type with no noindex conflict; host/guest/card/QR noindex and API authorization remain unchanged. Test success, unknown slug, slash/index aliases, canonical origin/query variants, HEAD and sitemap MIME; never touch SG-SHARE01 to test this.
- Sitemap/links contain only approved public routes; no property records or credentials. Validate markup and schema, honest bylines/dates/claims, security headers without a global relaxation, no new dependency or remote asset unless separately approved.
- Run unit/browser checks appropriate to the eventual implementation and inspect actual HTTP responses on authorized local/staging environments. Search Console URL Inspection/sitemap submission only after explicit access/publication approval. Allow for discovery delay; do not promise an indexing timetable.
- Before/after publication, owner sets an effort cap and an evidence-review point rather than a fabricated traffic target. Review search visibility, relevance of real host feedback and approved product-action evidence. Continue only if usefulness and maintenance cost justify it; narrow or stop the experiment if they do not.

Open questions requiring owner review or later evidence:

1. Which initial market/language/geography and property size? English discovery is not validated demand in a specific country or for Booking.com managers.
2. Can each shortlisted guide supply original useful artifacts without delaying the core product? Who maintains and fact-checks them?
3. What is the approved canonical domain (D-012), and should any editorial-only release be isolated from the prototype? No deployment approval exists.
4. What truthful product/demo CTA will be available? Is SG-P22 ready before any downloadable-book offer? No waitlist/contact collection feature is approved.
5. Can the owner independently inspect blocked Etsy/Booking.com pages if those exact claims are needed? Until then, retain the evidence limits.
6. Are later Search Console access and privacy-safe product measurement worth their effort? Neither integration nor tracking is authorized.
7. Which routing/header/structured-data choices survive actual local/Workers testing? D-018 stays open; this proposal does not fix an architecture decision.

SG-SEO-01 ends with this proposal and research evidence. No pages, article drafts, routes, indexes, PDFs, product features, paid services or tracking were implemented; no commit, push or deployment. SG-P22 and SG-P50 remain unstarted.
