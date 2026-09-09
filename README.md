# DaOS Capability Runtime

This project records and replays a workflow in a small banking application. During discovery, an LLM chooses actions from the controls visible on the page. A successful run becomes a JSON capability with input parameters, output definitions and checkpoints. Replay follows that capability without calling the model.

The demo searches for a member, reads their savings balance, prepares a savings sub-account and stops at the review screen. If the session expires, an operator can take control of the same browser page, restore the session and let the run continue. Final account submission is blocked.

The panel is based on the supplied **DaOS Automation Panel Framework**. The target application is local and uses synthetic records only. Its forms sit inside an iframe and use table labels beside inputs, with no test IDs or business API.

## Setup

Use Node.js 22 or newer and npm on Windows, macOS or Linux:

```sh
npm ci
npx playwright install chromium
npm run build
npm start
```

Open [the DaOS panel](http://127.0.0.1:4317). On Linux, use `npx playwright install --with-deps chromium` if browser dependencies are missing. The server listens on loopback only.

Replay, tests and the offline demo do not need a model account. For discovery, choose a connection:

- **Codex:** install the official Codex CLI and run `codex login`. Use `--provider codex`. The CLI must support `--ephemeral`, `--ignore-user-config` and `--output-schema`. `CODEX_MODEL` selects a model available to your account; `CODEX_BIN` can point to the CLI executable. The saved discovery used `gpt-5.6-sol`.
- **OpenAI API:** set `OPENAI_API_KEY` in your shell and use `--provider openai`. `OPENAI_MODEL` defaults to `gpt-5.4-mini`. This adapter is implemented, but the saved live run used Codex.

`.env.example` lists the settings. The app does not load `.env` files automatically. Keep keys in your shell environment and use parameter names, rather than personal details, in goals.

## Run discovery, then replay

Stop `npm start` before using the commands below. Each CLI command starts its own local application and operator service on port 4317, then closes them when the run finishes. Add `--port 4320` if 4317 is already in use.

```sh
npm run discover -- --provider codex --goal "Find the member using memberId, prepare a savings sub-account using nickname, and reach account review. Return savingsBalance and reviewStatus. Do not submit." --save var/capability.json
npm run replay -- --artifact var/capability.json --params-file examples/second-member.json
npm run replay -- --artifact var/capability.json --params-file examples/not-found.json
```

Discovery makes a fresh model request at each step. It receives the current screen and available controls, without a supplied action sequence. The executor fills parameter values and reads outputs; those values are not sent to the model.

The CLI returns typed outputs to its caller. Logs go to `var/runs/<run-id>/`, with financial outputs redacted in saved results. The capability stores parameter names rather than the values used to record it. `--target` accepts an entry URL within the configured allowlist. This implementation supports the included Northstar profile and savings-review contract.

To try the saved capability without a model connection:

```sh
npm run demo
npm test
npm run verify:evidence
```

The demo runs nine cases: success with different inputs, a missing member, validation failure, slow loading, a maintenance notice, session expiry, permission denial, timeout and an unexpected dialog. It writes new results under `var/demo/`. The session-expiry case uses a scripted operator so the command can finish unattended. The next section shows how to take over yourself.

## Take over a paused session

```sh
npm run replay -- --artifact evidence/capability.json --params-file examples/second-member.json --scenario session-expired
```

1. Open the operator URL printed by the command and wait for the expired-session message.
2. Click **Take control**.
3. Under **Page controls**, click **Restore training session**. This is the sample app's replacement for signing in again.
4. Click **Return to automation**. The runtime checks the page before continuing.

The browser page stays open throughout. Returning before the session is repaired is rejected. Only one operator can hold control, and an old claim stops working after control is returned. **Stop run** cancels the run; an unanswered intervention times out after three minutes. Account submission stays blocked during manual control.

You can also select the expired-session case in the dashboard and open the operator page from the run card.

## Code map

| Path | What it contains |
| --- | --- |
| `runtime/schema.ts`, `schema/` | Capability types and generated JSON Schema |
| `runtime/engine.ts`, `control.ts` | Discovery, replay, checkpoints and session ownership |
| `runtime/surface.ts` | Browser observation and actions inside named frames |
| `runtime/profile.ts`, `policy.ts` | Control definitions, input/output contracts and allowlists |
| `runtime/model.ts` | Codex and OpenAI connections |
| `src/`, `operator/` | DaOS dashboard and operator page |
| `fixture/` | The synthetic legacy application |
| `evidence/` | Saved discovery, replay and handoff records |
| `REPORT.md` | Design decisions and limitations |
| `REVIEW.md` | Requirement-by-requirement submission check |

A run returns `success` with outputs, a `business_outcome` such as `not_found`, or a `failure`. The result also identifies the run, session, step, expected and observed state, and any interventions or recoveries. The CLI and direct runtime return sensitive outputs to the caller; saved results and the HTTP dashboard redact them.

Use `--policy examples/policy.json` to supply an allowlist and execution limits. The example's origin must match the port you use. Policy can restrict routes and action types, but cannot permit an unapproved control or account submission. Changes to the trusted vendor profile need separate review.

For frontend development, run `npm start` for the backend and `npm run dev` for Vite on port 5178. Run `npm run schema` after changing the schema definitions.

## Scope and provenance

The seven required areas are covered for the included application. The [design report](REPORT.md) explains how the interfaces could extend to desktop applications and multiple institutions; those adapters are not implemented. There is no production authentication, persistent browser recovery, scheduler or general-purpose sensitive-data detector.

[DAOS_PROVENANCE.md](DAOS_PROVENANCE.md) lists the framework code that was reused. No customer dataset or production DaOS configuration was imported. AI tools were used during development and review. The [evidence notes](evidence/README.md) distinguish the live model run, scripted handoff test and browser-operated demonstration.
