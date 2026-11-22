# StayGuide Design System — target direction

## Source of truth
The user's two reference mockups, copied to `docs/references/dashboard-and-guest.png` and `docs/references/prints-and-guest.png`, express **direction**, not an already implemented interface. Current v0.2 is an intermediate visual pass, not final parity.

## Visual character
Warm, inviting hospitality; clean premium feel without heaviness. Soft off-white background, dark ink text, restrained violet accent, rounded white cards, subtle shadows, airy spacing, clear icons and friendly property photography. Avoid cold enterprise dashboards, dense forms, neon gradients and excessive decoration.

## Desktop host layout
Dark restrained left sidebar; light main workspace. Horizontal property tabs with thumbnail and add action. Property identity, primary actions (preview/share/QR), 2×4 or responsive card grid, unobtrusive completion summary. Editing in side drawer or modal. Do not make the host navigate through a maze of pages for basic tasks.

## Guest mobile layout
Optional optimized wide hero photo, title and welcome, compact language selector, prominent 2-column section cards. Tap a card to reach real content immediately; content must remain accessible without JS. Clear Wi-Fi copy, contact actions, simple print-friendly typography. No large JS bundle or animation dependency.

## Print layout
QR download; designed welcome QR card; printable A4/A5 book using same content. Avoid duplicate editing flows. Printing must work in grayscale and with margins.

## Accessibility and performance
Contrast, focus rings, 44px-ish tap targets, reduced motion, keyboard support, semantic HTML, responsive at 320px+, compressed images. Use CSS variables for design tokens. SVG icons may be inline/local. No remote UI font dependency.

## Verification
At each UI milestone capture screenshots at mobile (~390px) and desktop (~1440px), plus guest mobile; inspect against mockups. Mark mockups as aspirational; do not claim they are screenshots of the running product.

## SG-UX-01 — owner-approved workspace and future book direction

Authorized 2026-11-13: the host is a compact workspace. Remove the introductory marketing hero and redundant slogans; group property identity, saved state, existing actions and ten editing cards in one surface. Keep the navy sidebar, warm off-white background, restrained violet, local line icons and initials in place of mandatory photos. Desktop saved-content progress sits beside the section grid at about 280px; below desktop it follows the editing controls with a native expandable checklist. Keep status text as well as color and preserve progress semantics. The two owner-supplied dashboard/print mockups guide hierarchy, not additional features, fake navigation, photos or eight-section progress.

The QR workspace distinguishes Guest Guide QR (actual PNG/SVG downloads) and the existing A5 Welcome QR Card (native preview/Print/Save as PDF). Its selected-property miniature is labelled a layout preview; the full-size existing card remains authoritative. Do not embed the card route in a frame or relax its frame-ancestors protection. No Welcome Book action until separate SG-P22 integration approval.

For future SG-P22 integration, the owner agrees to minimal premium design: an elegant cover, readable typography, recognizable section icons, distinct Wi-Fi credentials, clear arrival/departure information, good spacing/hierarchy, attractive A4/A5 layouts and realistic distinct content. Match the host visual identity; keep Unicode stress fixtures separate from presentation examples. This records visual direction only. It does not select production dependencies/fonts, settle privacy/script/device policy, close D-013 or authorize integration; SG-P22-POC-R1 artifacts remain untouched by SG-UX-01.

### SG-UX-01-R1 final refinements — 2026-11-14

Preserve the compact workspace approved in principle. Keep one clearly labelled Add a property button in the top bar; remove the property-strip plus and sidebar slogan. Cards and saved-progress rows use the same decorative marks: Empty = small neutral outlined circle, Started = small solid amber circle, Complete = green checkmark. Retain readable state labels and accessible descriptions; colors/glyphs do not change completion semantics. Keep native scrolling property tabs with edge overflow cues, full selected-tab bounds, full name in accessible label/title and wrapped selected-property heading. Long tab labels may ellipsize within those bounds. No dropdown or navigation redesign.


## SG-P22 — filled book implementation for owner review

