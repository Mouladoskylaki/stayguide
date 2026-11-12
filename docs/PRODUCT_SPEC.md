# StayGuide Product Spec v1.0 — 2026-11-11

## Mission
Create an exceptionally fast, warm, simple international digital guest guide. Host creates a basic guide in 2–3 minutes; guest opens a stable link or QR with no app/account. Scale to thousands of properties with minimal maintenance and cost.

## Fixed decisions
- Initial target **€1 per property per year**, pending payment/tax viability. No permanent free plan or feature tiers. Volume pricing is provisional: 1→€1; 5→€5; up to 10→€6; up to 50→€30; up to 100→€60.
- Real signup-free trial (~24h proposed), with real public guide and QR; migrate trial data on signup/payment. Expiration and abuse protection remain to design.
- Multilingual host-authored content and UI from first **public release**, stored translations, manual correction; compare provider cost before selection. No translate-on-every-view.
- Guests: no login, ads, per-view fees or mandatory branding; public guides noindex; no entry/keybox/alarm secrets.
- Host: property tabs, add/duplicate/rename/photo, ten editable cards; empty sections omitted; one/two-tap preview/link/QR/print/languages.
- Guest: photo (optional), property name, language switch, prominent Wi-Fi copy, arrival/departure, house rules, appliances, parking, local tips, emergencies, contact, extras.
- Deliver QR SVG/PNG, printable QR card, A4/A5 welcome book PDF from same guide data.
- No chatbot, PMS, booking engine, channel manager, smart locks, native apps, elaborate analytics, complex page builder or premium tiers in MVP.

## Host content cards
1 Welcome/About 2 Wi-Fi 3 Check-in/out 4 House rules 5 Appliances 6 Parking/Transport 7 Local recommendations 8 Emergency 9 Host contact 10 Additional information.

## UX rules
- Make 2–3 minute completion a measured objective, not an assumed result.
- Guest information should be reachable quickly with large tap targets and clear hierarchy.
- Forms: compact, friendly, progressive disclosure; desktop drawer/modal, mobile full-screen panel.
- Print actions are first-class, not hidden extras.

## Success metrics
Trial starts, completed guides, completion time, previews, QR creation, paid conversions, active properties, renewal, and cost per property. 100 active properties = initial validation; 1k/10k/50k+ are ambitions, not forecasts.

## Current status
Local prototype at SG-P21 checkpoint `e32819af76d96996c35d16dd21b2e7b99d72b918`: multi-property host dashboard, accessible section editor/recovery, SSR guest guide, Wi-Fi password copy/fallback, QR workspace with SVG/PNG downloads and one printable A5 welcome card. Browser Print / Save as PDF for that single card is not a Welcome Book PDF generator. No optional-section activation, photos, translations, Wi-Fi connection QR, native guide sharing or editorial `/guides/` routes. Secure accounts, time-limited trial, billing and production safeguards remain missing. Current evidence and limitations belong in [ROADMAP.md](ROADMAP.md) and [PROGRESS.md](PROGRESS.md).

## Approved expansion principles

Owner-approved in SG-DOC02; these principles do not approve implementation of the candidates below:

- More value, not more complexity. A beautiful basic guide in approximately 2–3 minutes remains a measured objective; advanced tools are optional and add no mandatory onboarding steps.
- One shared source of property information supports digital guides, PDFs, QR cards and other printables. Do not create separate content editors for export formats.
- Preserve mobile-first usability, fast loading, accessibility, warm boutique-hospitality aesthetics and lightweight server-rendered public guides.
- Preserve the ten existing sections, IDs, fields and API contracts. Do not rename, remove or duplicate sections without a documented reason and later approval. Empty sections stay hidden in the public guide.
- StayGuide is not a PMS, booking engine, CRM, AI chatbot or Canva-style page builder. Never expose edit credentials, entry/keybox codes or alarm secrets in public output. Existing prototype safeguards are incomplete; follow [SECURITY.md](SECURITY.md).

## Optional content expansion — proposal, not implemented

A proposed **+ Add more information** entry would progressively disclose optional information without lengthening the basic setup. Existing section definitions and editing patterns should be reused across web and print; their current host definition is not yet a shared web/PDF section registry. Prefer extending a logical existing section over duplicate navigation.

