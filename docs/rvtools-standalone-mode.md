# RVTools standalone (offline) mode in `migration-planner-agent-ui`

## Context

Today the OMA agent ships as an OVA/OVE appliance (RHCOS + Ignition + a single
Podman quadlet container running the `migration-planner-agent` image, which serves
the UI as static files through its gin server). We want a **simple disconnected
mode**: a consultant runs the agent image locally
(`podman run … --rvtools-mode` / `AGENT_RVTOOLS_MODE=true`), uploads an RVTools
file (`.xlsx`), and gets the VM report — **no vCenter, no Red Hat console**.

**The backend is already done** (ECOPROJECT-5110, commit `1349fa2` in
`assisted-migration-agent`):

- flag `--rvtools-mode` → `RVToolsHandler` returns **501** for credentials / live
  collector / inspector / forecaster / applications / `SetAgentMode`, forces
  `disconnected` mode, generates random UUIDs (no console handshake).
- new endpoint `POST /collector/rvtools` (multipart `files[]`) that ingests the
  `.xlsx` files via migration-planner's shared `duckdb_parser`.
- the mode is exposed to the frontend via `rvtoolsModeEnabled` in `GET /agent`.

**The only missing piece = the UI.** No UI consumes the flag yet. The already
installed npm SDK `@openshift-migration-advisor/agent-sdk@0.20.2` exposes **both**
`AgentStatus.rvtoolsModeEnabled` **and** `CollectorApi.startRvtoolsCollector({ files: Blob[] })`
→ **no SDK bump/regen needed.**

## Chosen approach: runtime switch (single bundle)

A single Vite bundle, a single `index.html`. At startup the app reads
`rvtoolsModeEnabled` from `GET /agent` and adapts the **router + navigation +
landing page**. The same agent image serves both modes → faithful to "same image,
just a flag". **Zero backend change, zero Containerfile change** (the gin server
already serves `index.html` for all SPA routes; a single `dist`).

RVTools mode scope (user choice): **Dashboard + VMs + CSV Export** only. Hidden:
vCenter login/credentials, Groups, Storage offload, Report comparison, Applications
tab, "Run new report" buttons (vCenter collector), data-sharing/connected.

Everything lives in the repo: `work/migration-planner-agent-ui/apps/agent-ui/`.

## Changes

### 1. Expose the mode in the context

`src/common/AgentStatusContext.tsx` — add an `isRvtoolsMode` boolean to
`AgentStatusContextValue`, derived from `agentStatus?.rvtoolsModeEnabled === true`.
(The provider already fetches `getAgentStatus`; `loading` handles the initial wait.)

### 2. Router conditional on the mode

`src/main/Router.tsx` — today `router` is a `createBrowserRouter` frozen at module
level. Refactor it to expose **two route trees**: `standardRoutes` (the existing
one) and `rvtoolsRoutes` (new).

`src/main/Root.tsx` — move router creation into a small component rendered **under**
`AgentStatusProvider`, which waits for `!loading` then calls
`createBrowserRouter(isRvtoolsMode ? rvtoolsRoutes : standardRoutes)`. Show a
`<Spinner/>` while `loading`. Keep the entire existing provider stack
(`DependencyInjectionProvider` → `AgentStatusProvider` → `CredentialsProvider` →
`ReportsProvider`).

`rvtoolsRoutes`:

- `/` → `Navigate` to `/rvtools-upload`
- `/rvtools-upload` → new `RVToolsUploadPage` (see §3)
- `/report` → new `RVToolsProtectedRoute` wrapper (see §4) wrapping `PageLayout` in
  its rvtools variant (§5), single child `vms-overview` → `ReportContainer` (§6).
  **No** groups / storage-offload / report-comparison.
- `/error/:code` and `*` → `ErrorPage` (unchanged)

### 3. New upload page — `src/pages/RVTools/RVToolsUploadPage.tsx`

New folder `src/pages/RVTools/`. Centered page (style close to
`VCenterLoginPage.tsx`) with a PatternFly `MultipleFileUpload`/`FileUpload` (pattern
already used in
`pages/VirtualMachinesOverview/components/VirtualMachinesTab/DeepInspectionModal.tsx`),
accepting `.xlsx`. On submit:

