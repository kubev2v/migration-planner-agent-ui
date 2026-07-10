import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UseVMTableLogicParams } from "./vmTableTypes";

const mockSetSearchParams = vi.fn();
let mockSearchParams = new URLSearchParams("tab=vms");

vi.mock("react-router-dom", () => ({
  useSearchParams: () => [mockSearchParams, mockSetSearchParams] as const,
}));

import { useVMTableLogic } from "./useVMTableLogic";

const EMPTY_VMS: UseVMTableLogicParams["vms"] = [];
const EMPTY_FILTER_OPTIONS: NonNullable<
  UseVMTableLogicParams["availableFilterOptions"]
> = {
  clusters: [],
  datacenters: [],
  concernLabels: [],
  concernCategories: [],
  vmLabels: [],
  groups: [],
};
const PERFORMANCE_CATEGORY = ["Performance"];
const HIGH_CPU_LABEL = ["High CPU"];

function getCheckboxAttribute(
  filterAttributes: ReturnType<typeof useVMTableLogic>["filterAttributes"],
  id: string,
) {
  const attribute = filterAttributes.find((candidate) => candidate.id === id);
  if (!attribute || attribute.type !== "checkbox") {
    throw new Error(`Expected checkbox attribute "${id}"`);
  }
  return attribute;
}

describe("useVMTableLogic filters", () => {
  beforeEach(() => {
    mockSearchParams = new URLSearchParams("tab=vms");
    mockSetSearchParams.mockReset();
    mockSetSearchParams.mockImplementation((params: URLSearchParams) => {
      mockSearchParams =
        params instanceof URLSearchParams
          ? new URLSearchParams(params)
          : new URLSearchParams(params);
    });
  });

  it("refreshes filter options when a checkbox value control opens", () => {
    const onRefreshFilterOptions = vi.fn();

    const { result } = renderHook(() =>
      useVMTableLogic({
        vms: EMPTY_VMS,
        onRefreshFilterOptions,
      }),
    );

    const statusAttribute = getCheckboxAttribute(
      result.current.filterAttributes,
      "status",
    );

    act(() => {
      statusAttribute.onOpen?.();
    });

    expect(onRefreshFilterOptions).toHaveBeenCalledTimes(1);
  });

  it("resets page when a checkbox filter changes", () => {
    const onPageChange = vi.fn();

    const { result } = renderHook(() =>
      useVMTableLogic({
        vms: EMPTY_VMS,
        currentPage: 3,
        pageSize: 20,
        onPageChange,
      }),
    );

    const statusAttribute = getCheckboxAttribute(
      result.current.filterAttributes,
      "status",
    );

    act(() => {
      statusAttribute.onSelectionsChange(["poweredOn"]);
    });

    expect(onPageChange).toHaveBeenCalledWith(1, 20);
  });

  it("clears has/no issues when concern categories are selected", () => {
    const onPageChange = vi.fn();
    const initialFilters = { hasIssues: true };

    const { result } = renderHook(() =>
      useVMTableLogic({
        vms: EMPTY_VMS,
        initialFilters,
        availableFilterOptions: {
          ...EMPTY_FILTER_OPTIONS,
          concernCategories: PERFORMANCE_CATEGORY,
        },
        onPageChange,
      }),
    );

    const concernCategories = getCheckboxAttribute(
      result.current.filterAttributes,
      "issue-categories",
    );

    act(() => {
      concernCategories.onSelectionsChange(["Performance"]);
    });

    const issuesAttribute = getCheckboxAttribute(
      result.current.filterAttributes,
      "issues",
    );
    expect(issuesAttribute.selections).toEqual([]);
  });

  it("clears concern filters when has/no issues are selected", () => {
    const onPageChange = vi.fn();
    const initialFilters = {
      concernCategories: PERFORMANCE_CATEGORY,
      concernLabels: HIGH_CPU_LABEL,
    };

    const { result } = renderHook(() =>
      useVMTableLogic({
        vms: EMPTY_VMS,
        initialFilters,
        availableFilterOptions: {
          ...EMPTY_FILTER_OPTIONS,
          concernLabels: HIGH_CPU_LABEL,
          concernCategories: PERFORMANCE_CATEGORY,
        },
        onPageChange,
      }),
    );

    const issuesAttribute = getCheckboxAttribute(
      result.current.filterAttributes,
      "issues",
    );

    act(() => {
      issuesAttribute.onSelectionsChange(["has-issues"]);
    });

    expect(
      getCheckboxAttribute(result.current.filterAttributes, "issue-categories")
        .selections,
    ).toEqual([]);
    expect(
      getCheckboxAttribute(result.current.filterAttributes, "specific-issues")
        .selections,
    ).toEqual([]);
  });

  it("clears all filters and resets page", () => {
    const onPageChange = vi.fn();
    const initialFilters = {
      search: "alpha",
      statuses: ["poweredOn"],
    };

    const { result } = renderHook(() =>
      useVMTableLogic({
        vms: EMPTY_VMS,
        initialFilters,
        onPageChange,
      }),
    );

    act(() => {
      result.current.clearAllFilters();
    });

    expect(onPageChange).toHaveBeenCalledWith(1, 20);
    expect(
      result.current.filterAttributes.find(
        (attribute) => attribute.id === "name",
      ),
    ).toMatchObject({ value: "" });
    expect(
      getCheckboxAttribute(result.current.filterAttributes, "status")
        .selections,
    ).toEqual([]);
  });

  it("syncs filter changes to backend callback", () => {
    const onFiltersChange = vi.fn();

    const { result } = renderHook(() =>
      useVMTableLogic({
        vms: EMPTY_VMS,
        onFiltersChange,
      }),
    );

    const statusAttribute = getCheckboxAttribute(
      result.current.filterAttributes,
      "status",
    );

    act(() => {
      statusAttribute.onSelectionsChange(["poweredOn"]);
    });

    expect(onFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({
        statuses: ["poweredOn"],
      }),
    );
  });
});
