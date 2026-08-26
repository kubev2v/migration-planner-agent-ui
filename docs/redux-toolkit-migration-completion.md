# Redux Toolkit Migration — Completion Playbook (Agent UI)

> **Audience: an AI agent finishing the migration one work package at a time.**
> This document is self-contained but assumes the conventions in
> [redux-toolkit-migration.md](redux-toolkit-migration.md) (the original playbook) still hold. Read
> its **§3 golden recipe**, **§4 conventions**, **§9 verification**, and **§10 hard rules** first,
> then pick **one** work package below, complete it end-to-end (code + tests + verification), and
> stop. Do not start a second package in the same change.

The feature migration (WP-1…WP-7 in the original playbook) is ~80% landed. This document closes the
loose ends surfaced by the code review ([rtk-migration-review.md](rtk-migration-review.md) §6). Each
package is independently shippable and leaves the app working.

---

## 0. Hard rules (inherited — violations = redo)

1. **One `createApi` / one cache.** Never add a second. New reads → `build.query`; new writes →
   `build.mutation`; both via `agentApiSlice.injectEndpoints` in a per-domain `store/api/*Endpoints.ts`.
2. **RTK Query owns the cache. We do not.** No hand-rolled TTL caches, `WeakMap`s, request-id refs,
   `cancelled`-flag effects, or `key`-remount hacks for server data. If you find one, it is a bug to
   remove, not a pattern to preserve.
3. **Reuse the SDK client via `extraArgument` / the `(sdk) => Promise<T>` baseQuery.** No new `fetch`,
   no `fetchBaseQuery`, no second client.
4. **Server data → RTK Query. Client-only data → a slice.** Never store server responses in a slice
   or `useState`. Never store non-serializable values (functions) in a slice.
5. **Every derived count/list reads from a cache entry.** If two values can diverge, they must share
   a tag. Add a regression test proving they update together.
6. **No `any`; types from `@openshift-migration-advisor/agent-sdk`. Biome must pass clean.**
7. **One work package per change**, with tests, then stop and report.

### Verification (run before stopping, every package)

```bash
yarn workspace @openshift-migration-advisor/agent-ui run test     # Vitest
yarn workspace @openshift-migration-advisor/agent-ui run check    # Biome (check:fix to autofix)
yarn workspace @openshift-migration-advisor/agent-ui run build    # tsc -b + vite build (type-check)
```

There is no standalone `typecheck` and no root `tsconfig.json`; use `build` for type-checking.

---

## Work packages (do in order, one at a time)

### CWP-1 — Kill the WeakMap group cache (RTK Query owns the cache) · size M · risk medium · **do first**

**Problem.** `pages/Groups/utils/groupList.ts` still hand-rolls a 30s-TTL `WeakMap` cache
(`groupListCache`, `fetchAllGroups`, `invalidateAllGroupsCache`). Meanwhile the group **mutations**
already invalidate the RTK `Group:LIST` tag and no longer call `invalidateAllGroupsCache`. Result:
two caches for the same data. For up to 30s after a create/delete, any picker that reads the
WeakMap-cached list (`AddToGroupModal`, `RemoveFromGroupModal`) can show a stale/ghost group — the
exact divergence bug this migration exists to eliminate. **The cache must be RTK Query's, not ours.**

**Endpoint — add to `store/api/groupsEndpoints.ts`.** "All groups across all pages" as one query:

```ts
// Reuses the SDK paging loop; RTK Query provides the caching + in-flight dedup the WeakMap did.
getAllGroups: build.query<Group[], { byName?: string } | void>({
  query: (arg) => (sdk) => fetchAllGroupsPages(sdk, { byName: arg?.byName }),
  providesTags: (result) => [
    { type: "Group", id: "LIST" },
    ...(result ?? []).map((g) => ({ type: "Group" as const, id: g.id })),
  ],
}),
```

Export `useGetAllGroupsQuery`. Because it provides `Group:LIST`, every existing group
create/delete/rename/membership mutation already invalidates it — no new invalidation wiring needed.

