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
