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
  document.documentElement.classList.remove(
    "pf-v6-theme-dark",
    "pf-v5-theme-dark",
  );
  document.documentElement.style.colorScheme = "";
  document.body.style.colorScheme = "";
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

  it("paints a real card border and hides the PatternFly ::before during capture", async () => {
    const root = document.createElement("div");
    const card = document.createElement("div");
    card.className = "pf-v6-c-card";
    card.style.borderRadius = "16px";
    card.style.backgroundColor = "rgb(255, 255, 255)";
    card.style.border = "1px solid rgb(200, 200, 200)";
    root.append(card);
    document.body.append(root);

    mockedHtml2Canvas.mockImplementation(async (_element, options) => {
      expect(card.style.borderWidth).toBe("1px");
      expect(card.style.overflow).toBe("hidden");
      expect(
        document.head.querySelector("[data-chart-export-hide-before]"),
      ).not.toBeNull();

      const cloneRoot = document.createElement("div");
      const cloneCard = document.createElement("div");
      cloneCard.className = "pf-v6-c-card";
      cloneRoot.append(cloneCard);
      options?.onclone?.(document, cloneRoot);
      expect(cloneCard.style.borderWidth).toBe("1px");
      expect(cloneCard.style.borderStyle).toBe("solid");
      expect(cloneCard.style.overflow).toBe("hidden");

      const canvas = document.createElement("canvas");
      canvas.width = 1;
      canvas.height = 1;
      return canvas;
    });

    await captureChartElement(root);

    expect(card.style.borderWidth).toBe("1px");
    expect(card.style.overflow).toBe("");
    expect(
      document.head.querySelector("[data-chart-export-hide-before]"),
    ).toBeNull();
  });

  it("inlines computed card title padding so content stays inset", async () => {
    const root = document.createElement("div");
    const title = document.createElement("div");
    title.className = "pf-v6-c-card__title";
    title.style.padding = "24px 24px 16px 24px";
    root.append(title);
    document.body.append(root);

    mockedHtml2Canvas.mockImplementation(async (_element, options) => {
      expect(title.style.paddingTop).not.toBe("");
      expect(title.style.paddingLeft).not.toBe("");

      const cloneRoot = document.createElement("div");
      const cloneTitle = document.createElement("div");
      cloneTitle.className = "pf-v6-c-card__title";
      cloneRoot.append(cloneTitle);
      options?.onclone?.(document, cloneRoot);
      expect(cloneTitle.style.paddingTop).not.toBe("");
      expect(cloneTitle.style.paddingLeft).not.toBe("");

      const canvas = document.createElement("canvas");
      canvas.width = 1;
      canvas.height = 1;
      return canvas;
    });

    await captureChartElement(root);
  });

  it("applies light theme on the clone and leaves the live document dark", async () => {
    document.documentElement.classList.add("pf-v6-theme-dark");
    const root = document.createElement("div");
    const card = document.createElement("div");
    card.className = "pf-v6-c-card";
    card.style.backgroundColor = "rgb(30, 30, 30)";
    card.style.border = "1px solid rgb(80, 80, 80)";
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.style.fill = "rgb(255, 255, 255)";
    text.textContent = "42";
    svg.append(text);
    card.append(svg);
    root.append(card);
    document.body.append(root);

    mockedHtml2Canvas.mockImplementation(async (_element, options) => {
      expect(
        document.documentElement.classList.contains("pf-v6-theme-dark"),
      ).toBe(true);

      const clonedDoc = document.implementation.createHTMLDocument("export");
      clonedDoc.documentElement.classList.add("pf-v6-theme-dark");
      const cloneRoot = clonedDoc.createElement("div");
      const cloneCard = clonedDoc.createElement("div");
      cloneCard.className = "pf-v6-c-card";
      cloneCard.style.backgroundColor = "rgb(30, 30, 30)";
      const cloneSvg = clonedDoc.createElementNS(
        "http://www.w3.org/2000/svg",
        "svg",
      );
      const cloneText = clonedDoc.createElementNS(
        "http://www.w3.org/2000/svg",
        "text",
      );
      cloneText.style.fill = "rgb(255, 255, 255)";
      cloneSvg.append(cloneText);
      cloneCard.append(cloneSvg);
      cloneRoot.append(cloneCard);
      clonedDoc.body.append(cloneRoot);

      await options?.onclone?.(clonedDoc, cloneRoot);

      expect(
        clonedDoc.documentElement.classList.contains("pf-v6-theme-dark"),
      ).toBe(false);
      expect(
        document.documentElement.classList.contains("pf-v6-theme-dark"),
      ).toBe(true);
      expect(cloneCard.style.backgroundColor).toBe("rgb(255, 255, 255)");
      expect(cloneCard.style.borderColor).toBe("rgb(224, 224, 224)");
      expect(cloneText.style.fill).toBe("rgb(21, 21, 21)");

      const canvas = document.createElement("canvas");
      canvas.width = 1;
      canvas.height = 1;
      return canvas;
    });

    await captureChartElement(root);

    expect(
      document.documentElement.classList.contains("pf-v6-theme-dark"),
    ).toBe(true);
    expect(card.style.backgroundColor).toBe("rgb(30, 30, 30)");
  });
});