| Candidate | Existing coverage / overlap | Proposed treatment to evaluate |
|---|---|---|
| Trash & Recycling | Good to know (`additional`); House rules (`rules`) for obligations | Extend Good to know first; consider a distinct section only if findability justifies it. |
| Departure Checklist | Check-in & check-out (`arrival`, `checkout`); House rules | Extend check-out with an optional checklist rather than a second departure destination. |
| Transportation | Parking & transport (`parking`), arrival instructions | Extend existing transport information. |
| Nearby Essentials | Local favourites (`local_tips`); Emergency information for urgent services | Optional local categories; avoid repeating emergency contacts. |
| Special Amenities | How things work (`appliances`), Good to know | Extend equipment/instructions first. |
| Families & Children | House rules, equipment and Good to know | Optional grouped guidance only if distinct value is established. |
| Pets | House rules and Good to know | Extend rules/practical guidance; avoid contradictory copies. |
| Frequently Asked Questions | Potentially all current sections | Link to canonical answers; do not maintain duplicate facts. |
| About Your Host | Welcome & property (`welcome`), Contact your host (`contact`) | Extend existing introduction/contact presentation. |
| Additional Local Recommendations categories | Local favourites (`local_tips`) | Optional categories within the same logical section before new top-level sections. |

Requirements to design and approve later, not current behavior:

- Activation: additional sections stay hidden until explicitly enabled; propose an accessible chooser with clear scope and no mandatory choices.
- Hiding/removal: distinguish temporarily hiding a section from deleting saved content; decide retention, confirmation, undo/recovery and effects on public/printed output before implementation.
- Empty values: omit enabled-but-empty sections from the public and filled book views; the blank book deliberately prints labels/writing space without values. Define whether property identity is optional on blank exports; a new property still currently requires a name.
- Ordering: preserve current default order; define any optional ordering once for guest and print views, with keyboard-accessible controls only if necessary.
- Export eligibility: define per-format inclusion and optional selection from the same canonical section definitions, with privacy filtering. Do not make all enabled sections mandatory in every export.
- Compatibility: design section identifiers, validation, saved activation state and migration/backward compatibility before proposing schema/API changes. No contract change is authorized here.

## Welcome books and printables — product directions

The filled book remains an existing core requirement. Blank books and additional formats below are candidates, not approved delivery commitments. All share section definitions and saved content where applicable; none gets a separate PDF editor.

| Product | Direction and acceptance needs | Existing coverage / boundary |
|---|---|---|
| Filled Welcome Book | A4/A5; shared saved content; omit empty fields; independent downloadable PDF; verified pagination, typography and Unicode. Include optional photos only when supported and language selection when stored translations exist. | Core SG-P22 foundation, not implemented. Photos/translations must not block the first useful text-based book. |
| Blank Welcome Book | A4/A5; basic default template, optional section selection, adequate handwriting space, labels/empty fields with no saved values. Available even for a new property with no guide content. | Proposed separate task if blank layout/testing cannot fit safely into the shared foundation. No completion prerequisites or separate content editor. |
| QR Welcome Card | Preserve SG-P21 public-guide QR, SVG/PNG downloads and single A5 welcome card. | Implemented; A4 or compact variants are separate candidates, not available options. |
| One-Page Quick Guide | Essential information and public-guide QR; readable one-page filled layout, blank variant where practical. | Proposed; explicit overflow/content-selection policy needed, never shrink text until unreadable. |
| Individual Printables | Wi-Fi card; Wi-Fi connection QR card; House Rules sign; Departure/Check-out checklist; Emergency contacts sheet; Welcome QR sign. | Proposed. Welcome QR sign overlaps the existing card; reuse it. Derive other content from existing sections; connection QR differs from guide QR. |
| Future Printable Kit | Organize available individual exports in one simple workspace, reusing SG-P21. | Deferred; bulk ZIP export is not an MVP requirement. |

SG-P22 should establish the reliable filled A4/A5 foundation first. Filled and blank variants can share section definitions and layout primitives, but blank writing space and selection add distinct pagination/empty-state tests. Recommend a separate blank-book task unless a bounded feasibility review shows both can be delivered without delaying or weakening the filled book. This is a scope recommendation, not authorization to expand SG-P22.

PDF technology remains open under D-013 in [DECISIONS.md](DECISIONS.md). Before selection, investigate Cloudflare Workers compatibility, pagination, Unicode/font coverage and embedding, operating cost and maintainability. Do not assume browser Print / Save as PDF proves a portable independent book-generation solution. [IMPLEMENTATION_TASKS.md](IMPLEMENTATION_TASKS.md) defines acceptance and candidate task boundaries.

## Additional value candidates — not implementation commitments

Priorities below are planning judgments, not measured customer demand. Core denotes an existing product requirement; optional, deferred and research-only capabilities do not become launch gates. No cost, conversion, volume or customer-demand evidence is asserted.

