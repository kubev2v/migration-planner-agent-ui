import html2canvas from "html2canvas-pro";
import {
  CHART_EXPORT_CAPTURING_ATTR,
  CHART_EXPORT_SCROLL_ATTR,
  shouldIgnoreChartExportElement,
} from "./chartExport.js";

/** CSS-pixel scale; 2x made zip-all of ~15 live cards too slow. */
const CHART_CAPTURE_SCALE = 1;
const HIDDEN_LAYOUT_STYLE_KEYS = [
  "display",
  "position",
  "left",
  "top",
  "width",
  "maxHeight",
  "overflow",
  "zIndex",
] as const;

type HiddenLayoutStyleKey = (typeof HIDDEN_LAYOUT_STYLE_KEYS)[number];

type HiddenAncestorSnapshot = {
  node: HTMLElement;
  hidden: HTMLElement["hidden"];
  styles: Record<HiddenLayoutStyleKey, string>;
};

function isDisplayNone(node: HTMLElement): boolean {
  return window.getComputedStyle(node).display === "none";
}

/**
 * Tab panels stay mounted with `hidden` / `display:none` when another tab is
 * active. html2canvas then measures a 0×0 box. Reveal those ancestors off-screen
 * for the duration of the capture, then restore.
 */
export function revealHiddenChartAncestors(element: HTMLElement): () => void {
  const saved: HiddenAncestorSnapshot[] = [];
  let node: HTMLElement | null = element;

  while (node && node !== document.documentElement) {
    if (node.hidden || isDisplayNone(node)) {
      saved.push({
        node,
        hidden: node.hidden,
        styles: {
          display: node.style.display,
          position: node.style.position,
          left: node.style.left,
          top: node.style.top,
          width: node.style.width,
          maxHeight: node.style.maxHeight,
          overflow: node.style.overflow,
          zIndex: node.style.zIndex,
        },
      });
    }
    node = node.parentElement;
  }

  if (saved.length === 0) {
    return () => undefined;
  }

  const outermost = saved[saved.length - 1].node;
  const parentWidth = outermost.parentElement?.clientWidth ?? 0;
  const layoutWidth =
    parentWidth || document.documentElement.clientWidth || 1024;

  for (const entry of saved) {
    entry.node.hidden = false;
    entry.node.style.display = "block";
    entry.node.style.position = "fixed";
    entry.node.style.left = "-10000px";
    entry.node.style.top = "0";
    entry.node.style.width = `${layoutWidth}px`;
    entry.node.style.maxHeight = "none";
    entry.node.style.overflow = "visible";
    entry.node.style.zIndex = "-1";
  }

  return () => {
    for (const entry of saved) {
      entry.node.hidden = entry.hidden;
      for (const key of HIDDEN_LAYOUT_STYLE_KEYS) {
        entry.node.style[key] = entry.styles[key];
      }
    }
  };
}

function expandScrollAreas(element: HTMLElement): () => void {
  const nodes = [
    element,
    ...Array.from(
      element.querySelectorAll<HTMLElement>(
        `[${CHART_EXPORT_SCROLL_ATTR}], .pf-v6-c-card, .pf-v6-c-card__body`,
      ),
    ),
  ];
  const previous = nodes.map((node) => ({
    node,
    overflow: node.style.overflow,
    maxHeight: node.style.maxHeight,
    height: node.style.height,
  }));

  for (const node of nodes) {
    node.style.overflow = "visible";
    node.style.maxHeight = "none";
    node.style.height = "auto";
  }

  return () => {
    for (const entry of previous) {
      entry.node.style.overflow = entry.overflow;
      entry.node.style.maxHeight = entry.maxHeight;
      entry.node.style.height = entry.height;
    }
  };
}

export async function captureChartElement(
  element: HTMLElement,
): Promise<HTMLCanvasElement> {
  const restoreHidden = revealHiddenChartAncestors(element);
  const restoreScroll = expandScrollAreas(element);
  element.setAttribute(CHART_EXPORT_CAPTURING_ATTR, "");

  try {
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve());
    });
    const backgroundColor =
      window.getComputedStyle(element).backgroundColor || "#ffffff";
    return html2canvas(element, {
      useCORS: true,
      backgroundColor,
      logging: false,
      scale: CHART_CAPTURE_SCALE,
      imageTimeout: 0,
      ignoreElements: (node) =>
        node instanceof Element &&
        shouldIgnoreChartExportElement(node, element),
    });
  } finally {
    element.removeAttribute(CHART_EXPORT_CAPTURING_ATTR);
    restoreScroll();
    restoreHidden();
  }
}
