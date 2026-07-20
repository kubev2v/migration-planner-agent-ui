import type { OsInfoSupportTierEnum as SupportTier } from "@openshift-migration-advisor/agent-sdk";
import type { MouseEvent as ReactMouseEvent } from "react";
import { useMemo, useState } from "react";
import {
  getSupportTierLegendLabel,
  getSupportTierSortOrder,
  type OSDistributionEntry,
  resolveSupportTier,
} from "./osSupportTier";

export const ALL_TIERS_FILTER = "all";

export interface OsTableRow {
  osName: string;
  tier: SupportTier;
  count: number;
}

export interface OsBarChartViewModel {
  osFilter: string;
  tierFilter: string;
  isTierSelectOpen: boolean;
  tableRows: OsTableRow[];
  filteredRows: OsTableRow[];
  tierFilterLabel: string;
  showNoResults: boolean;
  setOsFilter: (value: string) => void;
  clearOsFilter: () => void;
  setIsTierSelectOpen: (open: boolean) => void;
  toggleTierSelectOpen: () => void;
  handleTierSelect: (
    _event?: ReactMouseEvent<Element>,
    value?: string | number,
  ) => void;
}

function buildOsTableRows(
  osData: Record<string, OSDistributionEntry>,
): OsTableRow[] {
  return Object.entries(osData)
    .filter(([osName]) => osName.trim() !== "")
    .map(([osName, entry]) => ({
      osName,
      tier: resolveSupportTier(entry.supportTier, entry.supported),
      count: entry.count,
    }))
    .sort((a, b) => {
      const tierOrder =
        getSupportTierSortOrder(a.tier) - getSupportTierSortOrder(b.tier);
      if (tierOrder !== 0) {
        return tierOrder;
      }

      return b.count - a.count;
    });
}

export function useOsBarChartViewModel(
  osData: Record<string, OSDistributionEntry>,
): OsBarChartViewModel {
  const [osFilter, setOsFilter] = useState("");
  const [tierFilter, setTierFilter] = useState<string>(ALL_TIERS_FILTER);
  const [isTierSelectOpen, setIsTierSelectOpen] = useState(false);

  const tableRows = useMemo(() => buildOsTableRows(osData), [osData]);

  const filteredRows = useMemo(() => {
    const normalizedFilter = osFilter.trim().toLowerCase();

    return tableRows.filter((row) => {
      const matchesOs =
        normalizedFilter === "" ||
        row.osName.toLowerCase().includes(normalizedFilter);
      const matchesTier =
        tierFilter === ALL_TIERS_FILTER || row.tier === tierFilter;

      return matchesOs && matchesTier;
    });
  }, [osFilter, tableRows, tierFilter]);

  const tierFilterLabel =
    tierFilter === ALL_TIERS_FILTER
      ? "Filter by tier"
      : getSupportTierLegendLabel(tierFilter as SupportTier);

  const handleTierSelect = (
    _event?: ReactMouseEvent<Element>,
    value?: string | number,
  ): void => {
    if (typeof value === "string") {
      setTierFilter(value);
    }
    setIsTierSelectOpen(false);
  };

  return {
    osFilter,
    tierFilter,
    isTierSelectOpen,
    tableRows,
    filteredRows,
    tierFilterLabel,
    showNoResults: filteredRows.length === 0,
    setOsFilter,
    clearOsFilter: () => setOsFilter(""),
    setIsTierSelectOpen,
    toggleTierSelectOpen: () => setIsTierSelectOpen((open) => !open),
    handleTierSelect,
  };
}