- `agentApi.startRvtoolsCollector({ files })` (via `useInjection<DefaultApiInterface>(Symbols.AgentApi)`)
- poll status with the existing `getCollectorStatus` (`src/api/collectorApi.ts`) +
  `isCollectorInProgress` / `collected` status (`src/common/collectorStatus.ts`),
  reuse `CollectionProgress` (`src/common/components`) for the progress bar.
- on `collected` → `navigate("/report")`; on error → danger `Alert`.
  Reuse `parseApiError` (`src/common/parseApiError.ts`).

### 4. `RVToolsProtectedRoute`

Variant of `src/pages/ProtectedRoute.tsx`: same logic (allow if `collected` / in
progress / a collection already exists via `getLatestCollectionId`) but redirects to
`/rvtools-upload` instead of `/login`. Simpler option: add a `redirectTo` prop to the
existing `ProtectedRoute` and reuse it.

### 5. Mode-aware `PageLayout` — `src/pages/PageLayout.tsx`

Read `isRvtoolsMode` from context (or a `variant` prop). In rvtools mode:

- `NAV_SECTIONS` reduced to `[{ title: "Reporting", items: [{ /report/vms-overview }] }]`
  (drop Groups + the entire "Tools" section).
- hide `VCenterCredentialsDropdownMenu` in the masthead.
- `RunNewReportAlerts`/`ReportsContext` trigger the vCenter collector → hide (or
  later replace with "Upload a new RVTools file"). For the MVP: hide.

### 6. `ReportContainer` — conditional Applications tab

`src/pages/VirtualMachinesOverview/VirtualMachinesOverviewPage.tsx` — hide the
**Applications** tab (`REPORT_TAB.applications`, backend 501 + data absent from
RVTools) when `isRvtoolsMode`. Keep Assessment report (Dashboard) + Virtual
Machines. The "Run new report" button in `ReportPageHeader` / the
`RunNewReportButton` from `ReportsContext` must be hidden in rvtools mode. CSV
Export (`useExportInventory` / `ExportCsvModal`): kept. Rendering already comes from
inventory (`fetchInventoryFromApi`), independent of vCenter.

### 7. No change

- Containerfile / nginx / build: unchanged (single bundle).
- Agent backend: unchanged (already merged).
- SDK: unchanged (0.20.2 is enough).

## Key files

- Modify: `src/common/AgentStatusContext.tsx`, `src/main/Router.tsx`,
  `src/main/Root.tsx`, `src/pages/PageLayout.tsx`, `src/pages/ProtectedRoute.tsx`,
  `src/pages/VirtualMachinesOverview/VirtualMachinesOverviewPage.tsx`
- Create: `src/pages/RVTools/RVToolsUploadPage.tsx` (+ optional
  `RVToolsProtectedRoute.tsx`)
- Reuse: `startRvtoolsCollector` (SDK), `getCollectorStatus`/`collectorApi.ts`,
  `getLatestCollectionId`/`collectionApi.ts`, `collectorStatus.ts`,
  `CollectionProgress`/`common/components`, `parseApiError.ts`, `Symbols.AgentApi`,
  the `FileUpload` pattern from `DeepInspectionModal.tsx`.

## Verification

1. **UI dev + rvtools agent**: run the agent in rvtools mode
   (`podman run -e AGENT_RVTOOLS_MODE=true -p 8000:8000 <migration-planner-agent>`
   or local binary `AGENT_RVTOOLS_MODE=true … agent run`), then
   `cd apps/agent-ui && yarn start` (proxy `/agent/api/v2` → `localhost:8000`).
   Check: `/` → upload page; uploading an RVTools `.xlsx` → progress →
   `/report` with Dashboard + VMs; no login, no Groups/Tools/Applications.
2. **Normal-mode non-regression**: agent without the flag → vCenter login + full nav
   unchanged (the router switches to `standardRoutes`).
3. **Quality**: `yarn typecheck:all`, `yarn check:all` (Biome), `yarn test:all`.
   Add a Vitest test for router selection based on `rvtoolsModeEnabled` and for
   `RVToolsUploadPage` (submit calls `startRvtoolsCollector`).
4. **Image build** (optional): `make image` in `assisted-migration-agent` then
   `podman run -e AGENT_RVTOOLS_MODE=true` to validate the bundle served statically.
