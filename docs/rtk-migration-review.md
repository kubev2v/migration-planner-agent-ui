# Agent UI — Redux Toolkit / RTK Query Migration: Code Review (updated)

> Review of branch `ECOPROJECT-5400` vs `main`.
> Scope: 97 files, +5,203 / −3,616, 18 commits.
> **Update:** all six loose ends from the first review's §6 have been fixed (see §6 below).
> Verified green: `yarn … test` → **296 passing / 51 files**; `yarn … build` (tsc + vite) → OK.
> Companion to [redux-toolkit-migration.md](redux-toolkit-migration.md) (the playbook) and
> [redux-toolkit-migration-completion.md](redux-toolkit-migration-completion.md) (the follow-up, now done).

One change, one thesis: **move all server state and cross-component sync off ad-hoc mechanisms
(React Contexts holding data, ~90 refresh callbacks, a pub/sub bus, a WeakMap cache, `key`-remount
hacks, an IoC container) onto a single RTK Query cache with tag-based invalidation, plus slices for
pure client state.**

---

## 1. The motivating bug (why this exists)

A group's **header count** stayed stale while its **VM table** updated. Both derived from separate
`useState`, hand-synced by callbacks — when one path forgot to update, they diverged.

The fix isn't "sync harder." It's: **every derived count/list reads from one cache entry,
invalidated by shared tags.** Divergence becomes _structurally impossible_, not fixed-once.

---

## 2. Before → After at a glance

| Mechanism (main)                                                                            | Replaced by (HEAD)                                                             |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `packages/ioc` + `useInjection(Symbols.AgentApi)` — **34 sites**                            | `getAgentApiClient()` singleton + store `extraArgument` — **0 `useInjection`** |
| `ReportsContext` pub/sub (135 LOC)                                                          | `startCollection` thunk + `collectionLifecycleSlice` + listener middleware     |
| `AgentStatusContext` (96 LOC)                                                               | `getAgentStatus` query + `useAgentStatus` hook                                 |
| `CredentialsContext` god-object (264 LOC)                                                   | `credentialsEndpoints` + `CredentialsModalController` + `useCapability`        |
| `useReports` (347), `useMigrationInventoryRefresh` (143), `useApplicationsData` (74)        | RTK Query endpoints + `onQueryStarted` optimistic patches                      |
| ~91 callback props (`onRefreshVMs` ×26, `onRefreshFilterOptions` ×22, `onCompleted` ×28, …) | tag invalidation                                                               |
| **WeakMap group cache (30s TTL) + `invalidateAllGroupsCache`**                              | **`getAllGroups` RTK Query endpoint (`Group:LIST` tag)** ✅                    |
| `key`-remount hacks (`drawerRefreshKey`, `inventoryRevision`)                               | shared cache entries + tag invalidation ✅                                     |

**Callback web collapse:** `onRefresh*` **63 → 0**, `onCompleted` **28 → 0**, `useInjection` **34 → 0**.
(The single remaining `useInjection` / `onRefresh` grep hits are a code comment and the
`collectionRefreshKey` substring — no live callback plumbing remains.)

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
        │    groupTags.ts → groupChangeTags(id): one source of truth │
        │                                                            │
        │  slices (client-only state):                               │
        │      collectionLifecycle                                   │
        │                                                            │
        │  listenerMiddleware (side effects):                        │
        │      collectionLifecycleListeners  (poll → settle)         │
        │      vmsInvalidationListeners      (completion → invalidate)│
        └──────────────────────────────────────────────────────────┘
                                │
                    components use generated hooks
              useGetVMsQuery / useSetVMExclusionMutation / …

  Credentials modal state → CredentialsModalController (React context + useRef),
  NOT Redux and NOT a module global.
