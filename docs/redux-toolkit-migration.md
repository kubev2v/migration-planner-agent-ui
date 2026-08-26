# Redux Toolkit Migration Playbook (Agent UI)

> **Audience: an AI agent doing the migration one work package at a time.**
> This document is self-contained. Read it fully before touching code, then pick
> **one** work package from §8, complete it end-to-end (code + tests +
> verification), and stop. Do not start a second package in the same change.

---

## 1. Goal

Move all server-state and cross-component synchronization in `apps/agent-ui`
off the current ad-hoc mechanisms (React Contexts holding server data, ~110
`onRefresh*`/`onCompleted` callback props, a hand-rolled pub/sub bus, a `WeakMap`
group cache, `invalidateAllGroupsCache`, `key`-remount hacks, and
`useMigrationInventoryRefresh`) and onto **one RTK Query cache** with
**tag-based invalidation**, plus **slices** for pure client state.

The end state stops agent-ui from using the IoC container (`useInjection`,
`Symbols`): the SDK client becomes a **module singleton** (`getAgentApiClient()`
in `api/agentApiClient.ts`) with two access paths — the store's `extraArgument`
(the primary path; every RTK Query endpoint reaches the client via its
baseQuery) and ~8 direct `getAgentApiClient()` imports for imperative one-offs
(inventory/blob exports, the auth probe, the forecaster base path, the paged
group loops, and the credential/collector lifecycle). The store is **one
consumer** of the singleton, not its sole owner.

