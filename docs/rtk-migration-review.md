# Agent UI — Redux Toolkit / RTK Query Migration: Code Review

> Review of branch `ECOPROJECT-5400` vs `main`.
> Scope: 85 files, +4,373 / −3,043, 12 commits.
> Companion to [redux-toolkit-migration.md](redux-toolkit-migration.md) (the playbook) and
> [redux-toolkit-migration-completion.md](redux-toolkit-migration-completion.md) (the follow-up work).

This is one change with one thesis: **move all server state and cross-component sync off ad-hoc
mechanisms (React Contexts holding data, ~90 refresh callbacks, a pub/sub bus, a WeakMap cache,
`key`-remount hacks, an IoC container) onto a single RTK Query cache with tag-based invalidation,
plus slices for pure client state.**

---

## 1. The motivating bug (why this exists)

A group's **header count** stayed stale while its **VM table** updated. Both derived from separate
`useState`, hand-synced by callbacks — when one path forgot to update, they diverged.

The fix isn't "sync harder." It's: **every derived count/list reads from one cache entry,
invalidated by shared tags.** Divergence becomes *structurally impossible*, not fixed-once.

---

## 2. Before → After at a glance

| Mechanism (main) | Replaced by (HEAD) |
|---|---|
| `packages/ioc` + `useInjection(Symbols.AgentApi)` — **34 sites** | `getAgentApiClient()` singleton + store `extraArgument` — **0 `useInjection`** |
| `ReportsContext` pub/sub (135 LOC) | `startCollection` thunk + `collectionLifecycleSlice` + listener middleware |
| `AgentStatusContext` (96 LOC) | `getAgentStatus` query + `useAgentStatus` hook |
| `CredentialsContext` god-object (264 LOC) | `credentialsEndpoints` + `credentialsUiSlice` + `useCapability`/`useCredentialsModal` |
| `useReports` (347), `useMigrationInventoryRefresh` (143), `useApplicationsData` (74) | RTK Query endpoints + `onQueryStarted` optimistic patches |
| ~91 callback props (`onRefreshVMs` ×26, `onRefreshFilterOptions` ×22, `onCompleted` ×28, …) | tag invalidation |
| WeakMap group cache + `key`-remount hacks | shared cache entries + tag invalidation *(partially — see §6)* |

**Callback web collapse:** `onRefresh*` **63 → 1**, `onCompleted` **28 → 0**, `useInjection` **34 → 0**.

**Dependency swap:** dropped in-house `@openshift-migration-advisor/ioc`; added
`@reduxjs/toolkit ^2.12` + `react-redux ^9.3`.

---

## 3. The new architecture

```
                       getAgentApiClient()  ← single SDK client (module singleton)
                                │
                                ▼  passed as extraArgument
        ┌──────────────────────────────────────────────────────────┐
        │                     Redux store                            │
        │                                                            │
        │  agentApiSlice  ── ONE createApi, ONE cache, ONE tag set   │
        │    baseQuery = sdkBaseQuery: (sdk)=>Promise<T>             │
        │    injectEndpoints per domain:                             │
        │      groups · vms · comparison · credentials ·            │
        │      forecaster · lifecycle                                │
        │    tags: Group GroupVms GroupInventory Vms Inventory       │
        │          VmLabels Credentials Collections Forecaster       │
        │          AgentStatus CollectorStatus InspectorStatus       │
        │                                                            │
        │  slices (client-only state):                               │
        │      collectionLifecycle   credentialsUi                   │
        │                                                            │
        │  listenerMiddleware (side effects):                        │
        │      collectionLifecycleListeners  (poll → settle)         │
        │      vmsInvalidationListeners      (completion → invalidate)│
        └──────────────────────────────────────────────────────────┘
                                │
                    components use generated hooks
              useGetVMsQuery / useSetVMExclusionMutation / …
```

Key design decisions — all sound:

