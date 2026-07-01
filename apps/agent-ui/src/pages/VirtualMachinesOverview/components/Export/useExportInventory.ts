import type { DefaultApiInterface } from "@openshift-migration-advisor/agent-sdk";
import { useCallback, useState } from "react";
import { downloadExportBlob, getExportZipFilename } from "./downloadExportBlob";
import { fetchExportInventory } from "./exportInventoryApi";
import type { ExportScopeId } from "./exportScopes";

type UseExportInventoryOptions = {
  hasCollectionData: boolean;
  hasInventory: boolean;
};

export function useExportInventory(
  agentApi: DefaultApiInterface,
  { hasCollectionData, hasInventory }: UseExportInventoryOptions,
) {
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const showExport = hasCollectionData && hasInventory;

  const openExportModal = useCallback(() => {
    setIsExportModalOpen(true);
  }, []);

  const closeExportModal = useCallback(() => {
    setIsExportModalOpen(false);
  }, []);

  const confirmExport = useCallback(
    (scopes: ExportScopeId[]) => {
      void (async () => {
        try {
          const blob = await fetchExportInventory(agentApi, scopes);
          downloadExportBlob(blob, getExportZipFilename());
        } catch (err) {
          console.error("Error exporting inventory:", err);
          const errorMessage =
            err instanceof Error
              ? err.message
              : "Failed to export inventory. Please try again.";
          alert(errorMessage);
        }
      })();
    },
    [agentApi],
  );

  return {
    isExportModalOpen,
    showExport,
    openExportModal,
    closeExportModal,
    confirmExport,
  };
}