**Refactor `groupList.ts`.** Keep only the pure paging loop, uncached:
- Rename `fetchAllGroupsUncached` → **`fetchAllGroupsPages(sdk, options?)`** and export it (for use
  inside other query functions — see below).
- **Delete:** `groupListCache` (the `WeakMap`), `invalidateAllGroupsCache`, the cached `fetchAllGroups`
  wrapper, `GroupListCacheEntry`, `GROUP_LIST_CACHE_TTL_MS`.
- `GroupListAgentApi = Pick<DefaultApiInterface, "listLatestGroups">` may stay, or accept the full
  `AgentApiClient` for consistency with the baseQuery `sdk` type — pick whichever keeps types clean.

**Migrate the consumers** (all current `fetchAllGroups` / `invalidateAllGroupsCache` / duplicated
pager call sites):

| File | Now | Change to |
|---|---|---|
| `pages/Groups/components/modals/AddToGroupModal.tsx` | `await fetchAllGroups(agentApi)` in effect | `useGetAllGroupsQuery()` hook; drop the manual fetch + loading state |
| `pages/Groups/components/modals/RemoveFromGroupModal.tsx` | `await fetchAllGroups(agentApi)` in effect | `useGetAllGroupsQuery()` hook |
| `pages/Groups/GroupsPage.tsx` | local **duplicated** `fetchAllGroupsPaged` (lines ~64-82) + manual enrichment | delete `fetchAllGroupsPaged`; source the raw list from `useGetAllGroupsQuery()` (keep the per-group enrichment for now unless CWP-1b below is folded in) |
| `pages/VirtualMachinesOverview/components/VirtualMachinesTab/vmFilterOptions.ts` | `fetchAllGroups(agentApi)` inside `fetchVmTableFilterOptions` | `fetchAllGroupsPages(sdk)` — this runs **inside** the `getVMFilterOptions` query, which is itself cached + invalidated by `Group:LIST`, so uncached paging here is correct |
| `pages/Groups/utils/vmGroupMembership.ts` | `fetchAllGroups(agentApi)` (line ~40) | trace its caller: if it runs inside an RTK query/util path use `fetchAllGroupsPages(sdk)`; if it's a React consumer, feed it the `useGetAllGroupsQuery` result instead |
| `pages/VirtualMachinesOverview/components/VirtualMachinesTab/VirtualMachinesView.tsx` (`handleGroupsChanged`, ~line 407) | `invalidateAllGroupsCache(agentApi)` then `refreshAfterGroupChange()` | **delete** the `invalidateAllGroupsCache` call — `refreshAfterGroupChange()` already dispatches the `Group:LIST` tag invalidation |
| `pages/VirtualMachinesOverview/components/ApplicationsTab/ApplicationsView.tsx` (`handleGroupsChanged`, ~line 137) | `invalidateAllGroupsCache(agentApi)` then `refreshDrawerData()` | **delete** the `invalidateAllGroupsCache` call — `refreshDrawerData()` already invalidates `Group:LIST` |

> Note: some picker modals still call `agentApi` directly via `getAgentApiClient()`. Where you swap to
> `useGetAllGroupsQuery`, remove the now-unused direct client import if nothing else in the file uses it.

**Tests.**
- Replace `pages/Groups/utils/groupList.test.ts` (which currently tests the WeakMap TTL/dedup) with a
  test of `fetchAllGroupsPages` covering multi-page accumulation and `byName` pass-through. Delete the
  cache/`invalidateAllGroupsCache` test cases — that behavior no longer exists.
- Add a `getAllGroups` case to `groupsEndpoints.test.ts`: it provides `Group:LIST`, and a `createGroup`
  / `deleteGroup` invalidation makes it refetch (real store + fake SDK, per the original playbook §4).

**Acceptance.**
- `grep -rn "WeakMap\|invalidateAllGroupsCache\|groupListCache\|fetchAllGroupsPaged\|GROUP_LIST_CACHE_TTL_MS" apps/agent-ui/src`
  returns **nothing**.
- Creating/deleting a group is reflected immediately in the Add/Remove pickers and the groups list —
  no 30s staleness window.
