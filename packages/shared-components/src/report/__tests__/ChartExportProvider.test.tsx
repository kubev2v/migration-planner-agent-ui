import "@testing-library/jest-dom";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChartExportProvider, useChartExport } from "../ChartExportProvider.js";
import {
  CHART_EXPORT_HIDE_ATTR,
  chartPngFilename,
  shouldIgnoreChartExportElement,
  slugifyExportName,
} from "../chartExport.js";
import { useRegisterChart } from "../chartExportContext.js";
import { HostPowerStates } from "../HostPowerStates.js";
import { ExportReportButton, ReportExportMenu } from "../ReportExportMenu.js";
import { standardReportExportOptions } from "../reportExportOptions.js";

vi.mock("../../charts/MigrationDonutChart.js", () => ({
  MigrationDonutChart: ({
    title,
    subTitle,
  }: {
    title?: string;
    subTitle?: string;
  }): JSX.Element => (
    <div data-testid="power-donut">
      {title} {subTitle}
    </div>
  ),
}));

afterEach(() => cleanup());

function RegisteredChart({
  id,
  title,
}: {
  id: string;
  title: string;
}): JSX.Element {
  const ref = useRegisterChart({ id, title });
  return (
    <div ref={ref} data-testid={`chart-${id}`}>
      {title}
    </div>
  );
}

function DownloadAllButton(): JSX.Element {
  const exportApi = useChartExport();
  return (
    <button type="button" onClick={() => void exportApi?.downloadAll()}>
      Download all
    </button>
  );
}

describe("chart export names", () => {
  it("slugifies titles for PNG filenames", () => {
    expect(slugifyExportName("CPU & memory")).toBe("cpu-memory");
    expect(chartPngFilename("CPU & memory", "cpu")).toBe("cpu-memory.png");
  });
});

describe("shouldIgnoreChartExportElement", () => {
  it("keeps the capture root and skips sibling cards", () => {
    const page = document.createElement("div");
    const card = document.createElement("div");
    const sibling = document.createElement("div");
    page.append(card, sibling);

    expect(shouldIgnoreChartExportElement(card, card)).toBe(false);
    expect(shouldIgnoreChartExportElement(sibling, card)).toBe(true);
    expect(shouldIgnoreChartExportElement(page, card)).toBe(false);
  });

  it("skips chrome marked for export hide inside the card", () => {
    const card = document.createElement("div");
    const hide = document.createElement("button");
    hide.setAttribute(CHART_EXPORT_HIDE_ATTR, "");
    card.append(hide);

    expect(shouldIgnoreChartExportElement(hide, card)).toBe(true);
  });
});

function fakeCanvas(): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 10;
  canvas.height = 10;
  return canvas;
}

function DownloadChartButton({ id }: { id: string }): JSX.Element {
  const exportApi = useChartExport();
  return (
    <button type="button" onClick={() => void exportApi?.downloadChart(id)}>
      Download {id}
    </button>
  );
}

function DownloadPdfButton(): JSX.Element {
  const exportApi = useChartExport();
  return (
    <button
      type="button"
      onClick={() => void exportApi?.downloadPdf("Overview")}
    >
      Download pdf
    </button>
  );
}

function DownloadHtmlButton(): JSX.Element {
  const exportApi = useChartExport();
  return (
    <button
      type="button"
      onClick={() => void exportApi?.downloadHtml("Overview")}
    >
      Download html
    </button>
  );
}

