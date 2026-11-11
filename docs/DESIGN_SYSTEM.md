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
