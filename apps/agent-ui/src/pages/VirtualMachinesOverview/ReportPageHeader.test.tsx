import "@testing-library/jest-dom";

import { standardReportExportOptions } from "@openshift-migration-advisor/shared-components";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode, Ref } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ReportPageHeader } from "./ReportPageHeader";

vi.mock("../../common/report/RunNewReportButton", () => ({
  RunNewReportButton: () => <div data-testid="run-new-report" />,
}));

vi.mock("../../common/report/DeleteCollectedDataButton", () => ({
  DeleteCollectedDataButton: () => <div data-testid="delete-collected-data" />,
}));

vi.mock("../../common/report/ExportButton", () => ({
  ExportButton: ({ onClick }: { onClick?: () => void }) => (
    <button type="button" onClick={onClick}>
      Export
    </button>
  ),
}));

vi.mock("@patternfly/react-core", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@patternfly/react-core")>();

  return {
    ...actual,
    Dropdown: ({
      children,
      toggle,
    }: {
      children?: ReactNode;
      toggle?: ReactNode | ((ref: Ref<unknown>) => ReactNode);
    }) => (
      <div>
        {typeof toggle === "function" ? toggle(null) : toggle}
        {children}
      </div>
    ),
  };
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("ReportPageHeader", () => {
  it("hides export controls when showExport is false", () => {
    render(
      <ReportPageHeader
        onExportClick={vi.fn()}
        exportOptions={standardReportExportOptions({
          onExportPdf: vi.fn(),
          onExportPng: vi.fn(),
        })}
      />,
    );

    expect(
      screen.queryByRole("button", { name: /export report options/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^export$/i }),
    ).not.toBeInTheDocument();
  });

  it("falls back to the simple export button when only onExportClick is provided", async () => {
    const user = userEvent.setup();
    const onExportClick = vi.fn();

    render(<ReportPageHeader showExport onExportClick={onExportClick} />);

    await user.click(screen.getByRole("button", { name: /^export$/i }));

    expect(onExportClick).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByRole("button", { name: /export report options/i }),
    ).not.toBeInTheDocument();
  });

  it("exports PDF, HTML, PNG, and extra formats from the shared menu", async () => {
    const user = userEvent.setup();
    const onExportPdf = vi.fn();
    const onExportHtml = vi.fn();
    const onExportPng = vi.fn();
    const onExportInventory = vi.fn();

    render(
      <ReportPageHeader
        showExport
        exportOptions={[
          ...standardReportExportOptions({
            onExportPdf,
            onExportHtml,
            onExportPng,
          }),
          {
            key: "inventory",
            label: "Spreadsheet",
            description: "Download inventory as XLSX or ZIP",
            onSelect: onExportInventory,
          },
        ]}
      />,
    );

    expect(
      screen.getByRole("button", { name: /export report options/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /pdf/i })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /html/i })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /png/i })).toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: /spreadsheet/i }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("menuitem", { name: /pdf/i }));
    await user.click(screen.getByRole("menuitem", { name: /html/i }));
    await user.click(screen.getByRole("menuitem", { name: /png/i }));
    await user.click(screen.getByRole("menuitem", { name: /spreadsheet/i }));

    expect(onExportPdf).toHaveBeenCalledTimes(1);
    expect(onExportHtml).toHaveBeenCalledTimes(1);
    expect(onExportPng).toHaveBeenCalledTimes(1);
    expect(onExportInventory).toHaveBeenCalledTimes(1);
  });

  it("omits HTML when that handler is not provided", () => {
    render(
      <ReportPageHeader
        showExport
        exportOptions={standardReportExportOptions({
          onExportPdf: vi.fn(),
          onExportPng: vi.fn(),
        })}
      />,
    );

    expect(screen.getByRole("menuitem", { name: /pdf/i })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /png/i })).toBeInTheDocument();
    expect(
      screen.queryByRole("menuitem", { name: /html/i }),
    ).not.toBeInTheDocument();
  });

  it("disables the menu and shows the loading label while exporting", () => {
    render(
      <ReportPageHeader
        showExport
        exportOptions={standardReportExportOptions({ onExportPdf: vi.fn() })}
        isExporting
        exportLoadingLabel="Generating PDF..."
      />,
    );

    const toggle = screen.getByRole("button", {
      name: /export report options/i,
    });
    expect(toggle).toBeDisabled();
    expect(screen.getByText("Generating PDF...")).toBeInTheDocument();
  });
});
