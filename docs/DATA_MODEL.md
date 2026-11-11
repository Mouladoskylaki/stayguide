# Data model — current and proposed

## Current
D1 `guides` row: `id`, `edit_token_hash`, `content_json`, `created_at`, `updated_at`. Inspect `schema.sql` and `src/worker.js` for authoritative implementation. Content is a simple JSON object with property name, welcome, Wi-Fi, check-in/out, rules, appliances, parking, local tips, emergency, contact and additional text.

## Future logical entities (NOT permission to migrate yet)
- Host account and secure sessions.
- Property and guide content.
- Translations by property, locale, field and source revision; manual override state.
- Images with storage references and validated metadata.
- Trial lifecycle/ownership transfer and expiration.
- Billing/entitlements with verified provider event IDs and renewal dates.

## Constraints
Stable public guide URL across edits; no secrets in public content; same content feeds guest HTML and printable PDF; omit empty sections; no translation on guest views. Keep migrations versioned and reversible. Do not implement future tables before a scoped task is approved.
