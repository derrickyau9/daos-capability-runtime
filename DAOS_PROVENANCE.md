# DaOS framework provenance

This project was created inside the user's `DaOS Repo` folder, from the supplied **DaOS Automation Panel Framework**, export dated 2026-05-26.

Source relative to the containing DaOS Repo:

`DaOS Legacy/DaOS-Automation-Panel-Framework-20260526/DaOS-Automation-Panel-Framework/`

Reused framework parts:

- React/TypeScript/Vite entry and dashboard composition.
- `src/components/glass/`: panel, button, card, tabs, select and status primitives.
- `src/components/layout/`: app shell, navigation, notification rail, toast stack, activity bar and full-screen sheets.
- `src/components/workspace/`: workflow, integrations, logs and metrics presentations.
- `src/styles/daos-theme.css`, `glass.css`, `dashboard.css`: original DaOS visual system.
- `src/lib/types/automation.ts` and `/api/automation/*` client adapter contract.

Integration changes replace `useAutomationRuntime`'s mock state with real polling, implement the generic snapshot/run/pause/stop/sync endpoints, add the runtime control room, connect actual tasks/events/interventions, update diagnostics, and remove unsupported commands from the active UI. Original generic command components remain in source for reuse; they are not a separate automation engine.

New work: `runtime/`, `fixture/`, `operator/`, tests, schemas, evidence, documentation and `RuntimeWorkbench`/its CSS. These implement the orchestration, capability recording, deterministic interpreter, guarded surface, model transport and fenced handoff.

No retail backend, Magento bridge, customer exports, production configuration, databases, credentials or other DaOS data were used. The source export did not include a license file; this submission preserves provenance and does not invent an upstream license grant. Dependency licenses remain with their authors.
