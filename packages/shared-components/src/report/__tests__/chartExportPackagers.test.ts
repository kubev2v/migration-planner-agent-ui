import { describe, expect, it } from "vitest";
import {
  chartExportViewsFromLabels,
  restoreChartExportViews,
  sortRegisteredChartsByDocumentOrder,
  toBulkChartCaptureSources,
} from "../chartExport.js";
import { getChartExportFilename } from "../chartExportFilenames.js";
import { buildHtmlReport, escapeHtml } from "../htmlExport.js";
import { buildPdfFromCharts } from "../pdfExport.js";
import {
  fitPdfImageSize,
  placePdfBlock,
  splitSegmentForPageHeight,
} from "../pdfPage.js";

describe("chart export filenames", () => {
  const date = new Date("2026-07-01T15:30:00");

  it("names pdf, html, and zip downloads with the export date", () => {
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
});

describe("dropdown chart export views", () => {
  it("builds a titled view list from card dropdown labels", () => {
    expect(
      chartExportViewsFromLabels("VM migration status", {
        issuesVsNoIssues: "No issues vs with issues",
        issuesBreakdown: "With issues breakdown",
      }),
    ).toEqual([
      {
        id: "issuesVsNoIssues",
        title: "VM migration status — No issues vs with issues",
      },
      {
        id: "issuesBreakdown",
        title: "VM migration status — With issues breakdown",
      },
    ]);
  });

  it("captures every dropdown view then restores the visible one", async () => {
    const element = document.createElement("div");
    const activated: string[] = [];
    const charts = [
      {
        id: "vm",
        title: "Visible",
        filename: "visible.png",
        element,
        exportViews: [
          { id: "a", title: "View A" },
          { id: "b", title: "View B" },
        ],
        activeExportViewId: "a",
        setExportView: async (viewId: string) => {
          activated.push(viewId);
        },
      },
    ];

    const sources = toBulkChartCaptureSources(charts, async () => {
      const canvas = document.createElement("canvas");
      canvas.width = 1;
      canvas.height = 1;
      return canvas;
    });

    expect(sources.map((source) => source.title)).toEqual(["View A", "View B"]);
    await sources[0].capture();
    await sources[1].capture();
    await restoreChartExportViews(charts);

    expect(activated).toEqual(["a", "b", "a"]);
  });

  it("lays out hidden cards before switching dropdown views", async () => {
    const element = document.createElement("div");
    const order: string[] = [];
    const charts = [
      {
        id: "vm",
        title: "Visible",
        filename: "visible.png",
        element,
        exportViews: [
          { id: "a", title: "View A" },
          { id: "b", title: "View B" },
        ],
        activeExportViewId: "a",
        setExportView: async () => {
          order.push("setView");
        },
      },
    ];

    const [source] = toBulkChartCaptureSources(
      charts,
      async () => {
        order.push("capture");
        const canvas = document.createElement("canvas");
        canvas.width = 1;
        canvas.height = 1;
        return canvas;
      },
      () => {
        order.push("prepare");
        return () => {
          order.push("restore");
        };
      },
    );

    await source.capture();
    expect(order).toEqual(["prepare", "setView", "capture", "restore"]);
  });
});

describe("sortRegisteredChartsByDocumentOrder", () => {
  it("orders registered nodes by their position in the document", () => {
    const root = document.createElement("div");
    const first = document.createElement("div");
    const second = document.createElement("div");
    root.append(first, second);
    document.body.append(root);

    const sorted = sortRegisteredChartsByDocumentOrder([
      {
        id: "second",
        title: "Second",
        filename: "second.png",
        element: second,
      },
      {
        id: "first",
        title: "First",
        filename: "first.png",
        element: first,
      },
    ]);

    expect(sorted.map((chart) => chart.id)).toEqual(["first", "second"]);
    root.remove();
  });
});

describe("splitSegmentForPageHeight", () => {
  it("splits a tall chart across page height", () => {
    expect(
      splitSegmentForPageHeight({ top: 0, height: 250 }, 250, 100),
    ).toEqual([
      { top: 0, height: 100 },
      { top: 100, height: 100 },
      { top: 200, height: 50 },
    ]);
  });
});

describe("fitPdfImageSize", () => {
  it("keeps full content width when the chart fits the page", () => {
    expect(fitPdfImageSize(800, 200, 190, 277)).toEqual({
      widthMm: 190,
      heightMm: 47.5,
    });
  });

  it("scales down a chart taller than the page", () => {
    expect(fitPdfImageSize(1000, 2000, 200, 100)).toEqual({
      widthMm: 50,
      heightMm: 100,
    });
  });
});

describe("placePdfBlock", () => {
  it("stacks charts on the same page while they fit", () => {
    expect(placePdfBlock(null, 50, 10, 287)).toEqual({
      y: 10,
      needsNewPage: true,
    });
    expect(placePdfBlock(68, 50, 10, 287)).toEqual({
      y: 68,
      needsNewPage: false,
    });
    expect(placePdfBlock(250, 50, 10, 287)).toEqual({
      y: 10,
      needsNewPage: true,
    });
  });
});

describe("buildPdfFromCharts with extra text pages", () => {
  it("appends a text page even when there are no chart captures", async () => {
    const blob = await buildPdfFromCharts([], "Report", [
      {
        title: "Cluster sizing recommendations",
        items: [
          { label: "Cluster name", value: "cluster-1" },
          { label: "Target platform", value: "Bare metal" },
          {
            label: "Total nodes",
            value: "6 (3 workers + 3 control plane)",
          },
          { label: "Failover capacity", value: "1 failover nodes" },
          { label: "Worker node size", value: "8 CPU, 32 GB memory" },
          {
            label: "Control plane node size",
            value: "16 CPU, 64 GB memory",
          },
        ],
        footer: "Note: estimates only.",
      },
    ]);

    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(0);
    expect(blob.type).toBe("application/pdf");
  });

  it("paginates extra pages with many rows without throwing", async () => {
    const manyItems = Array.from({ length: 60 }, (_, index) => ({
      label: `Field ${index}`,
      value: `Value ${index}`,
    }));

    const blob = await buildPdfFromCharts([], "Report", [
      { title: "Cluster sizing recommendations", items: manyItems },
    ]);

    expect(blob.size).toBeGreaterThan(0);
  });

  it("supports multiple extra pages (e.g. one per sized cluster)", async () => {
    const blob = await buildPdfFromCharts([], "Report", [
      {
        title: "Cluster sizing recommendations — cluster-a",
        items: [{ label: "Cluster name", value: "cluster-a" }],
      },
      {
        title: "Cluster sizing recommendations — cluster-b",
        items: [{ label: "Cluster name", value: "cluster-b" }],
      },
    ]);

    expect(blob.size).toBeGreaterThan(0);
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
    expect(html).not.toContain("border:");
    expect(html).toContain("width: 100%");
    expect(escapeHtml("<b>")).toBe("&lt;b&gt;");
    expect(escapeHtml("it's")).toBe("it&#39;s");
  });
});
