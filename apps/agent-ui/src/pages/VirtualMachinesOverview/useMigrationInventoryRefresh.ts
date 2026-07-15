import type {
  DefaultApiInterface,
  Inventory,
  VirtualMachine,
} from "@openshift-migration-advisor/agent-sdk";
import { useCallback, useRef, useState } from "react";
import { getAgentApiBasePath } from "./agentApiConfig";
import {
  adjustInventoryForMigrationExcludedChange,
  fetchGroupAssessmentInventory,
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
}: UseMigrationInventoryRefreshOptions) {
  const [revision, setRevision] = useState(0);
  const enqueueRef = useRef(createSerialQueue());
  const pendingMigrationUpdatesRef = useRef(0);

  const bumpRevision = useCallback(() => {
    setRevision((current) => current + 1);
  }, []);

  const fetchInventory = useCallback(async (): Promise<Inventory | null> => {
    if (groupId) {
      return fetchGroupAssessmentInventory(agentApi, groupId);
    }
    const basePath = getAgentApiBasePath(agentApi);
    return fetchInventoryFromApi(basePath);
  }, [agentApi, groupId]);

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
              bumpRevision();
            }

            const resolved = await fetchInventoryAfterMigrationChange(
              fetchInventory,
              change,
              previousTotal,
              optimisticInventory,
            );

            if (resolved) {
              setInventory((current) => resolved ?? current);
              bumpRevision();
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
    [bumpRevision, fetchInventory, setInventory, setVmsList],
  );

  const reloadInventory = useCallback(async () => {
    if (pendingMigrationUpdatesRef.current > 0) {
      return;
    }

    try {
      const fetchedInventory = await fetchInventory();
      if (fetchedInventory) {
        setInventory(fetchedInventory);
        bumpRevision();
      }
    } catch (err) {
      console.error("Error reloading inventory:", err);
    }
  }, [bumpRevision, fetchInventory, setInventory]);

  return { revision, refreshInventory, reloadInventory };
}
