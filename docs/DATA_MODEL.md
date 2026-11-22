# Data model — current and proposed

## Current
At Phase 3B checkpoint `46ea431817c88f9f5d7e0ed2270f7462bef558fa`, the guide record remains a D1-oriented `guides` row: `id`, `edit_token_hash`, `content_json`, `created_at`, `updated_at`. Inspect `schema.sql` and `src/worker.js` for authoritative implementation. Content is a simple JSON object with property name, welcome, Wi-Fi, check-in/out, rules, appliances, parking, local tips, emergency, contact and additional text.

## Implemented translation foundation

`translation_sources` records property/section source text, explicitly known or unknown source language and monotonic version. `translations` associates property/section/source/target/version/model/prompt/provider mode with saved text, status, generated/manual origin and lease/claim identity. `translation_attempts` records reservations, status, provider mode, reported usage and conservative cost; `translation_policy` supplies bounded global fixture limits. Migrations 0000/0001/0002 and fresh `schema.sql` are authoritative; local JSON and disposable SQLite checks exist, actual D1 verification is pending.

Source-section changes invalidate affected cached versions; current manual corrections use submitted version/translation/text expectations in an atomic update. Stale corrections are not silently reused as current. UI/editor retention policy and production quotas remain open. The six owner-selected milestone languages are Greek, English, German, French, Italian and Spanish; selection is not validation or a runtime allowlist change. See [acceptance criteria and open policies](LAUNCH_ACCEPTANCE_MATRIX.md).

## Future logical entities (NOT permission to migrate yet)
- Host account and secure sessions.
- Property and guide content.
- Account-linked translation allocations, correction-review lifecycle and retention/deletion policies extending the implemented section/version/provenance foundation; no new schema approved here.
- Images with storage references and validated metadata.
- Trial lifecycle/ownership transfer and expiration.
- Billing/entitlements with verified provider event IDs and renewal dates.

## Constraints
Stable public guide URL across edits; no secrets in public content; same content feeds guest HTML and printable PDF; omit empty sections; no translation on guest views. Keep migrations versioned and reversible. Do not implement future tables before a scoped task is approved.
