import { SortByDirection } from "@patternfly/react-table";
import { act, renderHook } from "@testing-library/react";
import type { MouseEvent } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UseVMTableLogicParams } from "./vmTableTypes";

const mockSetSearchParams = vi.fn();
let mockSearchParams = new URLSearchParams("tab=vms");

vi.mock("react-router-dom", () => ({
  useSearchParams: () => [mockSearchParams, mockSetSearchParams] as const,
}));

import { useVMTableLogic } from "./useVMTableLogic";

const EMPTY_VMS: UseVMTableLogicParams["vms"] = [];

describe("useVMTableLogic sort", () => {
  beforeEach(() => {
    mockSearchParams = new URLSearchParams("tab=vms");
    mockSetSearchParams.mockReset();
    mockSetSearchParams.mockImplementation((params: URLSearchParams) => {
      mockSearchParams = new URLSearchParams(params);
    });
  });

  it("sends datacenter sort to the backend", () => {
    const onSortChange = vi.fn();

    const { result } = renderHook(() =>
      useVMTableLogic({
        vms: EMPTY_VMS,
        onSortChange,
      }),
    );

    const datacenterColumn = result.current.columns.find(
      (column) => column.key === "datacenter",
    );
    expect(datacenterColumn?.sortable).toBe(true);

    const datacenterIndex = result.current.columns.findIndex(
      (column) => column.key === "datacenter",
    );
    const sortParams = result.current.getSortParams(
      "datacenter",
      datacenterIndex,
    );
    expect(sortParams).toBeDefined();

    act(() => {
      sortParams?.onSort?.(
        {} as MouseEvent,
        datacenterIndex,
        SortByDirection.asc,
        {} as never,
      );
    });

    expect(onSortChange).toHaveBeenCalledWith(["datacenter:asc"]);
  });
});