| Capability / user problem | Existing coverage or overlap | Proposed value, priority and class | UX complexity | Technical / operating considerations | Dependencies |
|---|---|---|---|---|---|
| Smart Guest Messages: repeated host instructions | Guide text/contact already exist; no message templates | Editable copy/share templates; early optional | Low if a few templates; no automatic sending/booking integrations | No send service assumed; verify placeholders, escaping and accidental secret sharing | Shared content and approved template scope; native share optional |
| Wi-Fi Connection QR: avoid typing network details | Network/password and password copy exist; guide QR opens a URL | Early optional, separate connection QR | Low if one explicit action/fallback | Safely encode special characters and security type; test scanners; exported credentials require deliberate privacy controls, no logs/caching | Existing Wi-Fi fields; approve security-type/missing-data handling without silently changing contracts |
| One-Tap Guest Actions: reach useful destinations | Native section anchors and Wi-Fi copy only; contact/transport are free text | Call, copy, directions, share and messaging links where valid data exists; early optional | Low only with clear labels and fallbacks | Validate URL schemes/phone/location data; escaping; external messaging/maps may receive data; no provider integration assumed | Reliable relevant data; structured-field changes require approval |
| Native guide sharing: use phone share sheet | Copy guest link already works | Early optional enhancement with copy-link fallback | Low | Progressive enhancement; supported secure context/user gesture; cancellation and unavailable API fallback | Stable selected-property guest URL; no owner token |
| Suggested Content Templates: reduce blank-page effort | Editor hints exist; no insertable suggestions | Early optional editable static suggestions | Low | Never invent rules or publish suggestions automatically; host reviews/replaces text; no AI runtime/service required | Approved copy, insertion and overwrite/discard behavior |
| Photos & Visual Instructions: explain equipment visually | Text instructions; initials placeholders only | Optional established SG-P30 direction, after useful text book | Medium | Optimized variants, captions/alt text, upload validation, limits, lazy loading, storage/egress cost | D-008/D-013 storage/photo decisions and SG-P30; no photo dependency for first PDF |
| Curated Warm / Modern / Coastal themes: visual preference | One approved warm design system | Deferred optional; no page builder | Medium due contrast/print testing | Small token sets only; avoid larger guest payloads and separate layouts | Accessibility evidence and owner-approved theme scope |
| Copy Section Between Properties: reuse host information | Multiple browser-local properties; no section copy | Optional after shared-content foundation; demand unverified | Low–medium: choose source/target and confirm overwrite | Ownership checks, missing fields, privacy, property association and translation staleness; no live synchronization | Shared section identity; account-wide ownership work aligns with SG-P32/SG-P41 |
| Offline Guest Guide: read without connectivity | SSR reading still needs network | Research-only, later | High: install/download, refresh and stale-state explanation | Privacy on shared devices, credential exclusion, caching/expiry/deletion, stale safety information, storage/invalidation | Evidence of user value and approved privacy/cache design; not a new service worker commitment |
| Minimal Usage Statistics: understand usefulness | No analytics; completion counts reflect saved fields only | Research-only, later | Low visible UI; potentially substantial privacy complexity | Minimize collection/retention, avoid invasive tracking, estimate Worker/storage cost and legal obligations | D-008 and SG-P43 privacy review, explicit tracking approval and demonstrated usefulness |
| Simple Section Organization: navigate larger guides | Fixed ten-section order, empty sections hidden | Deferred optional only if expansion causes a real findability problem | Medium for accessible reorder/hide controls | One order across renderers, stable IDs, backward compatibility; no complex builder | Approved optional-section design and usability evidence |

Suggested order: protect the existing core and essential filled book; evaluate bounded Wi-Fi QR/static suggestions/actions/messages; then optional content/useful exports; then optimized photos. Keep themes/offline/analytics/advanced organization later. Existing photo, translation, account, trial and security tasks retain their approved definitions; this proposal does not authorize a phase reorder or defer first-public-release requirements.

## SEO guides direction — proposed research only

Register **SG-SEO-01 — SEO Guides Research & Architecture Proposal**, separately authorized before execution. Proposed audience: vacation-rental owners researching digital guidebooks, welcome books, house manuals, QR guides and printable solutions. A lightweight indexable `/guides/` editorial area must remain distinct from noindex `/g/:id` guest guides. There are currently no `/guides/` routes or completed SEO research.

Research deliverables and coordination with SG-P50 are defined in [IMPLEMENTATION_TASKS.md](IMPLEMENTATION_TASKS.md): verified commercially relevant intent/competitor evidence; three evidence-based guide recommendations with title, URL, outline and unique value; an elegant design-system-aligned landing-page proposal; static/SSR content, metadata/canonicals/sitemap/internal links/appropriate structured data and fast mobile delivery. Do not invent search volumes/difficulty, publish generic mass-produced AI articles or market unavailable features. Future Search Console-assisted research/refresh requires access, approval and human publication review. SG-SEO-01 may proceed independently once authorized; it does not block SG-P22.

## Commercial discipline

Preserve the provisional €1/property/year direction, existing subscription constraints and open volume-pricing questions. Verify payment fees/taxes, hosting/storage, translations, PDF generation, support/maintenance and actual demand/willingness to pay before claiming viability. Future comparisons should include established digital guidebook services and Etsy printable products with dated, verifiable commercial evidence; listing presence, reviews or asking prices alone do not establish sales, traffic or demand. No such research or pricing change is performed by SG-DOC02.
