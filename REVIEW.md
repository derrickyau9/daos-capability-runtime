# Submission review

Checked against the supplied interface.ai assignment on 2026-09-09 UTC. The required workflow is implemented for the local Northstar application. The desktop and multi-tenant requirements are addressed as design work, as the brief allows.

| Requirement | Implementation and evidence |
| --- | --- |
| 3.1 Goal-driven loop | CLI and run API accept a goal and target. `runtime/engine.ts` calls the model between observations and UI actions. The saved discovery completed with 9 live Codex calls. |
| 3.2 Capability artifact | `runtime/schema.ts` and `schema/capability.schema.json` define versions, inputs, outputs, targets, steps, exceptions and checkpoints. `evidence/capability.json` is the recorded example. |
| 3.3 Deterministic replay | Replay interprets the artifact without model decisions. Tests change parameters and reject wrong review identity or invalid outputs. Saved runs cover success, business outcomes, recoveries and failures. |
| 3.4 Safety | `runtime/policy.ts` and `surface.ts` enforce origins, paths, control grants and blocked submission. Model observations and saved evidence omit parameter values. |
| 3.5 Observability | JSONL events record actions, decisions and outcomes. Failure HTML includes a redacted live DOM tree with control geometry. The verifier checks event and snapshot hashes. |
| 3.6 Handoff | Automation pauses on the original page. Claim tokens and epochs prevent competing control; resume checks the repaired screen. Tests compare the same Page object before and after. Both scripted and browser-operated evidence are included. |
| 3.7 Heterogeneity and reuse | `REPORT.md` describes desktop/visual adapters, vendor capabilities, reviewed tenant bindings, version checks and rollback. Only the browser adapter is implemented. |
| README and REPORT | Setup, model configuration, offline commands, discovery/replay commands and manual handoff steps are documented. REPORT uses all seven required headings. |
| Public source and evidence | [GitHub repository](https://github.com/derrickyau9/daos-capability-runtime), source code, generated schemas and 11 saved run directories are present. |

## Checks

- `npm test`: 17 tests passed, including real browser interaction.
- `npm run verify:evidence`: all 11 saved run chains passed.
- `npm run demo`: all nine replay scenarios returned the expected result, without model calls.
- `npm run build`: TypeScript and the production build passed.
- Browser checks covered success, a missing member, manual session repair, cancellation, diagnostic hiding, and desktop/mobile layout.
- The live discovery is documented in `evidence/discovery/`; it has not been replaced by scripted decisions.
- The public repo contains synthetic training examples, with no imported customer dataset.

The review also corrected misleading dashboard labels, the recent-activity order, diagnostic hiding inside dialogs and the display of failed runs. Runtime codes remain available for debugging; the interface now explains them in plain language.

## Limits to keep clear in a review

The model discovers an action sequence within a prepared vendor vocabulary and one capability contract. It does not discover arbitrary websites. The saved live model evidence uses Codex; the OpenAI adapter has not been verified against the live API.

Handoff operates the real browser session through a small operator page. Session restoration is a synthetic app action. The browser demonstration was performed by the development assistant, and the unattended demo uses an explicitly scripted operator.

Desktop execution, multi-tenant infrastructure, production operator authentication, crash recovery, approval/catalog infrastructure and scheduling are not implemented. These are documented scope limits or optional extensions, rather than completed features. The current privacy approach depends on the fixed profile and restricted event fields; it is not a general data-loss-prevention system.

No required section is missing within that stated scope. Optional stretch goals and a screen recording are not needed to complete the assignment.
