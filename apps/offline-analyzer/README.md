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

## API

The UI talks to the **Standalone RVTools Analyzer** HTTP API (OpenAPI `servers: /api/v1` in `assisted-migration-agent/analyzer/api/v1/openapi.yaml`) — base path **`/api/v1`** (paths match the agent SDK operations; `agent-ui` uses `/api/v2` for the live appliance).

- **Development:** requests go to `/agent/api/v1/...` on the Vite dev server; configure the backend with `VITE_API_BASE_URL` (default `http://localhost:8000`). The proxy strips the `/agent` prefix so the analyzer receives `/api/v1/...`.
- **Health check:** startup uses **`GET /api/v1/status`** (analyzer OpenAPI), not the appliance’s `GET /api/v2/agent`. A working backend should return `{ "status": "ready" }`.
- **Production:** the app uses `{origin}/api/v1` as the SDK `basePath` (serve the analyzer behind that path or adjust deployment/nginx accordingly).
