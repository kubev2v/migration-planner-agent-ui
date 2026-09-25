import html2canvas from "html2canvas-pro";
import { afterEach, describe, expect, it, vi } from "vitest";
import { captureChartElement } from "../captureChartElement.js";

vi.mock("html2canvas-pro", () => ({
  default: vi.fn(async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    return canvas;
  }),
}));

const mockedHtml2Canvas = vi.mocked(html2canvas);

afterEach(() => {
  mockedHtml2Canvas.mockClear();
  document.body.replaceChildren();
});

describe("captureChartElement", () => {
  it("temporarily unhides ancestors so a hidden tab panel can be measured", async () => {
    const panel = document.createElement("div");
    panel.hidden = true;
    const chart = document.createElement("div");
    panel.append(chart);
    document.body.append(panel);

    mockedHtml2Canvas.mockImplementation(async () => {
      expect(panel.hidden).toBe(false);
      expect(panel.style.display).toBe("block");
      const canvas = document.createElement("canvas");
      canvas.width = 1;
      canvas.height = 1;
      return canvas;
    });

    await captureChartElement(chart);

    expect(panel.hidden).toBe(true);
  });

  it("temporarily unhides ancestors hidden with display none", async () => {
    const panel = document.createElement("div");
    panel.style.display = "none";
    const chart = document.createElement("div");
    panel.append(chart);
    document.body.append(panel);

    mockedHtml2Canvas.mockImplementation(async () => {
      expect(panel.style.display).toBe("block");
      const canvas = document.createElement("canvas");
      canvas.width = 1;
      canvas.height = 1;
      return canvas;
    });

    await captureChartElement(chart);

    expect(panel.style.display).toBe("none");
  });
});