**Why:** every count/list currently derives from its own `useState`, kept in
sync by hand. When one path forgets to update, values diverge (the motivating
bug: a group's header count stayed stale while the table updated). When every
derived value reads from one cache entry, invalidated by shared tags,
divergence becomes **structurally impossible** — not just fixed once.

---

## 2. Current state (what the pilot already delivered)

The scaffolding is **done and reusable**. Do not rebuild it.

```
apps/agent-ui/src/store/
  index.ts                 # createStore(agentApi): configureStore + extraArgument + setupListeners
  hooks.ts                 # useAppDispatch, useAppSelector (typed)
  baseQuery.ts             # sdkBaseQuery — custom baseQuery calling the SDK client
  api/
    agentApiSlice.ts       # createApi({ reducerPath, baseQuery, tagTypes, endpoints:()=>({}) })
    groupsEndpoints.ts     # getGroup, getGroupVMs, updateGroupName, deleteGroup
    groupsEndpoints.test.ts
  slices/                  # client-only state (created per-domain as needed)
```

> Note: no `appModeSlice` was built. App mode is read directly from the cached
> `getAgentStatus` response via `useAgentStatus` (`agentStatus.mode`), so there
> is no separate slice or `useSeedAppMode` to keep in sync.

- `Root.tsx` wraps the tree in `<ReduxProvider store={store}>` (outermost, inside
  `StrictMode`). The store is built from the shared SDK singleton:
  `createStore(getAgentApiClient())` — the same instance the direct imperative
  callers import, so there is no divergence.
- **`GroupDetailPage` is fully migrated** — use it as the reference
  implementation for every subsequent page.
- Everything else still uses the old mechanisms and **coexists** — the migration
  is incremental and each package must keep the app working.

### The current tag registry (`agentApiSlice.ts`)

```ts
export const AGENT_API_TAGS = [
  "Group", "GroupVms", "GroupInventory", "Vms", "Inventory", "VmLabels",
] as const;
```

Add new tag types here as packages need them (see §8). Never create a second
`createApi` — one cache is the whole point.

---

## 3. The pattern (golden recipe)

Everything in this migration is a repetition of this shape. Learn it once.

### 3.1 A query endpoint

```ts
// store/api/<domain>Endpoints.ts
export const <domain>Endpoints = agentApiSlice.injectEndpoints({
  endpoints: (build) => ({
    getThing: build.query<ResponseType, ArgType>({
      // query returns a callback: (sdk) => Promise<T>. sdk is the composed SDK client.
      query: (arg) => (sdk) => sdk.someSdkMethod({ ...arg }),
      providesTags: (_res, _err, arg) => [{ type: "Thing", id: arg.id }],
    }),
  }),
});
export const { useGetThingQuery } = <domain>Endpoints;
```

### 3.2 A mutation endpoint

```ts
updateThing: build.mutation<ResultType, ArgType>({
  query: (arg) => (sdk) => sdk.updateSdkMethod({ ...arg }),
  // Invalidate every query whose data this mutation makes stale.
  invalidatesTags: (_res, _err, arg) => [
    { type: "Thing", id: arg.id },
    { type: "Vms", id: "LIST" },      // e.g. also refetch the global VM list
  ],
}),
```

### 3.3 Consuming in a component

```ts
const { data, isFetching, error } = useGetThingQuery(arg, { skip: !ready });
const [updateThing] = useUpdateThingMutation();
await updateThing(arg).unwrap();     // throws on error → wrap in try/catch
```

### 3.4 Imperative invalidation (bridging old code during transition)

When an old callback (e.g. `ReportsContext.onCompleted`) fires and you need the
cache to refetch, dispatch:

```ts
import { agentApiSlice } from "../../store/api/agentApiSlice";
dispatch(agentApiSlice.util.invalidateTags([{ type: "Group", id: groupId }]));
```

### 3.5 Optimistic updates (only where instant UI matters)

Prefer plain invalidate → refetch (simpler, always correct). Use optimistic
patches **only** where a sub-second flash is unacceptable (e.g. toggling
migration-exclusion on a VM row). Reuse the pure helpers in
`pages/VirtualMachinesOverview/inventoryParsing.ts`
(`adjustInventoryForMigrationExcludedChange`, `resolveInventoryAfterMigrationChange`):

```ts
onQueryStarted: async (arg, { dispatch, queryFulfilled }) => {
  const patch = dispatch(
    <domain>Endpoints.util.updateQueryData("getThing", cacheArg, (draft) => {
      // mutate draft using the pure helper
    }),
  );
  try { await queryFulfilled; } catch { patch.undo(); }
},
```

---

## 4. Conventions (do not deviate)

- **One `createApi`.** New endpoints go through `agentApiSlice.injectEndpoints`
  in a per-domain file `store/api/<domain>Endpoints.ts`. Side-effect-import each
  new endpoints file in `store/index.ts` (see the existing
  `import "./api/groupsEndpoints"`).
- **baseQuery arg is a callback** `(sdk) => Promise<T>`. Never call `fetch`
  directly and never use `fetchBaseQuery` — reuse the SDK client so auth, base
  path, and `cache:"no-store"` are preserved. The one exception (inventory
  raw-fetch) already lives behind `fetchInventoryFromApi(getAgentApiBasePath(sdk))`
  in `inventoryParsing.ts` — call it from inside a `query` callback.
- **Types come from the SDK.** Import response/arg types from
  `@openshift-migration-advisor/agent-sdk`. Never hand-roll a shape the SDK
  already exports.
- **Error handling:** the baseQuery already maps `ResponseError` →
  `{ status, message }`. In components, read `error` from the hook or
  `try/catch` around `.unwrap()`.
- **`skip`** every query whose args aren't ready (`{ skip: !groupId }`) instead
  of guarding with early returns that violate hook rules.
- **Client-only state → a slice** in `store/slices/`, not RTK Query. (Selected
  rows, open panels, filters-not-sent-to-server, app mode.)
- **Lint/format is Biome.** No `any` (`noExplicitAny`). Keep the baseQuery
  generically typed; cast fakes in tests via `as unknown as AgentApiClient`.
- **Tests use Vitest globals** (`import { describe, expect, test, vi } from "vitest"`).
  No MSW — inject a fake `agentApi` through `createStore(fakeApi)`.

---

## 5. How to migrate ONE page/domain (step-by-step)

1. **Read the reference:** `pages/Groups/GroupDetailPage.tsx` +
   `store/api/groupsEndpoints.ts` + `store/api/groupsEndpoints.test.ts`.
2. **List the SDK calls** the target page makes (grep for `agentApi.` /
   `useInjection`). Each read → a `build.query`; each write → a `build.mutation`.
3. **Decide tags:** which queries does each mutation make stale? Add any missing
   tag types to `AGENT_API_TAGS`. Draw the mutation → tags → queries graph in the
   PR description.
4. **Write the endpoints file** `store/api/<domain>Endpoints.ts`; export hooks;
   side-effect-import it in `store/index.ts`.
5. **Refactor the component:** delete server-data `useState`, replace with query
   hooks; every derived count/list reads from `data`. Replace imperative
   refreshes with mutations (auto-invalidate) or `util.invalidateTags`.
6. **Retire the plumbing** that page owned: its `onRefresh*` callback props, its
   slice of `ReportsContext` bridging, its `key`-remount, its `WeakMap`/`invalidateAllGroupsCache`
   usage — **only for what this package fully covers**. Leave the rest working.
7. **Tests:** an endpoints/tag test (real store + fake SDK, assert invalidation
   refetches) and, where a divergence bug is possible, a regression test that a
   single invalidation updates two derived values together.
8. **Verify** (§9). All green, then stop.

---

## 6. What must keep working during transition

Until a domain is fully migrated, its old mechanism stays. Concretely:

- `ReportsContext` pub/sub, `AgentStatusContext`, `CredentialsContext` remain the
  owners until their package (§8) migrates them. Bridge into the cache with
  `util.invalidateTags` where a migrated page must react to an old event.
- `useInjection<DefaultApiInterface>(Symbols.AgentApi)` is fine to keep on
  not-yet-migrated components. The store reuses the **same** client instance, so
  there is no divergence.
- `useMigrationInventoryRefresh` stays on `VirtualMachinesOverviewPage` until
  the VMs package migrates it.

The IoC package is removed **only** in the final cleanup (§8, last package),
once no `useInjection` remains.

---

## 7. Scope map (measured surface, for planning)

- 3 Contexts holding server/derived state: `ReportsContext` (135 LOC),
  `AgentStatusContext` (96), `CredentialsContext` (264).
- 18 files used `useInjection<DefaultApiInterface>` (direct SDK access) at the
  start. `useInjection`/`Symbols.AgentApi` are now gone from agent-ui: the SDK
  client is a module singleton reached via the store `extraArgument` (RTK Query
  endpoints) plus ~8 direct `getAgentApiClient()` imports for imperative one-offs.
- ~110 callback-prop occurrences: `onCompleted` ×34, `onRefreshFilterOptions`
  ×24, `onRefreshVMs` ×23, `onRefreshInventory` ×10, `onRefreshApplications` ×6, …
- ~40 distinct SDK methods to model as endpoints.
- Largest state surfaces: `VirtualMachinesView` (904), `VMsOverviewPage` (699),
  `ApplicationsView` (491), `ReportComparison*` (~1000 across files).

---

## 8. Work packages (do these in order, one at a time)

Each package is independently shippable and leaves the app working. Complete
**one**, verify, stop.

### WP-1 — Groups list + membership modals  ·  size S/M · risk low
- **Files:** `pages/Groups/GroupsPage.tsx`, `pages/Groups/components/modals/*`
  (`AddToGroupModal`, `RemoveFromGroupModal`, `CreateGroupModal`,
  `CreateGroupFromSelectionModal`), `pages/Groups/utils/groupList.ts`.
- **Endpoints (extend `groupsEndpoints.ts`):** `listGroups`
  (`listLatestGroups`), `createGroup` (`createLatestGroup`),
  `changeGroupMembership` (`batchUpdateLatestVMExclusion` / the membership SDK
  call). `deleteGroup`, `updateGroupName`, `getGroup`, `getGroupVMs` already exist.
- **Tags:** add `{ type: "Group", id: "LIST" }` to `listGroups.providesTags`;
  `createGroup`/`deleteGroup`/`changeGroupMembership` invalidate
  `Group:LIST` (+ the specific `Group`/`GroupVms`/`GroupInventory` ids for
  membership).
- **Remove:** the `WeakMap` group cache and `invalidateAllGroupsCache` (replaced
  by `Group:LIST` invalidation); modal `onRefresh*`/`onCompleted` callbacks that
  only existed to re-sync the list.
- **Acceptance:** create/delete/rename/add-to/remove-from group updates the list
  and any open group detail without manual refresh; no `WeakMap`/`invalidateAllGroupsCache`
  left in Groups.
- **Test:** creating and deleting a group refetches `listGroups` from one
  invalidation.

### WP-2 — Credentials  ·  size S/M · risk low
- **Files:** `credentials/CredentialsContext.tsx`, `credentials/*`.
- **Endpoints:** new `store/api/credentialsEndpoints.ts` — `getCredentials`,
  `getCredentialCapabilities` (queries), `putCredentials`, `deleteCredentials`
  (mutations).
- **Tags:** add `"Credentials"`; mutations invalidate it.
- **Remove:** `CredentialsContext` provider once no consumer reads it; delete the
  provider from `Root.tsx`.
- **Acceptance:** credential form submit/delete reflects immediately via cache;
  no context.
- **Test:** `putCredentials` invalidates `Credentials` → `getCredentials`
  refetches.

### WP-3 — VMs Overview (the core)  ·  size L · risk medium
- **Files:** `pages/VirtualMachinesOverview/VirtualMachinesOverviewPage.tsx`
  (699), `components/VirtualMachinesTab/VirtualMachinesView.tsx` (904),
  `components/ApplicationsTab/ApplicationsView.tsx` (491),
  `useMigrationInventoryRefresh.ts` (143).
- **Endpoints:** new `store/api/vmsEndpoints.ts` — `getVMs`
  (`listLatestVirtualMachines`), `getVMFilterOptions`
  (`getLatestVMFilterOptions`), `getInventory` (`getLatestInventory` — reuse
  `fetchInventoryFromApi`), `getApplications` (`listApplications`),
  `getVMLabels` (`getLatestVMLabels`); mutations `updateVMLabels`
  (`updateLatestLabelVMs`), `deleteLabelGlobally` (`deleteLatestLabelGlobally`),
  `setVMExclusion` (`batchUpdateLatestVMExclusion`), `updateVirtualMachine`.
- **Tags:** use existing `Vms`, `Inventory`, `VmLabels`; add a `LIST` id to
  `Vms`. Exclusion/label mutations invalidate `Vms:LIST` + `Inventory` +
  `VmLabels`. This is where the ~90 callback props die.
- **Optimistic:** keep instant migration-exclusion toggles via `onQueryStarted`
  + `updateQueryData`, reusing the `inventoryParsing.ts` helpers; retire only the
  React-state plumbing of `useMigrationInventoryRefresh`.
- **Remove:** `onRefreshVMs`, `onRefreshFilterOptions`, `onRefreshInventory`,
  `onRefreshApplications` prop chains on these components;
  `useMigrationInventoryRefresh`; related `key`-remount hacks.
- **Acceptance:** filtering, paging, labeling, and toggling exclusion update the
  table, filter options, and inventory-derived counts together, with no callback
  props and no divergence.
- **Test:** an exclusion mutation refetches both the VM list and the inventory
  count from one invalidation (regression lock, mirrors the group-header test).

### WP-4 — Report comparison  ·  size M · risk low
- **Files:** `pages/ReportComparison/*` (`ReportComparisonPage`,
  `ReportComparisonView`, `ComparisonDetailsDrawer`, headers).
- **Endpoints:** new `store/api/comparisonEndpoints.ts` — `listCollections`,
  `compareCollections`, `compareCollectionsDiff`, `exportCollection`,
  `exportCollectionRaw` (mostly read-only).
- **Tags:** add `"Collections"`; `listCollections` provides it.
- **Acceptance:** comparison views load and re-run from cache; no local
  server-state `useState`.

### WP-5 — Storage offload estimator  ·  size S · risk low
- **Files:** `pages/StorageOffloadEstimator/*`, `utils/useForecasterPolling.ts`.
- **Approach:** model the forecaster as a query with RTK Query polling
  (`pollingInterval`) replacing `useForecasterPolling`; stop polling via
  `skip`/refetch control when the benchmark is ready.
- **Acceptance:** polling behavior preserved; `useForecasterPolling` removed or
  reduced to a thin selector.

### WP-6 — Collection & inspection lifecycle + AgentStatus  ·  size M/L · risk HIGH
> Do this **last** among feature packages — it is the only state-machine-shaped
> work; everything else should already read from the store before you touch it.
- **Files:** `common/report/ReportsContext.tsx` (135),
  `common/AgentStatusContext.tsx` (96), collection/inspection consumers.
- **Endpoints:** new `store/api/lifecycleEndpoints.ts` — `getAgentStatus`,
  `listCollections`, `getCollectorStatus`, `getInspectorStatus` (queries, with
  `pollingInterval` where the pub/sub currently polls); `startCollector`,
  `stopCollector`, `setAgentMode`, `startInspection`, `stopInspection`,
  `cancelVirtualMachineInspection`, `putInspectorVddk` (mutations).
- **App mode:** no `appModeSlice` — nav modes
  (`connected`/`disconnected`/`rvtool`) are read directly from the cached
  `getAgentStatus` response via `useAgentStatus` (`agentStatus.mode`). All
  callers share the one cache entry, so mode cannot diverge; a separate slice
  would just be a second copy to keep in sync.
- **Replace:** the `ReportsContext` listener `Set`/pub/sub with tag
  invalidation; any migrated page bridging via `util.invalidateTags` now reads
  the cache directly. Retire `AgentStatusContext` once nothing consumes it.
- **Acceptance:** collection completion, mode changes, and inspection lifecycle
  propagate through the cache; no pub/sub bus; nav modes read from the cached
  `getAgentStatus` response (`agentStatus.mode`).
- **Risk note:** verify polling cadence and terminal-state transitions carefully;
  add tests for start → in-progress → complete driving a dependent query
  refetch.

### WP-7 — Final cleanup (kill the old machinery)  ·  size M · risk medium
> Only when **no** `useInjection` remains and every domain reads from the store.
- **Remove from agent-ui:** `useInjection`, `Symbols.AgentApi`, and the
  `DependencyInjectionProvider` from `Root.tsx`. The SDK client becomes the
  `getAgentApiClient()` module singleton, reached via the store `extraArgument`
  (RTK Query) plus a handful of direct imports for imperative one-offs. (Leave
  `packages/ioc` in the monorepo — other projects still depend on it; this
  cleanup only stops **agent-ui** from using it.)
- **Remove:** any remaining `onRefresh*`/`onCompleted` props, `key`-remount
  hacks, and dead helpers.
- **Imperative one-off SDK calls that survive** (not modeled as an endpoint)
  import the `getAgentApiClient()` singleton directly — **not** a revived IoC
  package.
- **Acceptance:** `grep -r "useInjection\|Symbols.AgentApi"` in
  `apps/agent-ui/src` returns nothing; app builds and all tests pass.

---

## 9. Verification (run for every package before stopping)

```bash
# From repo root:
yarn workspace @openshift-migration-advisor/agent-ui run test     # Vitest
yarn workspace @openshift-migration-advisor/agent-ui run check    # Biome lint (check:fix to autofix)
yarn workspace @openshift-migration-advisor/agent-ui run build    # tsc -b + vite build (type-check)
```

- There is **no** standalone `typecheck` script and **no** root `tsconfig.json`;
  use the workspace `build` for type-checking (do not run `tsc -b` from root).
- Manual repro (needs a backend): `yarn workspace @openshift-migration-advisor/agent-ui run start`
  (serves 127.0.0.1:3001). Document the manual steps in the PR; store-level tests
  are the automated substitute.

---

## 10. Hard rules (violations = redo)

1. **One `createApi` / one cache.** Never add a second.
2. **Never break the app between packages.** Old and new coexist; migrate a
   domain fully or not at all.
3. **Reuse the shared SDK client** — via `extraArgument` in RTK Query, or the
   `getAgentApiClient()` singleton for imperative one-offs. No new `fetch`, no
   `fetchBaseQuery`, no **second** client.
4. **Server data → RTK Query. Client-only data → a slice.** Never store server
   responses in a slice or in `useState`.
5. **Every derived count/list reads from a cache entry.** If two values can
   diverge, they must share a tag. Add a regression test proving they update
   together.
6. **No `any`; types from the SDK.** Biome must pass clean.
7. **Do one work package per change**, with tests, then stop and report.
```
