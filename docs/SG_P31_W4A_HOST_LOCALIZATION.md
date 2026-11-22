# SG-P31-W4A — six-language host interface

Baseline: main at `d15b1807c9d779989318eb2720b0c709d7742fba`. Scope is host-interface localization only. Wording is provisional pending independent linguistic review; no qualified linguistic certification is claimed. Guest language controls, AI Translate controls and multilingual PDF output are not implemented by this task.

## Architecture and state separation

- `public/host-i18n.js` imports six frozen static ES-module catalogs from `public/locales/`: el-GR, en-GB, de-DE, fr-FR, it-IT and es-ES. English messages are stable, readable catalog IDs, with identical keys and interpolation placeholders in every locale. No framework, dependency, remote font/service, AI request or asynchronous translation step is added. Catalogs load with the host application; switching does not fetch them again.
- Separate local preference `stayguide-host-locale` stores the exact selected tag. A valid saved tag wins; otherwise the first supported browser language (exact or primary-language match, such as de-AT→de-DE) wins; otherwise en-GB. Corrupt/unsupported values and storage read failures safely fall back. First visit does not write a preference automatically. Explicit selection writes only this key. Storage write failure leaves the selected language active for this visit and announces that it was not saved.
- Native, labelled selects in the dashboard header, editor and QR dialog use language autonyms, synchronize their values, update document lang/title and announce changes. Modal selectors remain reachable while the background is inert. Tab wrapping includes selects; native arrow-key behavior remains available. A closed modal is never opened by a locale change.
- Declarative text/attribute bindings update existing nodes in place. Interpolation uses textContent or escaped markup; authored content is never parsed as catalog HTML. Existing input/textarea values, selection, focus, node identity, dirty comparison, conflict flags, in-flight operations and disabled controls remain intact. Locale changes do not call render(), persist guide state, reload a guide, close a dialog, refresh revision expectations or initiate network operations.
- Shared `public/guide-content.js`, QR helpers, PDF generator/assets, guest rendering, translation service/store/provider, schemas and migrations remain unchanged. Host field labels/placeholders are translated at presentation time; source prose, names, Wi-Fi details, tokens, source-language metadata and guide revisions retain their original meaning and bytes. Host-only PDF validation messages map known generator messages into catalogs; unexpected errors receive a generic localized failure, not raw internals. No host locale is passed to PDF generation.

## Coverage and explicit exclusions

The complete 161-key inventory below covers navigation, property/create controls, section headings/hints/labels/placeholders, progress, loading/saving/conflict/error messages, recovery/confirm/prompt bodies, editor/discard controls, QR/download/print workspace controls, privacy warnings, accessibility labels and live statuses. English fallback markup remains readable if JavaScript is unavailable; the interactive dashboard still requires JavaScript.

Intentionally outside translated catalog content:

| String/data | Reason |
| --- | --- |
| StayGuide / StayGuide. | Product name, including existing printed branding. |
| Ελληνικά / English / Deutsch / Français / Italiano / Español | Fixed language autonyms, each option has its own lang attribute. |
| A4 / A5, PNG / SVG / PDF / QR, Unicode U+ codes | Standard format/technical identifiers, preserved within translated instructions. |
| Welcome.; MAKE YOURSELF AT HOME AT; Scan. Settle in. Enjoy. | Existing card-preview artwork represents the unchanged English printable card, not a newly localized output. |
| Property names, authored prose, saved Wi-Fi values, destination URLs, download filenames | User content or canonical identity, never interface-translated. |
| stayguide-demo-recovery-, properties/active and other storage-key names | Exact recovery instructions must preserve technical identifiers. |
| Guest pages, standalone printable card, generated book headings/labels/content, marketing page | Separate guest/output/marketing scopes; unchanged. |
| Browser-native OK/Cancel and validation/print/download UI | Supplied by browser/OS language settings; application confirm/prompt/alert bodies are localized. |
| Internal exception categories and server error strings | Backend contract unchanged; displayed host failures use localized safe messages. |

## Verification and limitations

Run `node tests/host-i18n.test.js`, `node tests/host-state.test.js`, full offline `npm test`, and `node tests/host-state.browser.mjs` through the existing isolated offline QA guard and loopback-only browser wrapper. The browser runner now serves only the six explicitly allowlisted locale module paths in addition to its prior asset paths. This is test infrastructure, not a server/API expansion. Existing modal focus assertions now recognize the new first select.

Unit verification covers catalog/key/placeholder parity, HTML/field/warning inventory, saved/browser/corrupt/blocked preference behavior, safe interpolation, in-place repaint, actual host draft/conflict/in-flight-save protection, and no extra property requests/writes on locale change. Browser verification covers all six languages, reload/preference negotiation, 1440/1280/768/390/320 expansion, modal controls/keyboard/drafts, QR identity, zero generation or application fetches on switching, original-language saves, and identical saved-content PDF definitions across locales. Existing full host/guest/QR/A4-A5 regression checks remain required. Artifacts are synthetic and ignored under `.local/qa/sg-p31-w4a-20261122/`.

