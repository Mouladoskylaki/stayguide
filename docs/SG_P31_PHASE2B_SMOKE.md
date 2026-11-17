# SG-P31 Phase 2B — controlled OpenAI smoke test

2026-11-17. **Overall result: SUCCESS for the bounded engineering smoke; human quality review pending.** Baseline clean main at `de598b2750e018a409ce38587db73fc53b4abc7a`. Owner's Phase 2B authorization and preflight supplement specify OpenAI only, gpt-6-luna, Standard Global, at most eight free input-token counts and eight translations, $0.10 cumulative usage, no retries, concurrency one. No production integration, additional funding, provider/model substitution, commit, push or deployment is authorized.

## Isolated implementation and preservation

Created [scripts/openai-translation-smoke.mjs](../scripts/openai-translation-smoke.mjs) and [tests/openai-translation-smoke.test.js](../tests/openai-translation-smoke.test.js), plus this report. Only directly relevant task/progress/roadmap documentation is updated. Phase 2A script/tests/proposal/corpus and historical research/preparation remain byte-identical to HEAD. Frozen corpus SHA-256 remains `d08695f229067cda36a8d1113b97cb243b7914c51e1655c8822622702d9d78fd`. Production application/guest/PDF/API/schema/authentication, dependencies, decisions, completed statuses, SG-P22, SG-SHARE01 and prior review evidence remain unchanged.

The Node built-in runner defaults to dry-run, with no credential read or network request. Only an exact `--live` flag can enter its live branch; arbitrary model/provider/URL/corpus arguments are rejected. Production imports neither benchmark. A fixed eight-job subset of the validated Phase 2A manifest covers H02→Greek, H03→German, H04→Greek, H05→German, H07→Greek, H08→German, H21 Greek→English and H23 Greek→German. No additional authoring directions are validated or advertised.

For each planned translation, one immutable token-bearing request (model/instructions/input/reasoning/tools) is sent to counting and reused unchanged for generation. Counts over 800 skip that job without changing prompts or expanding the sample. Counting failures/ambiguous results stop the run. Generation sets `max_output_tokens=800`, reasoning effort none, Standard `service_tier=default`, `store=false`, no tools/streaming and disabled truncation. Fixed HTTPS host/paths, no redirect following, no SDK/retries, sequential dispatch and 20-second total request timeouts restrict network behavior. Actual account/model access would be tested only by the first counted, budget-reserved authorized translation; no exploratory generation or model-list request is included.

Before network attempts, a fixed ignored journal is exclusively created; a second live invocation cannot claim it again. Each count/reservation is durably recorded before dispatch. Missing/inconsistent usage, changed model/tier, refusal/incomplete output, network/authentication/access/billing errors or uncertain spend stop without retry. Uncertain generation spend keeps its worst-case reservation. Safe metadata and allowlisted parsed results replace raw exceptions/HTTP bodies/authentication headers. Secret echoes are rejected before output persistence. Credential loading is confined to the live process, from the existing non-symlink 0600 `.env.local`, without modification. Runtime logging/instrumentation/TLS-keylogging flags are rejected before credential access.

## Official preflight facts and budget

Sources rechecked 2026-11-17:

