import "@testing-library/jest-dom";
import { act, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode, Ref } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ExportReportButton, ReportExportMenu } from "../ReportExportMenu.js";
import { standardReportExportOptions } from "../reportExportOptions.js";

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

describe("standardReportExportOptions", () => {
  it("includes only the formats whose handlers are provided", () => {
    const onExportPdf = vi.fn();
    const onExportPng = vi.fn();

    expect(
      standardReportExportOptions({ onExportPdf, onExportPng }).map(
        (option) => option.key,
      ),
    ).toEqual(["pdf", "png"]);
  });

  it("places HTML between PDF and PNG when all handlers exist", () => {
    expect(
      standardReportExportOptions({
        onExportPdf: vi.fn(),
        onExportHtml: vi.fn(),
        onExportPng: vi.fn(),
      }).map((option) => option.key),
    ).toEqual(["pdf", "html", "png"]);
  });
});

describe("ReportExportMenu", () => {
  it("renders nothing when there are no options", () => {
    const { container } = render(<ReportExportMenu options={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("calls the selected option and supports extra formats", () => {
    const onExportPdf = vi.fn();
    const onExportPng = vi.fn();
    const onInventory = vi.fn();

    render(
      <ReportExportMenu
        options={[
          ...standardReportExportOptions({ onExportPdf, onExportPng }),
          {
            key: "inventory",
            label: "Spreadsheet",
            description: "Download inventory as XLSX or ZIP",
            onSelect: onInventory,
          },
        ]}
      />,
    );

    act(() => {
      fireEvent.click(
        screen.getByRole("button", { name: /export report options/i }),
      );
    });

    fireEvent.click(screen.getByRole("menuitem", { name: /pdf/i }));
    fireEvent.click(screen.getByRole("menuitem", { name: /png/i }));
    fireEvent.click(screen.getByRole("menuitem", { name: /spreadsheet/i }));

    expect(onExportPdf).toHaveBeenCalledTimes(1);
    expect(onExportPng).toHaveBeenCalledTimes(1);
    expect(onInventory).toHaveBeenCalledTimes(1);
  });

  it("disables the toggle while loading", () => {
    render(
      <ReportExportMenu
        options={standardReportExportOptions({ onExportPdf: vi.fn() })}
        isLoading
        loadingLabel="Generating PDF..."
      />,
    );

    const toggle = screen.getByRole("button", {
      name: /export report options/i,
    });
    expect(toggle).toBeDisabled();
    expect(screen.getByText("Generating PDF...")).toBeInTheDocument();
  });
});

describe("ExportReportButton", () => {
  it("hides HTML when onExportHtml is omitted", () => {
    render(<ExportReportButton onExportPdf={vi.fn()} onExportPng={vi.fn()} />);

    expect(screen.getByRole("menuitem", { name: /pdf/i })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /png/i })).toBeInTheDocument();
    expect(
      screen.queryByRole("menuitem", { name: /html/i }),
    ).not.toBeInTheDocument();
  });
});