describe("ChartExportProvider", () => {
  it("snapshots registered live nodes instead of a second chart tree", async () => {
    const user = userEvent.setup();
    const capture = vi.fn(async () => fakeCanvas());
    const encodePng = vi.fn(async () => new Blob(["png"]));
    const zipFiles = vi.fn(
      async (files: { filename: string; blob: Blob }[]) => {
        return new Blob([files.map((file) => file.filename).join(",")]);
      },
    );
    const downloadFile = vi.fn();

    render(
      <ChartExportProvider
        capture={capture}
        encodePng={encodePng}
        zipFiles={zipFiles}
        downloadFile={downloadFile}
        getZipFilename={() => "charts.zip"}
      >
        <RegisteredChart id="cpu-memory" title="CPU and memory" />
        <RegisteredChart id="storage" title="Disks" />
        <DownloadAllButton />
      </ChartExportProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Download all" }));

    expect(zipFiles).toHaveBeenCalledTimes(1);
    expect(downloadFile).toHaveBeenCalledWith(expect.any(Blob), "charts.zip");
  });

  it("downloads one registered node as a PNG", async () => {
    const user = userEvent.setup();
    const capture = vi.fn(async () => fakeCanvas());
    const encodePng = vi.fn(async () => new Blob(["png"]));
    const downloadFile = vi.fn();

    render(
      <ChartExportProvider
        capture={capture}
        encodePng={encodePng}
        zipFiles={vi.fn()}
        downloadFile={downloadFile}
      >
        <RegisteredChart id="storage" title="Disks" />
        <DownloadChartButton id="storage" />
      </ChartExportProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Download storage" }));

    expect(capture).toHaveBeenCalledTimes(1);
    expect(downloadFile).toHaveBeenCalledWith(expect.any(Blob), "disks.png");
  });

  it("re-registers charts after React Strict Mode's extra effect cycle", async () => {
    const user = userEvent.setup();
    const capture = vi.fn(async () => fakeCanvas());
    const encodePng = vi.fn(async () => new Blob(["png"]));
    const downloadFile = vi.fn();

    render(
      <ChartExportProvider
        capture={capture}
        encodePng={encodePng}
        zipFiles={vi.fn()}
        downloadFile={downloadFile}
      >
        <RegisteredChart id="storage" title="Disks" />
        <DownloadChartButton id="storage" />
      </ChartExportProvider>,
      { reactStrictMode: true },
    );

    await user.click(screen.getByRole("button", { name: "Download storage" }));

    expect(capture).toHaveBeenCalledTimes(1);
    expect(downloadFile).toHaveBeenCalledWith(expect.any(Blob), "disks.png");
  });

  it("builds a PDF from the same captured canvases", async () => {
    const user = userEvent.setup();
    const capture = vi.fn(async () => fakeCanvas());
    const buildPdf = vi.fn(async () => new Blob(["pdf"]));
    const downloadFile = vi.fn();

    render(
      <ChartExportProvider
        capture={capture}
        zipFiles={vi.fn()}
        buildPdf={buildPdf}
        downloadFile={downloadFile}
        getPdfFilename={() => "report.pdf"}
      >
        <RegisteredChart id="storage" title="Disks" />
        <DownloadPdfButton />
      </ChartExportProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Download pdf" }));

    expect(buildPdf).toHaveBeenCalledTimes(1);
    expect(buildPdf.mock.calls[0]?.[1]).toBe("Overview");
    expect(buildPdf.mock.calls[0]?.[0][0]).toMatchObject({
      id: "storage",
      title: "Disks",
    });
    expect(downloadFile).toHaveBeenCalledWith(expect.any(Blob), "report.pdf");
  });

  it("builds HTML from the same captured canvases", async () => {
    const user = userEvent.setup();
    const capture = vi.fn(async () => fakeCanvas());
    const buildHtml = vi.fn(async () => new Blob(["html"]));
    const downloadFile = vi.fn();

    render(
      <ChartExportProvider
        capture={capture}
        zipFiles={vi.fn()}
        buildHtml={buildHtml}
        downloadFile={downloadFile}
        getHtmlFilename={() => "report.html"}
      >
        <RegisteredChart id="storage" title="Disks" />
        <DownloadHtmlButton />
      </ChartExportProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Download html" }));

    expect(buildHtml).toHaveBeenCalledTimes(1);
    expect(buildHtml.mock.calls[0]?.[1]).toBe("Overview");
    expect(downloadFile).toHaveBeenCalledWith(expect.any(Blob), "report.html");
  });

  it("warns when two live charts share an id", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    render(
      <ChartExportProvider capture={vi.fn()} zipFiles={vi.fn()}>
        <RegisteredChart id="storage" title="Disks" />
        <RegisteredChart id="storage" title="Disks copy" />
      </ChartExportProvider>,
    );

    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('Duplicate chart export id "storage"'),
    );
    warn.mockRestore();
  });

  it("shows a generic error when capture fails", async () => {
    const user = userEvent.setup();
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    function ErrorText(): JSX.Element {
      const exportApi = useChartExport();
      return <div>{exportApi?.exportError}</div>;
    }

    render(
      <ChartExportProvider
        capture={vi.fn(async () => {
          throw new Error("canvas tainted");
        })}
        zipFiles={vi.fn()}
      >
        <RegisteredChart id="storage" title="Disks" />
        <DownloadChartButton id="storage" />
        <ErrorText />
      </ChartExportProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Download storage" }));

    expect(
      await screen.findByText("Failed to export PNG. Please try again."),
    ).toBeInTheDocument();
    expect(screen.queryByText("canvas tainted")).not.toBeInTheDocument();
    vi.mocked(console.error).mockRestore();
  });

  it("hides per-chart download when no provider is present", () => {
    render(<HostPowerStates hostPowerStates={{ green: 3 }} />);

    expect(
      screen.queryByRole("button", { name: /download/i }),
    ).not.toBeInTheDocument();
  });

  it("shows a per-chart download button when the provider is present", () => {
    render(
      <ChartExportProvider capture={vi.fn()} zipFiles={vi.fn()}>
        <HostPowerStates hostPowerStates={{ green: 3 }} />
      </ChartExportProvider>,
    );

    expect(
      screen.getByRole("button", {
        name: "Download ESXi host power states as PNG",
      }),
    ).toBeInTheDocument();
  });
});

describe("standardReportExportOptions", () => {
  it("omits formats whose handlers are missing", () => {
    const onExportPng = vi.fn();
    expect(
      standardReportExportOptions({ onExportPng }).map((option) => option.key),
    ).toEqual(["png"]);
  });
});

describe("ReportExportMenu", () => {
  it("renders nothing without options", () => {
    const { container } = render(<ReportExportMenu options={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("invokes the PNG handler from the menu", async () => {
    const user = userEvent.setup();
    const onExportPng = vi.fn();

    render(<ExportReportButton onExportPng={onExportPng} />);

    await user.click(
      screen.getByRole("button", { name: "Export report options" }),
    );
    await user.click(screen.getByRole("menuitem", { name: /png/i }));

    expect(onExportPng).toHaveBeenCalledTimes(1);
  });

  it("places the loading spinner in the toggle icon slot", () => {
    render(
      <ReportExportMenu
        isLoading
        loadingLabel="Generating PNG..."
        options={[
          {
            key: "png",
            label: "PNG",
            description: "Download all charts as PNG files",
            onSelect: vi.fn(),
          },
        ]}
      />,
    );

    const toggle = screen.getByRole("button", {
      name: "Export report options",
    });
    expect(toggle).toHaveTextContent("Generating PNG...");
    const iconSlot = toggle.querySelector(".pf-v6-c-menu-toggle__icon");
    expect(iconSlot).not.toBeNull();
    expect(iconSlot?.querySelector('[role="progressbar"]')).not.toBeNull();
    expect(
      toggle.querySelector(".pf-v6-c-menu-toggle__text")?.textContent,
    ).toBe("Generating PNG...");
  });
});
