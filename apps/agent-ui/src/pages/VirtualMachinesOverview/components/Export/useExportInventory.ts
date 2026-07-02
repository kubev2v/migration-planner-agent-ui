import type { DefaultApiInterface } from "@openshift-migration-advisor/agent-sdk";
import { useCallback, useRef, useState } from "react";
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
  const [exportError, setExportError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const isExportingRef = useRef(false);

  const showExport = hasCollectionData && hasInventory;

  const openExportModal = useCallback(() => {
    setExportError(null);
    setIsExporting(false);
    isExportingRef.current = false;
    setIsExportModalOpen(true);
  }, []);

  const closeExportModal = useCallback(() => {
    setExportError(null);
    setIsExporting(false);
    isExportingRef.current = false;
    setIsExportModalOpen(false);
  }, []);

  const confirmExport = useCallback(
    async (scopes: ExportScopeId[]) => {
      if (isExportingRef.current) {
        return;
      }

      isExportingRef.current = true;
      setIsExporting(true);
      setExportError(null);

      try {
        const blob = await fetchExportInventory(agentApi, scopes);
        downloadExportBlob(blob, getExportZipFilename());
        setExportError(null);
        setIsExportModalOpen(false);
      } catch (err) {
        console.error("Error exporting inventory:", err);
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Failed to export inventory. Please try again.";
        setExportError(errorMessage);
      } finally {
        isExportingRef.current = false;
        setIsExporting(false);
      }
    },
    [agentApi],
  );

  return {
    isExportModalOpen,
    showExport,
    exportError,
    isExporting,
    openExportModal,
    closeExportModal,
    confirmExport,
  };
}
