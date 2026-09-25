import { describe, expect, it } from "vitest";
import { sortRegisteredChartsByDocumentOrder } from "../chartExport.js";
import { getChartExportFilename } from "../chartExportFilenames.js";
import { buildHtmlReport, escapeHtml } from "../htmlExport.js";
import { splitSegmentForPageHeight } from "../pdfPage.js";

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
    expect(escapeHtml("it's")).toBe("it&#39;s");
  });
});
