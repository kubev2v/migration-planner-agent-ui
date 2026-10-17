# Offline Analyzer

Standalone, offline variant of the Migration Advisor agent UI. It analyzes
**RVTools spreadsheet exports** (`.xlsx`) instead of connecting live to a
vCenter: the RVTools file already contains the VM inventory, storage
configuration and network topology, so no connection to vCenter or the Red Hat
console is required.

The app always runs in RVTools mode. The connected-mode features of the agent
UI (vCenter login, credentials management, data sharing / discovery status,
running new vSphere reports, deep inspection, application & process discovery,
the storage offload estimator and report comparison tools) are intentionally
absent here — RVTools exports do not carry the data those features need.

## Flow

1. The user lands on `/rvtools-upload` and uploads one or more `.xlsx` RVTools
   exports.
2. The collector parses them, then the app redirects to `/report`.
3. The report provides the Virtual machines overview and Groups views, with CSV
   / PDF / PNG / HTML export.

## Scripts

- `yarn start` — dev server on `127.0.0.1:3002`.
- `yarn build` — type-check and production build (`tsc -b && vite build`).
- `yarn preview` — serve the production build on `127.0.0.1:4002`.
- `yarn check` / `yarn check:fix` — Biome lint & format.
- `yarn test` / `yarn test:watch` — Vitest suite.

> Dev server uses port `3002` (preview `4002`) to avoid colliding with the `agent-ui` app, which uses `3001` / `4001`.