Keep the approved host dashboard intact. Filled Welcome Book is an additional output inside QR & Print with native A4/A5 radio controls and one download action. Use the selected saved property name, contextual guest-content privacy guidance and accessible progress/error feedback.

Book pages use embedded Noto Sans, dark ink/muted violet, generous margins, vector section icons and readable page numbering. A5 uses 32pt side margins/22pt cover/10.5pt body; A4 uses 48pt side margins/30pt cover/11pt body. Credential values receive restrained emphasis. Headings and labels stay with following text where possible; long text flows without fixed-height containers. Minimal saved content produces one named cover with canonical QR and no invented sections. Local/temporary guest-link warnings remain visible in the PDF. Actual renders are inspected against `references/prints-and-guest.png` as direction only; final owner visual approval remains pending.


## SG-P22-R1 — editorial PDF refinement (2026-11-14)

Owner-authorized direction: premium boutique hospitality, warm and restrained. Covers now use very pale cream, a discreet masthead, violet rules, a larger property title and a separate lower QR/link area. A4/A5 titles are 38pt/25pt; names over 55 characters receive less introductory whitespace, not cropped text. QR remains canonical vector geometry with its four-module quiet zone. No photos, external artwork, fonts or host decisions.

Interior body remains 11pt A4 / 10.5pt A5, with format-specific line rhythm and existing 48pt/32pt side margins. All ten sections have consistent local line icons and thin dividers; static page furniture is separate from saved content. Short fitting single-line ASCII Wi-Fi values can pair horizontally; long, wide, Greek or multiline values fall back to full-width flow. Short paragraphs (up to 240 characters) stay together; longer paragraphs continue across pages. Compact A4 books with two interior pages can place a late section on their existing short final page to balance the spread, without altering long-book flow. Saved blank lines keep their line height. Headings and sublabels follow explicit saved-value IDs instead of counting their own nested graphics as following content.

Verified fixture results, not fixed page-count guarantees: typical A4 remains 3 pages, typical A5 4→3, Greek 4→3, long A4 4→3 and long A5 6→5. Minimal covers remain one page. The owner subsequently approved this visual direction during the final SG-P22 review and reported independent decoding of all four review PDFs. Actual-interface acceptance, real printing and public-URL phone scanning remain separate. See [R1 evidence](SG_P22_PDF_INTEGRATION.md#sg-p22-r1--editorial-refinement-evidence-2026-11-14).


## Polished launch direction (owner-approved 2026-11-15)

Beautiful defaults require no host design decisions. Preserve the compact clean workplace, progressive optional tools, mobile accessibility and fast SSR guest reading. Optional photos and photographic PDF output are future capabilities, not changes to accepted SG-P22. The public homepage should show actual examples before My Properties: proposed Aegean House (Mediterranean / Coastal), Kyoto Garden Stay (Japanese / Minimal), and The Manhattan Loft (Urban / Contemporary). These are examples, not required themes or country aesthetics. A small View Example in Print & Download is optional. No Japanese PDF claim before validated Unicode/font coverage; no advertised feature before implementation. See [approved direction and gates](LAUNCH_MULTILINGUAL_ALIGNMENT.md).


## SG-PAR-02 — language acceptance direction (2026-11-22)

The owner selects Greek, English, German, French, Italian and Spanish for the initial intended validated Multilingual v1 milestone; future languages remain possible and current validation is pending. Preserve the compact mobile-first workplace and progressive disclosure. Interface language must not silently change authored-content source language; guest selection reads saved translations/original fallback without paid generation. Host/guest catalogs, accessible controls/fallback, text expansion and localized saved-content A4/A5 output need the proposed [acceptance matrix](LAUNCH_ACCEPTANCE_MATRIX.md), not a new visual redesign. Six-language source/target quality, device evidence and PDF language/font/pagination coverage remain unverified; proposed thresholds require owner review. All approved photo/printable/showcase public-v1 capabilities remain required, with exact scope/acceptance open. Historical SG-P22 visual-approval passages above retain their original date; current accepted status belongs in ROADMAP/PROGRESS.