- **`sdkBaseQuery` wraps the SDK, not `fetch`** ([baseQuery.ts:49](../apps/agent-ui/src/store/baseQuery.ts#L49)).
  A query arg is a callback `(sdk) => Promise<T>`, so auth, base path, `cache:"no-store"` and the
  raw-fetch inventory workaround are preserved. `ResponseError` is routed through `parseApiError`, so
  RTK Query consumers get the *same* detailed server-body messages — no loss of error quality.
- **One `createApi`** ([agentApiSlice.ts:28](../apps/agent-ui/src/store/api/agentApiSlice.ts#L28)) —
  the non-negotiable that makes cross-domain invalidation work.
- **The lifecycle state machine is a listener, not a Context**
  ([collectionLifecycleListeners.ts](../apps/agent-ui/src/store/listeners/collectionLifecycleListeners.ts)):
  `startCollection` thunk kicks off; the listener polls to a terminal state, then
  `waitForNewerCollection` before declaring success, with `TaskAbortError` cancellation when a newer
  run supersedes. On `collectionSucceeded` a separate listener invalidates
  `Vms/VmLabels/Inventory/Collections`.
- **Clean server/client-state split.** Server data → RTK Query. Client-only flags → slices; the
  slices hold no server responses.

**Tag design is the real craftsmanship.** `getVMFilterOptions` deliberately does **not** share
`Vms:LIST` ([vmsEndpoints.ts:127](../apps/agent-ui/src/store/api/vmsEndpoints.ts#L127)) so the 5s
inspection poll doesn't refetch dropdowns every tick — an efficiency win the old poll callback
lacked.

---

## 4. Domain-by-domain

### Groups — *the reference implementation*
- **[GroupDetailPage.tsx](../apps/agent-ui/src/pages/Groups/GroupDetailPage.tsx): 691 → 536.**
  Deleted ~11 server-data `useState`, 2 request-id `useRef` guards, 4 fetch effects, ~6 refresh
  callbacks — replaced by 4 query hooks + `skip` guards. Cleanest file in the change.
- **[groupsEndpoints.ts](../apps/agent-ui/src/store/api/groupsEndpoints.ts) + test:**
  `changeGroupMembership` invalidates all four group tags → header count and table cannot diverge, and
  a regression test simulating a 7→5 membership change locks it.
- **[GroupsPage.tsx](../apps/agent-ui/src/pages/Groups/GroupsPage.tsx): 244 → 261 (grew).** Hybrid —
  still does N+1 `getLatestGroup` enrichment in a manual effect and added a duplicated pager.

### VMs Overview — *the core, biggest win*
- **[VirtualMachinesOverviewPage.tsx](../apps/agent-ui/src/pages/VirtualMachinesOverview/VirtualMachinesOverviewPage.tsx): 699 → 508.** 15→7 `useState`, 6→2 `useEffect`, both race-guard refs gone.
- **[VirtualMachinesView.tsx](../apps/agent-ui/src/pages/VirtualMachinesOverview/components/VirtualMachinesTab/VirtualMachinesView.tsx): 910 → 787.** A ~90-line exclusion helper collapses to a mutation; optimistic math moved into `onQueryStarted`.
- **[VMDetailsPage.tsx](../apps/agent-ui/src/pages/VirtualMachinesOverview/components/VirtualMachinesTab/VMDetailsPage.tsx): 1002 → 941.** Best ratio: 7→1 `useState`, both cancellation guards gone.
- **Deleted:** `useMigrationInventoryRefresh` (143), `useApplicationsData` (74). Domain `onRefresh*`: **62 → 0.**

### Report Comparison — *clean win*
- **[ReportComparisonPage.tsx](../apps/agent-ui/src/pages/ReportComparison/ReportComparisonPage.tsx): 261 → 201**,
  **[ComparisonDetailsDrawer.tsx](../apps/agent-ui/src/pages/ReportComparison/ComparisonDetailsDrawer.tsx): 410 → 326.**
  ~11 server-state `useState` → 0; two race-prone fetch effects deleted. (~37 of the drawer's
  reduction is relocation into the API layer, not deletion.)

### Credentials — *best structural win, one smell*
- **[CredentialsContext.tsx](../apps/agent-ui/src/credentials/CredentialsContext.tsx): 264 → deleted.**
  God-object split four ways: endpoints (server state), `credentialsUiSlice` (modal flag),
  `useCapability`, `useCredentialsModal`. Status + capabilities share one tag — can't diverge.

### Storage Offload — *the weakest domain*
- **[useForecasterPolling.ts](../apps/agent-ui/src/pages/StorageOffloadEstimator/utils/useForecasterPolling.ts): 143 → 186 (grew +43).**
  Only the `setInterval` timer moved to RTK Query `pollingInterval`; the epoch/`wasRunning`/dedup
  state machine survived *and* gained reactive↔imperative bridging refs.

---

## 5. Did we actually gain something? — Yes, but be precise about *what*

**Genuine wins (not relabeling):**
1. **A whole bug class is now structurally impossible.** Counts that share a tag refetch together.
   The headline, and it's real and tested.
2. **Massive decoupling.** ~91 refresh props → ~0. Parents no longer thread refresh functions down;
   children no longer know *who* to notify.
3. **Three god-Contexts and three hand-rolled data hooks deleted** (~1,060 LOC), plus the whole IoC
   package.
4. **Server-state `useState`, manual cancellation, and request-id race guards are gone** across the
   migrated pages — RTK Query owns latest-wins, dedup, loading/error.
5. **Test coverage jumped:** 9 new test files (~1,000 LOC) — domains that had no tests (credentials,
   comparison) now do.
6. **Bespoke → standard:** an in-house IoC container replaced by maintained libraries.

**Honest framing of the "wins" that are actually redistribution:**
- **Production LOC is roughly flat** (+2,532 new `store/` − 1,194 deleted machinery, much of the
  +2,532 being tests + the 379-line doc). The gain is **distribution and testability**, not raw size.
- **Coupling changed shape, it didn't vanish.** Callback-prop coupling became **tag coupling** —
  "action at a distance." Newcomers must learn the tag graph to predict what a mutation refetches
  (mitigated by requiring the mutation→tags→queries graph in PRs).
- Leaf components (`VirtualMachinesView`, `ApplicationsView`) now import `agentApiSlice` and dispatch
  raw `invalidateTags`, and the group-change tag set is encoded in **two** places. Cache-topology
  knowledge leaked out of the endpoints layer.

---

## 6. Critical findings — loose ends (see the completion playbook for fixes)

Ordered by importance. None sink the refactor; all deserve a follow-up.

1. **⚠️ Possible behavioral regression: lost eventual-consistency retry on VM exclusion.**
   `useMigrationInventoryRefresh` had an 8-attempt/backoff loop that polled until the server's
   inventory total matched the expected value (read-after-write lag defense). The new flow does a
   single invalidation-driven refetch. **Confirmed dead code:** `fetchInventoryAfterMigrationChange` /
   `resolveInventoryAfterMigrationChange` / `getExpectedInventoryTotal` in `inventoryParsing.ts` have
   no production callers. Delete-or-restore, consciously.
2. **⚠️ Transitional staleness window (the exact bug class this set out to kill).** The WeakMap group
   cache (`invalidateAllGroupsCache`, 30s TTL) is still live — consumed by
   [VirtualMachinesView.tsx:409](../apps/agent-ui/src/pages/VirtualMachinesOverview/components/VirtualMachinesTab/VirtualMachinesView.tsx#L409)
   and [ApplicationsView.tsx:138](../apps/agent-ui/src/pages/VirtualMachinesOverview/components/ApplicationsTab/ApplicationsView.tsx#L138).
   The group modals dropped it for the `Group:LIST` tag, so the pickers (still WeakMap-cached) can
   show a stale/ghost group for up to 30s after a create/delete.
3. **Module-level mutable callback in [useCredentialsModal.ts](../apps/agent-ui/src/credentials/useCredentialsModal.ts).**
   The post-connect callback lives in a module `let` — hidden global singleton, relies on an unstated
   "exactly one credentials modal" invariant, splits modal state across Redux + a module global.
4. **"Store is the single source of the SDK client" is aspirational.** `getAgentApiClient()` is
   imported directly in 11 non-store files. Fine, but the doc oversells it — it's a module singleton
   with two access paths.
5. **Leftover hacks:** `drawerRefreshKey` `key`-remount survives in
   [ApplicationsView.tsx:281](../apps/agent-ui/src/pages/VirtualMachinesOverview/components/ApplicationsTab/ApplicationsView.tsx#L281);
   the inspection-polling state machine and `UseCredentialViewModel`'s own `setInterval` were carried
   over verbatim (inherently stateful — reasonable to leave).
6. **Plan deviation:** the playbook's `appModeSlice` was never built — `useAgentStatus` reads mode
   from the cached status. A good pragmatic call; note it so doc and code don't drift.

---

## 7. Bottom line

This refactor trades a hand-maintained web of contexts, ~90 refresh callbacks, and an IoC container
for **one RTK Query cache with tag-based invalidation**. The central payoff is real and provable:
**the class of bug where two derived counts drift out of sync is now structurally impossible**, and
it's locked with regression tests. Feature pages got materially smaller and simpler, god-object
contexts are gone, and test coverage jumped.

Honest caveats: production LOC is roughly flat — the win is **decoupling, distribution, and
testability**, not raw size — and callback coupling was replaced by **tag coupling**, a new mental
model (the committed playbook is the mitigation). It's ~80% landed; a few incremental leftovers
remain (§6). None are blockers.

**Recommendation:** a strong, well-executed refactor worth completing. Resolve finding #1 (the only
correctness item) before merge; track the rest via the completion playbook.
</content>
</invoke>