Independent bilingual review, assistive-technology testing and real iOS/Android/Safari/Firefox localization coverage remain pending. Native control chrome follows browser/OS settings. Preference changes are local to the current page; there is no automatic cross-tab locale synchronization. Catalog load delivery/cache/performance in a real production deployment is not certified here. This task does not validate six-language property translations, guest catalogs or translated PDFs and does not authorize W4B, paid generation, deployment or a Git checkpoint.

Verified results: seven catalog cases, 62 actual host cases, full npm test thirteen test files/zero failures, focused six-language Chrome and final complete Chrome suite all pass. New expansion fixes allow full translated text to wrap; no clipping or forced small fonts were introduced. Final evidence is in `.local/qa/sg-p31-w4a-20261122/browser-final` and associated logs. Human linguistic/assistive-technology/device approval remains pending.

## Complete English message-ID inventory

Each row is present in all six dedicated locale files. Empty transient status is intentionally represented by an empty binding rather than a catalog entry.

| # | Message ID |
| --- | --- |
| 1 | Your guides · StayGuide |
| 2 | Skip to dashboard |
| 3 | StayGuide workspace |
| 4 | StayGuide dashboard |
| 5 | Main navigation |
| 6 | My properties |
| 7 | Home |
| 8 | Working prototype |
| 9 | ＋ Add a property |
| 10 | Your saved property list needs attention. |
| 11 | We could not read this browser’s saved property list. It has not been erased. Retry after restoring your browser data, or keep a recovery copy and start fresh. |
| 12 | Retry saved data |
| 13 | Back up and start fresh |
| 14 | Recovery copies stay in this browser’s local storage under stayguide-demo-recovery-. To restore one with technical help, copy its properties and active values back to stayguide-demo-properties and stayguide-demo-active, then retry. These copies contain private editing access: do not share them or clear browser data. |
| 15 | Let's make your first guide. |
| 16 | No signup, no complicated setup. Just a lovely place to start. |
| 17 | What's your property called? |
| 18 | e.g. The Little Olive House |
| 19 | Create my guide |
| 20 | Create my guide ↗ |
| 21 | You can change everything later. |
| 22 | Your properties |
| 23 | Your place |
| 24 | All changes saved |
| 25 | Guest guide actions |
| 26 | Preview guest guide (opens in a new tab) |
| 27 | Preview guide |
| 28 | Copy guest link |
| 29 | QR & print |
| 30 | Guide sections |
| 31 | Guide progress |
| 32 | Section checklist |
| 33 | Saved section status |
| 34 | How is this counted? |
| 35 | Complete means every field in that section has saved text. Started means only some fields have text; empty means none do. Welcome needs a name and a welcome message. Sections are optional: this counts filled fields, not guest readiness. |
| 36 | Prototype note: editing access is saved in this browser. Keep this browser's data to continue editing. Accounts, 24-hour expiry, content translation controls and billing are not available yet. |
| 37 | EDIT SECTION |
| 38 | Close editor |
| 39 | Saved changes appear on your existing guest link. |
| 40 | Cancel |
| 41 | Save changes |
| 42 | Discard your changes? |
| 43 | Your changes haven’t been saved. Keep editing, or discard them and return to your guide. |
| 44 | Keep editing |
| 45 | Discard changes |
| 46 | GUEST MATERIALS |
| 47 | Close QR and print workspace |
| 48 | Guest Guide QR |
| 49 | One scan opens your guest guide. |
| 50 | QR code for your guest guide |
| 51 | EXACT DESTINATION |
| 52 | Download QR |
| 53 | Download SVG |
| 54 | PNG image for printing · SVG for resizing |
| 55 | Layout preview · open below for the full-size card |
| 56 | Printable Welcome QR Card |
| 57 | A5 portrait · one welcome card with your guest-guide QR. |
| 58 | Preview and print welcome card (opens in a new tab) |
| 59 | Preview & print card |
| 60 | Open the preview, then use your browser’s Print / Save as PDF. |
| 61 | A good place for a warm welcome |
| 62 | Place the card by the entrance or bedside, with good light and room to scan. Test the exact link on a guest’s phone before making permanent cards. |
| 63 | Filled Welcome Book |
| 64 | Your saved guest information, beautifully laid out for printing. |
| 65 | Includes saved guest content and guest Wi-Fi details. Review your guide first: never include door, keybox or alarm codes, private reservation information or owner credentials. Automated checks cannot identify every secret. PDFs stay on this device unless you share them. |
| 66 | Paper size |
| 67 | Download PDF |
| 68 | This is a working prototype. A permanent card needs a stable public guest URL. |
| 69 | Interface language |
| 70 | Interface language changed. |
| 71 | Language changed for this visit. Your browser could not save the preference. |
| 72 | Keep a recovery copy in this browser and start a new property list? Existing guides will not be deleted from the server. |
| 73 | Browser storage could not be updated. No recovery copy has been removed. Allow browser storage or free some space, then try again. |
| 74 | Loading sections… |
| 75 | Loading… |
| 76 | Loading guide… |
| 77 | This guide is unavailable. |
| 78 | Please reload to try again. Your saved property list has not been removed. |
| 79 | Property {number} |
| 80 | Empty |
| 81 | Started |
| 82 | Complete |
| 83 | Add information |
| 84 | Edit section |
| 85 | {section}: {state}. {action} |
| 86 | Add |
| 87 | Edit |
| 88 | {complete} of {total} sections complete |
| 89 | {started} started · {empty} empty |
| 90 | {count} editable sections |
| 91 | Saving… |
| 92 | Saving your changes. Please wait. |
| 93 | Please enter a property name. |
| 94 | This guide was updated in another tab or device. Your text is still here and has not been saved. Copy your changes somewhere safe, then close this editor and reload the guide to review the latest version. We will not overwrite it. |
| 95 | Your changes couldn’t be saved. They are still here. Check your connection and choose Save changes to try again. |
| 96 | For {name} |
| 97 | QR code for {name} guest guide |
| 98 | The QR preview couldn’t load. Close and reopen this workspace to retry, or open the welcome card. |
| 99 | Preparing… |
| 100 | Preparing your PNG image… |
| 101 | Your PNG download is ready. If it didn’t save, try again or use SVG. |
| 102 | Your QR image couldn’t be downloaded. Try Download QR again, or choose Download SVG. |
| 103 | Preparing your saved Welcome Book… |
| 104 | Your {size} PDF download is ready. If it did not save, choose Download PDF again. |
| 105 | Your book could not be prepared. Check your connection and choose Download PDF to retry. No saved content was changed. |
| 106 | Saved guest content contains owner editing credentials. Remove them before exporting. |
| 107 | Creating… |
| 108 | Your guide could not be created. Check your connection and try again. |
| 109 | Copied ✓ |
| 110 | Copy your guest link: |
| 111 | The guest guide destination could not be verified. Reopen QR & print. |
| 112 | Save a property name before exporting. |
| 113 | {field} contains characters unsupported by the book font ({codes}). Edit that saved field and use supported text. Nothing was removed or replaced. |
| 114 | {field} may contain private access or authentication information. Remove it from the saved guest content before exporting; share private arrival instructions separately. |
| 115 | This destination could not be verified. Do not use it for permanent printed cards. |
| 116 | Local preview link: this QR may only work on this device or local network. It is unsuitable for permanent printed cards. Use a stable public HTTPS address before printing for guests. |
| 117 | This link does not use HTTPS. Use a stable public HTTPS address before making permanent printed cards. |
| 118 | Welcome & property |
| 119 | Make guests feel at home. |
| 120 | Property name |
| 121 | Welcome message |
| 122 | A few kind words to welcome your guests. |
| 123 | Wi-Fi |
| 124 | The first thing every guest asks. |
| 125 | Network name |
| 126 | e.g. OliveHouse_Guest |
| 127 | Wi-Fi password |
| 128 | Your network password |
| 129 | Check-in & check-out |
| 130 | Arrival and departure made easy. |
| 131 | Check-in |
| 132 | Check-out |
| 133 | e.g. From 3:00 PM. The entrance is on the garden side. |
| 134 | e.g. Before 11:00 AM. Please leave keys on the table. |
| 135 | House rules |
| 136 | A few thoughtful ground rules. |
| 137 | e.g. No smoking indoors. Quiet hours after 10 PM. |
| 138 | How things work |
| 139 | Appliances and useful instructions. |
| 140 | Appliances & equipment |
| 141 | e.g. How to use the air conditioning, coffee machine and hot water. |
| 142 | Parking & transport |
| 143 | Help them find their way. |
| 144 | Parking & getting around |
| 145 | e.g. Free parking in front of the property. |
| 146 | Local favourites |
| 147 | Your best neighbourhood tips. |
| 148 | Places to explore |
| 149 | e.g. Our favourite bakery is two streets away. |
| 150 | Emergency information |
| 151 | Useful numbers and information. |
| 152 | e.g. Emergency services: 112. Nearest hospital: ... |
| 153 | Contact your host |
| 154 | An easy way to get in touch. |
| 155 | Contact details |
| 156 | e.g. Call or message on ... |
| 157 | Good to know |
| 158 | Everything else worth sharing. |
| 159 | Additional information |
| 160 | e.g. Bin collection is on Tuesday. |
| 161 | Temporary preview link: this address can stop working when sharing ends. Do not use this QR for permanent printed cards. Use a stable public HTTPS address first. |
