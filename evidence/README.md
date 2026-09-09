# Run evidence

These runs were recorded on 2026-09-09 UTC against the local Northstar training application. The sample data is synthetic. Logs omit member references, nicknames and financial values; saved results redact the balance.

| Directory | Case | Result |
| --- | --- | --- |
| `discovery/` | Codex discovery using `gpt-5.6-sol` | Success; 9 model calls and 8 recorded actions |
| `replay/` | A different member and nickname | Success; 0 model calls |
| `not-found/` | Unknown member | `not_found`; stops after search |
| `validation/` | Invalid member-reference format | Business outcome `validation` |
| `slow/` | Delayed search result | Success after one bounded wait |
| `interstitial/` | Maintenance notice | Success after one dismissal |
| `handoff/` | Expired session, scripted operator | Repair and resume on the same session |
| `handoff-browser/` | Expired session, operator page used in a browser | Repair and resume on the same session |
| `permission/` | Permission denied | Intervention followed by timeout |
| `timeout/` | Loading does not finish | `checkpoint_timeout`; intervention recorded |
| `unknown-dialog/` | Unexpected confirmation | Intervention followed by timeout |

Each directory has `events.jsonl` and `result.json`. Where a run stopped for help or failed, it also has an HTML snapshot containing DOM structure and element rectangles from the live frames. Known labels are retained; unknown text and input values are replaced with `[REDACTED]`.

The discovery log includes model request IDs and token counts. Each decision came from the current observation, without a supplied sequence of actions. The resulting flow reads the balance on the member detail screen before opening the setup form. Replay uses that recorded order.

The top-level `capability.json` is identical to `discovery/capability.json`. Event hashes link records in order, and snapshot hashes cover their saved contents. These checks detect edits; they are not signed proof from the model provider. Historical artifacts, logs and snapshots are kept unchanged when documentation or interface wording is revised.

## Handoff through the operator page

Run `22d0635b-233e-4bab-97bf-6a21f5fd0749` began in the DaOS dashboard with an expired-session condition. The development assistant then used the browser interface as the operator. This was not a session with an independently recruited human tester.

1. At step 4, the runtime reported `session_expired` and expected the `form` screen. Control was `unclaimed`, epoch 1.
2. **Take control** assigned control to `human`, epoch 2.
3. Returning immediately was rejected with `resume_checkpoint_rejected`.
4. **Restore training session** clicked the corresponding button on the existing application page. Both manual-action events were recorded.
5. **Return to automation** restored automation ownership, epoch 3. The remaining steps finished successfully with no model calls.

All events have session ID `a560b822-4feb-4d93-9af2-81cb34314fc1`. The scripted handoff in `handoff/` is separately identified in its log. Both cases use the same ownership mechanism. The training button stands in for signing in again to a real application.

## Verify and reproduce

```sh
npm run verify:evidence
npm test
npm run demo
```

The verifier checks 11 event chains, discovery receipts, observation hashes, snapshot contents, redaction and session identity. The 17 tests cover replay, application errors, target ambiguity, incorrect review data, competing operators, cancellation and policy rejection. New demo results go to `var/demo/`; they do not overwrite these records.