- [Token-counting guide](https://developers.openai.com/api/docs/guides/token-counting.md) and [count endpoint](https://developers.openai.com/api/reference/resources/responses/subresources/input_tokens/methods/count.md): `POST /v1/responses/input_tokens` counts the actual model input, including framing. Counting is never replaced by character estimates.
- [OpenAI token help](https://help.openai.com/en/articles/4936856-understanding-and-counting-tokens) explicitly states that input-token counting is free and does not consume normal inference quota. Count calls and generation calls have separate counters; no count charge is assumed or fabricated as generation usage.
- [Model](https://developers.openai.com/api/docs/models/gpt-6-luna.md) and [pricing](https://developers.openai.com/api/docs/pricing.md): Standard short-context input $0.10/M, cached $0.01/M, cache writes $0.125/M (30m) or $0.25/M (12h), output $0.50/M. [Responses output limit](https://developers.openai.com/api/reference/resources/responses/methods/create.md) includes non-visible reasoning tokens. No tools, Fast/Flex/Batch or long-context pricing is used.
- Reserve integer nanodollars per translation using counted input × maximum documented input-category rate ($0.25/M) plus 800 output tokens × $0.50/M, then a conservative 10% regional contingency. At the maximum 800/800, this is **$0.00066/request, $0.00528 for eight**, below $0.10. Global Standard remains the requested endpoint; the contingency neither enables nor claims EU processing. Reported generation usage would drive separately labeled standard and conservative estimates, with missing cache-write breakdown priced conservatively. These estimates are not independently verified invoice charges.
- [Data controls](https://developers.openai.com/api/docs/guides/your-data.md): no API training by default unless opted in; abuse monitoring retention may still apply. `store=false` is not Zero Data Retention. Only frozen synthetic hospitality prose/protected strings would be sent; no production data, passwords or owner metadata.

## Tests and dry-run

**26 focused offline tests PASS**, covering approved subset, immutability/count-generation parity, arguments, separate request limits, budget rejection, authoritative count schema, input/output/reasoning/cache usage accounting, over-limit skips, auth/access/model/billing/timeout stops, ambiguous usage, secret-safe error/output handling, no-call/no-credential dry-run and durable one-shot refusal. Mocks, not providers, supply these responses.

**Full npm test PASS: seven files, zero failures**, including unchanged Phase 2A and existing application/PDF regressions. Dry-run emits eight planned jobs, zero network calls/credential reads and the $0.00528 maximum reservation. Corpus/Phase 2A preservation, 0600 ignored/untracked credential protection, no prior live journal, runtime instrumentation absence and whitespace checks passed before the live command was submitted. No dependency was installed. Existing browser/PDF evidence is preserved; this isolated runner requires no UI changes.

## Actual execution outcome

The first escalation submission was rejected before process creation because automatic approval review could not verify attachment-based authorization. Zero requests occurred at that stage, and no bypass/retry was attempted. The owner then supplied exact authorization inline: one execution, existing credential, gpt-6-luna Standard Global only, at most eight counting calls/eight generations, zero retries, concurrency one, $0.10 cap. After confirming no prior live claim/results and preserved preflight conditions, the authorized command was submitted again; approval succeeded and **one actual live execution completed**. This was not a repeated API experiment.

| Observation | Actual result |
|---|---|
| Input-token-count calls / successes | 8 / 8; documented free, non-generating endpoint |
| Generation calls / successes / failures | 8 / 8 / 0; retries 0 |
| Model and actual returned processing | gpt-6-luna / Standard (`default`), Global host |
| Directions tested | English→Greek (3), English→German (3), Greek→English (1), Greek→German (1) |
| Authoritative input counts, in sample order | 119, 99, 108, 114, 123, 109, 125, 119 |
| Reported generation input/output/reasoning tokens | 916 / 402 / 0; cached/write tokens 0 |
| Estimated Standard usage cost | **$0.0002926 USD** |
| Conservative estimate including 10% contingency | **$0.00032186 USD** |
| Cumulative reserved worst-case generation cost | $0.0037719 USD, below $0.10 cap |
| Observed counting / generation latency totals | 6.174434 s / 12.550096 s |
| Total observed API latency | **18.724530 s**, sum of request wall times; not pure model compute |
| Generation latency range / median | 1.084380–2.656042 s / 1.287888 s, eight observations only |
| Structural failures / missing protected strings | 0 / 0 |
| Possible unreported spend / error category | false / none |
| Human translation quality | **PENDING HUMAN REVIEW**; no scores assigned |
| One-shot execution record | Created and retained; another claim is rejected |

Reported tokens and wall times are real observations. Dollar figures are calculations from documented prices, not independently verified invoice charges. The regional contingency does not mean EU processing was enabled or a regional charge was actually incurred. No account/model-list probes, other providers, extra translation attempts or funding changes occurred.

### Per-request accounting

| Case / target | Count / reported input | Reported output | Generation latency (s) | Estimated Standard USD | Protected strings |
|---|---:|---:|---:|---:|---|
| H02 / el-GR | 119 / 119 | 67 | 2.656042 | $0.0000454 | retained |
| H03 / de-DE | 99 / 99 | 35 | 1.213739 | $0.0000274 | retained |
| H04 / el-GR | 108 / 108 | 80 | 1.800207 | $0.0000508 | retained |
| H05 / de-DE | 114 / 114 | 43 | 1.084380 | $0.0000329 | retained |
| H07 / el-GR | 123 / 123 | 69 | 1.237847 | $0.0000468 | retained |
| H08 / de-DE | 109 / 109 | 39 | 1.272232 | $0.0000304 | retained |
| H21 / en-GB | 125 / 125 | 33 | 1.982106 | $0.0000290 | retained |
| H23 / de-DE | 119 / 119 | 36 | 1.303544 | $0.0000299 | retained |

Every generation's reported input count exactly matched the preceding authoritative count, every input/output remained ≤800 tokens and all source lengths stayed ≤1,200 code points. The durable journal contains eight count reservations, eight generation reservations and eight completions, with the final recorded state matching results.json. No live re-execution was used to verify the guard.

### Original / target / actual translation

| Case / direction | Original | OpenAI translation |
|---|---|---|
| H02 en-GB → el-GR | Check-in is after 15:30 on 04 November 2027. Check-out is no later than 10:00 on 07 November 2027. Early arrival is not guaranteed. | Το check-in πραγματοποιείται μετά τις 15:30 στις 04 Νοεμβρίου 2027. Το check-out πρέπει να γίνει το αργότερο έως τις 10:00 στις 07 Νοεμβρίου 2027. Η πρόωρη άφιξη δεν είναι εγγυημένη. |
| H03 en-GB → de-DE | Do not smoke indoors, including beside an open window. Smoking is permitted only in the marked outdoor area. | Rauchen Sie nicht in Innenräumen, auch nicht neben einem offenen Fenster. Rauchen ist nur im gekennzeichneten Außenbereich gestattet. |
| H04 en-GB → el-GR | Never use the portable heater to dry towels. If its cable is damaged, stop using it and contact the host; do not repair it yourself. | Μη χρησιμοποιείτε ποτέ το φορητό θερμαντικό σώμα για να στεγνώνετε πετσέτες. Αν το καλώδιό του έχει υποστεί ζημιά, σταματήστε να το χρησιμοποιείτε και επικοινωνήστε με τον οικοδεσπότη· μην επιχειρήσετε να το επισκευάσετε μόνοι σας. |
| H05 en-GB → de-DE | Use bay P-07, not P-70. The height limit is 1.85 m. A second vehicle needs separate permission. | Nutzen Sie Stellplatz P-07, nicht P-70. Die Höhenbegrenzung beträgt 1,85 m. Für ein zweites Fahrzeug ist eine separate Genehmigung erforderlich. |
| H07 en-GB → el-GR | Fictional address: 18 Lantern Lane, Example Harbour. Turn left after the blue kiosk, then walk 250 m. The entrance is opposite, not inside, the café. | Φανταστική διεύθυνση: 18 Lantern Lane, Example Harbour. Στρίψτε αριστερά μετά το μπλε περίπτερο και, στη συνέχεια, περπατήστε 250 μ. Η είσοδος βρίσκεται απέναντι, όχι μέσα, από το καφέ. |
| H08 en-GB → de-DE | Press START once. Do not press RESET. Wait 90 seconds before opening the lid; the display may still show HOT. | Drücken Sie einmal START. Drücken Sie nicht RESET. Warten Sie 90 Sekunden, bevor Sie den Deckel öffnen; auf dem Display kann noch HOT angezeigt werden. |
| H21 el-GR → en-GB | Η άφιξη επιτρέπεται μετά τις 16:00, όχι πριν. Η αναχώρηση πρέπει να ολοκληρωθεί έως τις 10:30. Μην ανταλλάξετε τις δύο ώρες. | Arrival is permitted after 16:00, not before. Departure must be completed by 10:30. Do not swap the two times. |
| H23 el-GR → de-DE | Μην πατήσετε το κουμπί DRAIN όσο λειτουργεί η συσκευή. Περιμένετε 3 λεπτά αφού σβήσει η ένδειξη WAIT. | Drücken Sie die Taste DRAIN nicht, während das Gerät in Betrieb ist. Warten Sie 3 Minuten, nachdem die Anzeige WAIT erloschen ist. |

Offline review observation (2026-11-17): H07's final Greek spatial-contrast sentence is grammatically awkward: “Η είσοδος βρίσκεται απέναντι, όχι μέσα, από το καφέ.” Clearer wording would be “Η είσοδος βρίσκεται απέναντι από το καφέ, όχι μέσα σε αυτό.” This is a review suggestion, not a replacement for the actual recorded response above or in local evidence. One observed issue in eight samples does not establish a systematic prompting weakness; idiomatic phrasing and clause reordering warrant evaluation only in a separately authorized future experiment. Qualified bilingual human review remains **PENDING**. Historical outputs, hashes, usage, costs and latencies remain unchanged.

The table reproduces actual generated text for review, without semantic grading. Protected-string checks cannot certify negation, safety instructions, numbers, addresses or naturalness. Qualified bilingual reviewers must assess these against the original semantic assertions; no production or comprehensive language-direction claim follows.

Ignored local artifacts under `.local/qa/sg-p31-phase2b/`: `preflight-dry-run.json`, durable `one-shot.jsonl`, `results.json`, `summary.json`, and `comparison.md`. Earlier `approval-block.json` and `comparison-not-executed.md` are retained as explicitly historical pre-execution evidence, not the final outcome. Offline guard tests use separate subdirectories. No credential value, key-derived hash, authorization header or raw provider error is stored in reports.

## Next boundary and limitations

The authorized engineering smoke is complete. The one-shot record remains in place; **no more live calls or retries are authorized**. Owner and qualified reviewers should inspect the comparison and original semantic checks before considering any separately scoped next experiment. No production-provider selection or readiness is established. Only four sampled directions and eight short synthetic cases were tested, not full multilingual authoring, CJK/RTL/PDF output, load, tail reliability or independent billing reconciliation. No automatic next benchmark phase, additional funding, implementation integration, commit, push or deployment follows. SG-P31 remains IN PROGRESS and existing completed statuses/decisions remain unchanged. STOP.


## Offline corrective maintenance (2026-11-17)

Following independent review, HTTP transport now has one settlement/cleanup path: non-200 responses are destroyed with their requests, response error/abort/close events are handled, and the total-request timer is cleared exactly once. Error/timeout races retain the first sanitized category; no retry or endpoint/model change was added. Tests exercise the actual transport through mocked HTTPS requests and a mocked clock, including 401/429/500, stalled rejection, late errors, timeout before headers/during a body, successful JSON, oversized/malformed bodies and premature closure. No real connection or credential is used.

Journal candidates are resolved before containment is checked, and the resolved path is used for both component-by-component symlink checks and exclusive journal creation. Regression tests cover the QA root, a contained normalized subdirectory, traversal, an already-normalized outside path and a symlink escape. Virtual-filesystem tests never open the historical live journal. The original exclusive one-shot guard remains in place.

Verification: 44 focused offline cases pass (26 existing plus 18 regression cases); full npm test passes all seven files with zero failures. CLI dry-run confirms eight unchanged jobs, zero network calls/credential reads and the unchanged $0.00528 maximum reservation. Frozen corpus SHA and Phase 2A sources remain unchanged. Pre-existing Phase 2A/2B evidence, including actual responses/results and the one-shot journal, is byte-identical. Credential file identity, permissions, size and modification/change timestamps remain unchanged by metadata inspection only; its contents were not read. No application/PDF/SG-SHARE01 changes, live invocation, paid calls, staging, commit, push or deployment occurred.

Ready for independent review, not commit approval or production integration. Qualified bilingual review remains pending. Directory-entry durability across power loss and provider billing/pricing verification remain limitations; this maintenance does not certify them or authorize another execution.
