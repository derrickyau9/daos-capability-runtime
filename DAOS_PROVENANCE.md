# DaOS framework provenance

This project uses the DaOS Automation Panel Framework export dated 2026-05-26. It lives in the supplied `DaOS Repo` folder.

The original export is at:

`DaOS Legacy/DaOS-Automation-Panel-Framework-20260526/DaOS-Automation-Panel-Framework/`

## Reused code

- The React, TypeScript and Vite entry point and dashboard structure.
- Glass UI components: panels, buttons, cards, tabs, selects and status indicators.
- The app shell, navigation, notifications, activity bar and panel dialogs.
- Workflow, integration, log and metric components.
- The DaOS theme and base styles.
- Automation types and the `/api/automation/*` client contract.

## Changes in this project

The dashboard now polls the working runtime instead of mock state. The snapshot, run, pause, stop and sync endpoints connect the framework to actual runs. The control room starts discovery and replay, displays interventions and opens the operator page. Layout fixes cover the navigation rail, dialogs and smaller screens.

The execution engine, browser adapter, capability schema, policy, model connections, operator controls, synthetic application, tests and evidence were added for this assignment. Generic command components from the export remain available in source; the dashboard does not offer their unsupported scheduling features.

No customer exports, production configuration, databases, credentials or other DaOS datasets were copied. The export contained no license file, so this repository does not assign a license to the upstream framework. Third-party dependencies retain their own licenses.