- `fetchAllGroups` (the cached wrapper) no longer exists; only `fetchAllGroupsPages` remains.
- All three verification commands pass.

---

### CWP-1b — (optional, fold into CWP-1 or a follow-up) GroupsPage enrichment · size S

`GroupsPage` still enriches each group (VM count + labels) with an N+1 `getLatestGroup` loop in a
manual `useEffect`/`useState`. If the SDK exposes counts on `listLatestGroups`/`getAllGroups`
directly, drop the enrichment and read from the query. If it does not, leave the enrichment but make
sure it consumes `useGetAllGroupsQuery` (from CWP-1) rather than any bespoke pager. Do **not** add a
new manual cache.

---

### CWP-2 — Resolve the inventory eventual-consistency path (correctness) · size S/M · risk medium

**Problem.** `useMigrationInventoryRefresh` (deleted) polled inventory up to 8 times with backoff
until the server total matched the expected value, to defend against read-after-write lag. The new
`setVMExclusion.onQueryStarted` ([vmsEndpoints.ts:219](../apps/agent-ui/src/store/api/vmsEndpoints.ts#L219))
does an optimistic patch + a single invalidation-driven refetch. If the backend lags, that refetch can
overwrite the correct optimistic total with a stale value. The old reconciliation helpers
(`fetchInventoryAfterMigrationChange`, `resolveInventoryAfterMigrationChange`,
`getExpectedInventoryTotal` in `pages/VirtualMachinesOverview/inventoryParsing.ts`) are now **dead
code** (no production caller; only `inventoryParsing.test.ts` references them).

**Decide, don't guess.** First establish whether the lag is real (check the backend behavior for
`batchUpdateLatestVMExclusion` → `getLatestInventory`, or ask the team). Then pick one:

- **Option A — accept the single refetch (preferred if no lag evidence).** Delete the three dead
  functions from `inventoryParsing.ts` and their tests from `inventoryParsing.test.ts`. Keep the
  optimistic patch as-is. Document in the PR that the reconciliation loop was intentionally dropped
  because the backend is read-after-write consistent.
- **Option B — restore reconciliation.** Inside `setVMExclusion.onQueryStarted`, after
  `await queryFulfilled`, reconcile `getInventory` toward the expected total using the existing pure
  helpers (a short bounded poll or a `updateQueryData` settle), instead of relying on the tag
  invalidation alone. Keep it inside the endpoint — do **not** reintroduce a component hook.

**Acceptance.** No unreferenced exports remain in `inventoryParsing.ts` (`grep` the three names —
production callers = 0 means delete or wire in). The chosen behavior is covered by a test and stated
in the PR description.

---

### CWP-3 — Centralize the group-change invalidation tag set · size S · risk low

**Problem.** "What a group change invalidates" is encoded twice: `groupInvalidationTags(groupId)` in
[vmsEndpoints.ts:77](../apps/agent-ui/src/store/api/vmsEndpoints.ts#L77) and
`refreshAfterGroupChange` inside `VirtualMachinesView.tsx`. Two sources of truth drift.

**Fix.** Export one helper (e.g. `groupChangeTags(groupId?)`) from a shared module under `store/api/`
(or `store/tags.ts`) returning the canonical tag list. Use it in both the endpoint's `invalidatesTags`
and the view's `dispatch(agentApiSlice.util.invalidateTags(groupChangeTags(groupId)))`. Prefer moving
the imperative invalidation *out* of the leaf component entirely if the triggering write can be a
mutation that owns its `invalidatesTags`.

**Acceptance.** One exported definition of the group-change tag set; no duplicated tag arrays. Grep
shows a single source.

---

### CWP-4 — Fix the credentials module-ref callback smell · size S · risk low

**Problem.** `credentials/useCredentialsModal.ts` stores the post-connect success callback in a
**module-level `let pendingSuccessCallback`** — hidden mutable global that only works because there is
exactly one credentials modal, and it splits the modal's state across Redux (open flag) + a module
global (callback). Functions are non-serializable, so they can't live in the slice — but a module
`let` is the least safe fix.

**Fix (pick one).**
- **Component-owned `useRef` (preferred).** Have the single component that renders the credentials
  modal own a `useRef<(() => void) | null>` for the callback; expose set/take via that component or a
  tiny hook scoped to it. The open/close flag stays in `credentialsUiSlice`.
- **Tiny dedicated context.** A `CredentialsModalController` context providing `open(onSuccess?)` /
  `close()` and holding the callback in a ref. Keeps everything in the React lifecycle.

Either way: no module-level mutable state; callback resets on unmount; testable without reaching into
module internals.

**Acceptance.** `grep -rn "pendingSuccessCallback\|takePendingSuccess" apps/agent-ui/src` returns
nothing (or only the new scoped implementation). Connect → post-connect callback still fires exactly
once.

---

### CWP-5 — Remove the remaining `key`-remount hack · size XS · risk low

**Problem.** `ApplicationsView.tsx` still forces a drawer refresh via a `drawerRefreshKey` counter and
`key={...:${drawerRefreshKey}}` remount ([ApplicationsView.tsx:99,281](../apps/agent-ui/src/pages/VirtualMachinesOverview/components/ApplicationsTab/ApplicationsView.tsx#L99)).
Remount-to-refresh is the anti-pattern the migration set out to remove.

**Fix.** The drawer's data should come from a query (or already-cached data) that re-renders on tag
invalidation. Confirm the drawer reads from `useGetApplicationsQuery` / the relevant cache entry, then
delete `drawerRefreshKey`, its `setDrawerRefreshKey` calls, and the `key` suffix. If the drawer holds
any server data in local `useState`, move it to the query first.

**Acceptance.** `grep -rn "drawerRefreshKey" apps/agent-ui/src` returns nothing; opening the drawer
after a group/label change shows fresh data without a forced remount.

---

### CWP-6 — Documentation & accuracy cleanup · size XS · risk none

- Update the comment in `api/agentApiClient.ts` and the original playbook's §2/§7 to state accurately:
  the SDK client is a **module singleton** with two access paths — the store `extraArgument`
  (all RTK Query endpoints) **and** ~11 direct `getAgentApiClient()` imports for imperative one-offs
  (exports, blob downloads, auth probe, paged loops). It is not literally "the store is the single
  source."
- Note that the planned `appModeSlice` was intentionally **not** built — `useAgentStatus` reads mode
  from the cached `getAgentStatus` response. Remove the `appModeSlice` references from the original
  playbook so doc and code don't drift.

**Acceptance.** Docs match the code; no references to a non-existent `appModeSlice`.

---

## Explicitly out of scope (do not touch as part of this cleanup)

- The **inspection-polling state machine** in `VirtualMachinesView.tsx`
  (`seenRunningRef`/`pollTicksRef`/`MIN_POLL_TICKS`/`MAX_POLL_TICKS`) — inherently stateful; not a
  cache concern. Leave it unless a dedicated ticket asks for it.
- `UseCredentialViewModel.ts`'s own collector `setInterval` — unrelated to the RTK migration.
- Any change that would introduce a **second `createApi`** or a hand-rolled cache. If you feel the
  need, re-read rule #2.

---

## Suggested order & sizing

| # | Package | Size | Risk | Why this order |
|---|---------|------|------|----------------|
| CWP-1 | Kill the WeakMap group cache | M | med | Closes a live divergence window; the explicit priority |
| CWP-2 | Inventory consistency + dead code | S/M | med | Only correctness item; resolve before merge |
| CWP-3 | Centralize group-change tags | S | low | Removes a drift source touched by CWP-1 |
| CWP-4 | Credentials module-ref | S | low | Contained smell |
| CWP-5 | Drop `drawerRefreshKey` remount | XS | low | Last remount hack |
| CWP-6 | Docs accuracy | XS | none | Finish honest |

Complete **one**, run all three verification commands, then stop and report what changed, which
acceptance greps are now empty, and any decision made (especially the CWP-2 A/B choice).
</content>