```

Key design decisions — all sound:

- **`sdkBaseQuery` wraps the SDK, not `fetch`** ([baseQuery.ts:49](../apps/agent-ui/src/store/baseQuery.ts#L49)).
  Query args are `(sdk) => Promise<T>` callbacks, so auth, base path, `cache:"no-store"` and the
  raw-fetch inventory workaround are preserved. `ResponseError` is routed through `parseApiError`, so
  RTK Query consumers get the same detailed server-body messages — no loss of error quality.
- **One `createApi`** ([agentApiSlice.ts:28](../apps/agent-ui/src/store/api/agentApiSlice.ts#L28)) —
  the non-negotiable that makes cross-domain invalidation work.
- **The group-change tag set has a single source of truth** —
  [groupTags.ts](../apps/agent-ui/src/store/api/groupTags.ts): `groupChangeTags(groupId)` is spread by
  the group endpoints, the VM endpoints, _and_ the imperative invalidation in `VirtualMachinesView`.
  No more duplicated tag arrays.
- **The lifecycle state machine is a listener, not a Context**
  ([collectionLifecycleListeners.ts](../apps/agent-ui/src/store/listeners/collectionLifecycleListeners.ts)):
  `startCollection` thunk kicks off; the listener polls to a terminal state, then
  `waitForNewerCollection` before declaring success, with `TaskAbortError` cancellation.
- **Clean server/client-state split.** Server data → RTK Query. Client-only flags → a slice or a
  scoped React ref; neither ever holds a server response.

**Tag design is the real craftsmanship.** `getVMFilterOptions` deliberately does **not** share
`Vms:LIST` ([vmsEndpoints.ts:127](../apps/agent-ui/src/store/api/vmsEndpoints.ts#L127)) so the 5s
inspection poll doesn't refetch dropdowns every tick.

---

## 4. Domain-by-domain

### Groups — _the reference implementation, now fully clean_

- **GroupDetailPage.tsx: 691 → 536.** Deleted ~11 server-data `useState`, 2 request-id `useRef`
  guards, 4 fetch effects, ~6 refresh callbacks — replaced by query hooks + `skip`.
- **groupsEndpoints.ts + test:** `changeGroupMembership` invalidates the full `groupChangeTags` set →
  header count and table cannot diverge; a 7→5 membership regression test locks it.
- **WeakMap eliminated.** `groupList.ts` is now a pure `fetchAllGroupsPages` pager (no cache); the
  "all groups" list is a real `getAllGroups` RTK Query endpoint providing `Group:LIST`. Pickers use
  `useGetAllGroupsQuery`; in-query callers (`vmFilterOptions`, `vmGroupMembership`) use the pager.
  The 30s staleness window is gone.
- **GroupsPage.tsx: N+1 enrichment dropped** (`GroupLabelsCell` deleted, `GroupsTable` simplified) —
  the file that grew in v1 is now smaller and no longer hybrid.

### VMs Overview — _the core, biggest win_

- **VirtualMachinesOverviewPage.tsx: 699 → 508.** 15→7 `useState`, 6→2 `useEffect`, race-guard refs gone.
- **VirtualMachinesView.tsx: 910 → 787.** ~90-line exclusion helper → a mutation; optimistic math in
  `onQueryStarted`. Group-change invalidation now uses the shared `groupChangeTags` helper.
- **VMDetailsPage.tsx: 1002 → 941.** 7→1 `useState`, both cancellation guards gone.
- **Deleted:** `useMigrationInventoryRefresh` (143), `useApplicationsData` (74), and the dead
  reconciliation helpers in `inventoryParsing.ts` (−104). Domain `onRefresh*`: **62 → 0.**

### Report Comparison — _clean win_

- **ReportComparisonPage.tsx: 261 → 201**, **ComparisonDetailsDrawer.tsx: 410 → 326.** ~11
  server-state `useState` → 0; two race-prone fetch effects deleted.

### Credentials — _best structural win_

- **CredentialsContext.tsx (264) deleted.** Server state → `credentialsEndpoints` (status +
  capabilities share one tag). Modal state → **`CredentialsModalController`** (React context + a
  `useRef` for the post-connect callback). The v1 smells — a module-level `let` callback and a
  `credentialsUiSlice` for one boolean — are **both gone**; all modal state now lives in one scoped,
  lifecycle-bound place.

### Storage Offload — _the weakest domain (inherent, not a defect)_

- **useForecasterPolling.ts: 143 → 186.** Only the `setInterval` timer moved to RTK Query
  `pollingInterval`; the epoch/`wasRunning`/dedup state machine is inherently stateful and survived.
  Acceptable — it's not a cache concern and was intentionally left out of the cleanup scope.

---

## 5. Did we actually gain something? — Yes

**Genuine wins (not relabeling):**

1. **A whole bug class is now structurally impossible.** Counts that share a tag refetch together.
   The headline, real and tested.
2. **Massive decoupling.** ~91 refresh props → 0. Parents no longer thread refresh functions;
   children no longer know _who_ to notify.
3. **Three god-Contexts and three hand-rolled data hooks deleted** (~1,060 LOC), plus the whole IoC
   package, plus the WeakMap cache and every `key`-remount hack.
4. **Server-state `useState`, manual cancellation, and request-id race guards are gone** — RTK Query
   owns latest-wins, dedup, loading/error.
5. **Test coverage jumped** to 296 tests / 51 files, including endpoint, listener, slice, thunk and
   tag-helper tests where domains previously had none.
6. **Bespoke → standard:** an in-house IoC container replaced by maintained libraries.

**Honest framing:**

- **Production LOC is roughly flat** — much of the growth is tests + docs. The gain is
  **decoupling, distribution, and testability**, not raw size. Say that plainly.
- **Coupling changed shape.** Callback-prop coupling became **tag coupling** — newcomers must learn
  the tag graph. Mitigated by (a) requiring the mutation→tags→queries graph in PRs, and (b)
  `groupTags.ts` giving the trickiest tag set a single named source of truth.

---

## 6. Bottom line

This refactor trades a hand-maintained web of contexts, ~90 refresh callbacks, an IoC container, a
WeakMap cache and `key`-remount hacks for **one RTK Query cache with tag-based invalidation**. The
central payoff is real and provable: **the class of bug where two derived counts drift out of sync is
now structurally impossible**, locked with regression tests. Feature pages got materially smaller and
simpler, god-object contexts are gone, and test coverage jumped to 296 tests.

All correctness and cleanliness findings from the first pass are resolved; the branch builds and all
tests pass. The honest caveat stands — production LOC is roughly flat and callback coupling became tag
coupling — but that trade buys structural correctness, decoupling and testability, and the trickiest
tag set now has a single named source of truth.

**Recommendation: ready to merge.** Optional one-line follow-up: drop the unused
`collectionRefreshKey` prop.
</content>
