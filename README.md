# DaOS Capability Runtime

A small computer-use runtime built on the **DaOS Automation Panel Framework**. An LLM discovers a workflow against a live legacy-style banking UI; the runtime turns successful actions into a typed capability and replays it without a model. A fenced control lease lets an operator repair the original session and return it to automation.

**Only synthetic training data.** This repository contains no real customers, credentials, production DaOS data or bank integrations. The fixture is a browser iframe with tables, unlabeled inputs and no test IDs or business API. The workflow searches a member, opens details, prepares a savings sub-account and stops at review. Account submission is blocked.

## Setup

Node.js 22+ and npm. Windows, macOS or Linux:

```sh
npm ci
npx playwright install chromium
npm run build
```

On Linux, `npx playwright install --with-deps chromium` also installs browser OS dependencies. Use `npm start` and open [the DaOS panel](http://127.0.0.1:4317). The server binds only to loopback. No credentials are needed to replay, run the demo or run tests.

For discovery choose one model connection:

- **Codex:** install the official Codex CLI, run `codex login`, then select `--provider codex`. The submitted discovery uses the already authenticated CLI as an ephemeral structured LLM transport. Each step is a fresh real model request; no recorded answers are substituted. `CODEX_MODEL` and `CODEX_BIN` are optional. The CLI must support `--ephemeral`, `--ignore-user-config` and `--output-schema`.
- **OpenAI API:** set `OPENAI_API_KEY` and optionally `OPENAI_MODEL` in the shell, then use `--provider openai`. Defaults to `gpt-5.4-mini`. Never place an actual key in a committed file. `.env.example` documents names; this project does not automatically load dotenv files. This adapter is implemented but the committed live evidence uses Codex.

## Exact discovery → replay demo

Stop `npm start` before these CLI commands: each command starts its own local fixture and operator service on port 4317, then shuts it down. Supply `--port 4320` to use another free port.

```sh
npm run discover -- --provider codex --goal "Find the member using memberId, prepare a savings sub-account using nickname, and reach account review. Return savingsBalance and reviewStatus. Do not submit." --save var/capability.json
npm run replay -- --artifact var/capability.json --params-file examples/second-member.json
npm run replay -- --artifact var/capability.json --params-file examples/not-found.json
```

The inputs are parameter references during discovery; their values stay inside the executor. Outputs are returned to the CLI caller. Run evidence is written under `var/runs/<run-id>/`; persisted output values are redacted. The saved artifact contains no concrete input values. `--target` accepts an entry URL, constrained by the policy; this build supports the included vendor profile, not arbitrary websites.

To run the complete offline demonstration from the committed genuine discovery artifact:

```sh
npm run demo
npm test
npm run verify:evidence
```

The demo covers a second member, not-found, validation, slowness, a known interstitial, same-session handoff, permission denial, timeout and an unexpected dialog. It writes fresh results to `var/demo/`. Its operator is explicitly scripted for repeatability; the operator interface below is usable by a person.

## Real manual handoff

```sh
npm run replay -- --artifact evidence/capability.json --params-file examples/second-member.json --scenario session-expired
```

1. Open the **operator URL printed by the command**. Wait for `session_expired`.
2. Click **Take control**. The browser context and page stay alive; the runtime cedes its lease.
3. Click **Restore training session** under Live controls. This button represents manual session reauthentication in the synthetic fixture.
4. Click **Return to automation**. The runtime verifies the expected screen and absence of hard errors, then continues to review on the same session.

Returning early is rejected. A second operator cannot claim the same lease. Old tokens and epochs stop working after resume. A blocked run times out after three minutes, or **Stop run** cancels it immediately. Irreversible actions remain blocked even in the operator console. Use the panel's **Expired session → operator handoff** scenario for the same flow visually.

## Structure and contracts

| Path | Purpose |
| --- | --- |
| `runtime/schema.ts`, `schema/` | Strict typed capability, decisions, action and field contracts; exported JSON Schema |
| `runtime/engine.ts`, `control.ts` | Discovery/replay, checkpoints, outcomes, fenced control transfer |
| `runtime/surface.ts` | Browser adapter; exact accessibility labels and adjacent table cells in named frames |
| `runtime/profile.ts`, `policy.ts` | Trusted vendor vocabulary, locator binding and independent action/network policy |
| `runtime/model.ts` | Model connections; imported only as a type by the replay engine |
| `src/`, `operator/` | DaOS panel integrated through `/api/automation/*`; same-session operator controls |
| `fixture/` | Entirely synthetic legacy application; UI interaction only |
| `evidence/` | Genuine discovery artifact and logs, replay outcomes, handoff evidence |
| `REPORT.md` | Architecture, decisions, trade-offs and deliberate cuts |

Result status is one of `success` (typed outputs), `business_outcome` (`not_found` or `validation`), or `failure`. Results carry run/session IDs, step, expected/observed markers, error code, model call count and intervention/recovery counts. The HTTP dashboard deliberately returns redacted outputs; the direct runtime/CLI result is the agent invocation boundary for sensitive outputs.

An optional `--policy path.json` accepts the shape in `examples/policy.json`; origin, exact routes, permitted action types, step and time limits are configurable. Policy cannot grant an artifact permission to click an unapproved target or submit an account. Profile-specific locators and business semantics are deliberately trusted configuration, not LLM-generated authority.

Run `npm run schema` after schema changes. `npm run dev` runs Vite on 5178 while `npm start` serves the runtime on 4317. The supported interface is the control room; scheduling is deliberately omitted. The visual framework's original generic command components remain as reusable source.

## Provenance and limitations

See [DAOS_PROVENANCE.md](DAOS_PROVENANCE.md) for the exact framework reuse. DaOS provided the existing visual/control shell; this project supplies its working backend and control-transfer model. No other DaOS repository or dataset was copied.

This is a focused single-worker training implementation. It does not claim production bank readiness, general-purpose PII detection, native desktop support, process-crash continuation or distributed operator authentication. Public evidence uses structural DOM projections that omit all unknown text and field values. See the seven sections in [REPORT.md](REPORT.md) for the limits and next steps.
