import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RVToolsUploadPage } from "./RVToolsUploadPage";

const mocks = vi.hoisted(() => ({
  status: { status: "collecting", error: undefined as string | undefined },
  dispatch: vi.fn(),
  start: vi.fn(),
}));

vi.mock("../../store/hooks", () => ({ useAppDispatch: () => mocks.dispatch }));
vi.mock("../../store/api/agentApiSlice", () => ({
  agentApiSlice: { util: { invalidateTags: vi.fn() } },
}));
vi.mock("../../store/api/lifecycleEndpoints", () => ({
  useGetCollectorStatusQuery: () => ({ data: mocks.status }),
  useStartRvtoolsCollectorMutation: () => [mocks.start, { isLoading: false }],
}));
vi.mock("../../store/baseQuery", () => ({ getSdkErrorMessage: vi.fn() }));
vi.mock("../../common/components/index", () => ({
  CollectionProgress: () => null,
  RedHatLogo: () => null,
}));

describe("RVTools processing errors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.status = { status: "collecting", error: undefined };
  });
  afterEach(cleanup);

  it.each([
    [
      "ingesting rvtools file /var/lib/agent/upload.xlsx: reading RVTools metadata: opening RVTools workbook: zip: not a valid zip file",
      "not a valid zip file",
    ],
    [
      "ingesting rvtools file /var/lib/agent/upload.xlsx: reading RVTools metadata: reading vInfo headers: sheet vInfo does not exist",
      "sheet vInfo does not exist",
    ],
    [
      "RVTools validation failed: No VMs found in vInfo sheet - cannot build inventory without VM data",
      "No VMs found in vInfo sheet - cannot build inventory without VM data",
    ],
    [
      "RVTools file could not be validated",
      "RVTools file could not be validated",
    ],
    [undefined, "The RVTools collection failed."],
  ])("displays the SaaS-formatted message for %s", (error, expected) => {
    const page = (
      <MemoryRouter>
        <RVToolsUploadPage />
      </MemoryRouter>
    );
    const { rerender } = render(page);
    mocks.status = { status: "error", error };
    rerender(
      <MemoryRouter>
        <RVToolsUploadPage />
      </MemoryRouter>,
    );
    expect(screen.getByText(expected)).toBeInTheDocument();
    expect(screen.queryByText(/\/var\/lib\/agent/)).not.toBeInTheDocument();
  });
});
