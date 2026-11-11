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
Local v0.2 prototype only: create/edit, multiple guides per browser, SSR guest guide, QR SVG and printable HTML card, tests. Missing authentication, time-limited trial, translations, image upload, PDF book, billing and production safeguards.
