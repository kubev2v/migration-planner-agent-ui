import { describe, expect, it } from "vitest";
import {
  chartFilename,
  getChartExportFilename,
  shouldIgnoreExportElement,
  singleChartFilename,
  slugifyExportName,
  splitSegmentForPageHeight,
} from "./chartExportCapture";
import { buildHtmlReport, escapeHtml } from "./htmlExport";

describe("chart export helpers", () => {
  const date = new Date("2026-07-01T15:30:00");

  it("names chart files with the export date", () => {
    expect(getChartExportFilename("pdf", date)).toBe(
      "migration-export-2026-07-01.pdf",
    );
    expect(getChartExportFilename("html", date)).toBe(
      "migration-export-2026-07-01.html",
    );
    expect(getChartExportFilename("zip", date)).toBe(
      "migration-export-2026-07-01-charts.zip",
    );
  });

  it("splits a tall chart across page height", () => {
    expect(
      splitSegmentForPageHeight({ top: 0, height: 250 }, 250, 100),
    ).toEqual([
      { top: 0, height: 100 },
      { top: 100, height: 100 },
      { top: 200, height: 50 },
    ]);
  });

  it("slugifies chart titles for PNG filenames", () => {
    expect(slugifyExportName("Infrastructure summary")).toBe(
      "infrastructure-summary",
    );
    expect(chartFilename(0, "VM migration status")).toBe(
      "01-vm-migration-status.png",
    );
    expect(singleChartFilename("CPU & memory — Memory size tiers")).toBe(
      "cpu-memory-memory-size-tiers.png",
    );
  });

  it("ignores the live page while keeping the print host and document shell", () => {
    const printHost = document.createElement("div");
    printHost.id = "chart-print-host";
    const chart = document.createElement("div");
    printHost.appendChild(chart);

    const appRoot = document.createElement("div");
    appRoot.id = "root";
    const dashboard = document.createElement("section");
    appRoot.appendChild(dashboard);

    expect(shouldIgnoreExportElement(appRoot, printHost)).toBe(true);
    expect(shouldIgnoreExportElement(dashboard, printHost)).toBe(true);
    expect(shouldIgnoreExportElement(printHost, printHost)).toBe(false);
    expect(shouldIgnoreExportElement(chart, printHost)).toBe(false);
    expect(
      shouldIgnoreExportElement(document.createElement("html"), printHost),
    ).toBe(false);
    expect(
      shouldIgnoreExportElement(document.createElement("body"), printHost),
    ).toBe(false);
    expect(
      shouldIgnoreExportElement(document.createElement("style"), printHost),
    ).toBe(false);
  });
});

describe("buildHtmlReport", () => {
  it("embeds captured chart images and escapes the title", () => {
    const html = buildHtmlReport(
      'Report <script>alert("x")</script>',
      [
        {
          name: "Infrastructure summary",
          dataUrl: "data:image/png;base64,abc",
        },
      ],
      new Date("2026-07-01T15:30:00"),
    );

    expect(html).toContain(
      "Report &lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;",
    );
    expect(html).toContain('src="data:image/png;base64,abc"');
    expect(html).toContain("Infrastructure summary");
    expect(escapeHtml("<b>")).toBe("&lt;b&gt;");
  });
});
