# Executed evidence

Recorded on 2026-09-09 UTC against the local synthetic Northstar fixture. These are executed runs, not illustrative transcripts. Member references, nicknames and financial values are omitted from events and redacted in saved results. Runnable parameter examples are synthetic.

| Directory | Run | Observed result |
| --- | --- | --- |
| `discovery/` | Genuine Codex / `gpt-5.6-sol` discovery | Success; 9 live model calls, 8 recorded actions |
| `replay/` | Different member and nickname | Success; typed output checks, 0 model calls |
| `not-found/` | Unknown member | Business outcome `not_found`; stops after search |
| `validation/` | Invalid reference format | Business outcome `validation` |
| `slow/` | Delayed search result | Success after bounded wait; 1 recovery |
| `interstitial/` | Known maintenance notice | Success after one dismissal; 1 recovery |
| `handoff/` | Expired session; scripted operator | Same-session repair and resume; success |
| `handoff-browser/` | Expired session; operator console used in browser | Same-session repair and resume; success |
| `permission/` | Denied permission | Hard failure; intervention routed and timed out |
| `timeout/` | Loading never completes | `checkpoint_timeout`; intervention routed |
| `unknown-dialog/` | Unrecognized confirmation | Hard failure; intervention routed and timed out |

Each directory contains hash-chained `events.jsonl` and redacted `result.json`. Failure/intervention directories also contain rendered redacted DOM snapshots: original frame element hierarchy and rectangles, static approved text, and `[REDACTED]` for unknown text and all inputs. These come from the live DOM. Request IDs and token counts in discovery are real model transport receipts; they document provenance but are not signed attestations.

The canonical `capability.json` is byte-identical to `discovery/capability.json`. Model decisions were made from the visible projection, without a supplied action sequence. This recording reads the balance on the detail screen before preparing the sub-account. Replay follows that order.

## Browser-operated handoff

Run `22d0635b-233e-4bab-97bf-6a21f5fd0749` was started from the actual DaOS control room with the expired-session scenario. The development assistant used browser UI controls in the operator role (not an independently recruited human operator):

1. The runtime stopped at step 4 with `session_expired`, expected screen `form`, ownership `unclaimed`, epoch 1.
2. **Take control** changed ownership to `human`, epoch 2.
3. An early **Return to automation** was visibly rejected with `resume_checkpoint_rejected`.
4. **Restore training session** clicked a real control on the original browser page; the audit captured both human action events.
5. **Return to automation** restored automation ownership, epoch 3. Remaining actions completed successfully with zero model calls.

Every event carries session `a560b822-4feb-4d93-9af2-81cb34314fc1`; no replacement application session was created. The scripted demo is separately labeled in its event trail. The interface and fencing mechanism are real in both cases; synthetic reauthentication stands in for production operator work.

## Verify or reproduce

```sh
npm run verify:evidence
npm test
npm run demo
```

The verifier checks 11 event chains, model receipts, observation hashes, value redaction, zero model calls on replay and session identity across handoff. The suite runs 17 integration/unit tests, including ambiguous locators, wrong-member review, malformed outputs, control races, cancellation and policy rejection. Fresh demo runs go to `var/demo/` and never overwrite submitted evidence.
