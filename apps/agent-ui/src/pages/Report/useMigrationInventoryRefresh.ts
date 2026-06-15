import type {
  DefaultApiInterface,
  Inventory,
  VirtualMachine,
} from "@openshift-migration-advisor/agent-sdk";
import { useCallback, useRef } from "react";
import { getAgentApiBasePath } from "./agentApiConfig";
import {
  adjustInventoryForMigrationExcludedChange,
  fetchInventoryAfterMigrationChange,
  fetchInventoryFromApi,
  getInventoryAggregateView,
  type MigrationExcludedInventoryChange,
} from "./inventoryParsing";

type UseMigrationInventoryRefreshOptions = {
  agentApi: DefaultApiInterface;
  groupId?: string;
  setInventory: React.Dispatch<React.SetStateAction<Inventory | null>>;
  setVmsList: React.Dispatch<React.SetStateAction<VirtualMachine[]>>;
  onInventoryRevisionBump?: () => void;
};

function createSerialQueue() {
  let chain: Promise<void> = Promise.resolve();

  return <T>(task: () => Promise<T>): Promise<T> => {
    const next = chain.then(task, task);
    chain = next.then(
      () => undefined,
      () => undefined,
    );
    return next;
  };
}

export function useMigrationInventoryRefresh({
  agentApi,
  groupId,
  setInventory,
  setVmsList,
  onInventoryRevisionBump,
}: UseMigrationInventoryRefreshOptions) {
  const enqueueRef = useRef(createSerialQueue());
  const pendingMigrationUpdatesRef = useRef(0);

  const refreshInventory = useCallback(
    async (change: MigrationExcludedInventoryChange): Promise<void> => {
      pendingMigrationUpdatesRef.current += 1;

      try {
        await enqueueRef.current(async () => {
          try {
            setVmsList((current) =>
              current.map((vm) =>
                change.vmIds.includes(vm.id)
                  ? { ...vm, migrationExcluded: change.excluded }
                  : vm,
              ),
            );

            let previousTotal: number | undefined;
            let optimisticInventory: Inventory | null = null;

            setInventory((current) => {
              if (!current) {
                return current;
              }
              previousTotal = getInventoryAggregateView(current).vms?.total;
              optimisticInventory = adjustInventoryForMigrationExcludedChange(
                current,
                change.vmIds,
                change.excluded,
                change.affectedVms,
              );
              return optimisticInventory;
            });

            if (optimisticInventory) {
              onInventoryRevisionBump?.();
            }

            const basePath = getAgentApiBasePath(agentApi);
            const resolved = await fetchInventoryAfterMigrationChange(
              basePath,
              change,
              previousTotal,
              optimisticInventory,
              groupId ? { groupId } : undefined,
            );

            if (resolved) {
              setInventory((current) => resolved ?? current);
              onInventoryRevisionBump?.();
            }
          } catch (err) {
            console.error(
              "Error refreshing inventory after migration change:",
              err,
            );
          }
        });
      } finally {
        pendingMigrationUpdatesRef.current -= 1;
      }
    },
    [agentApi, groupId, onInventoryRevisionBump, setInventory, setVmsList],
  );

  const reloadAssessmentInventory = useCallback(async () => {
    if (pendingMigrationUpdatesRef.current > 0) {
      return;
    }

    try {
      const basePath = getAgentApiBasePath(agentApi);
      const fetchedInventory = await fetchInventoryFromApi(
        basePath,
        groupId ? { groupId } : undefined,
      );
      if (fetchedInventory) {
        setInventory(fetchedInventory);
        onInventoryRevisionBump?.();
      }
    } catch (err) {
      console.error("Error reloading assessment inventory:", err);
    }
  }, [agentApi, groupId, onInventoryRevisionBump, setInventory]);

  return { refreshInventory, reloadAssessmentInventory };
}
