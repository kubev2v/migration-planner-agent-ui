import { agentApiSlice } from "../api/agentApiSlice";
import type { AppStartListening } from "../listenerMiddleware";
import { collectionSucceeded } from "../slices/collectionLifecycleSlice";

/**
 * Caches the VMs domain refetches when a report run completes. A new collection
 * changes the VM list, labels, the fleet inventory and the detected applications;
 * `Collections` is included so the Report comparison page (the other page that
 * can start a run) shows the new entry.
 *
 * This replaces the former central `REPORT_COMPLETED_TAGS` list in
 * `ReportsContext`, which coupled the collection lifecycle to every domain's
 * tags. The VMs domain now owns its own reaction to a finished collection.
 *
 * Note: `Group*` and `AgentStatus` are intentionally NOT invalidated here — the
 * Groups page and agent status refresh on their own navigation/refetch.
 */
const COLLECTION_COMPLETED_TAGS = [
  "Vms",
  "VmLabels",
  "Inventory",
  "Applications",
  "Collections",
] as const;

export function setupVmsInvalidationListeners(
  startAppListening: AppStartListening,
): void {
  startAppListening({
    actionCreator: collectionSucceeded,
    effect: (_action, listenerApi) => {
      listenerApi.dispatch(
        agentApiSlice.util.invalidateTags([...COLLECTION_COMPLETED_TAGS]),
      );
    },
  });
}
