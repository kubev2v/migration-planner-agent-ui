import {
  t_color_gray_20,
  t_color_white,
  t_global_text_color_regular,
} from "@patternfly/react-tokens";
import html2canvas from "html2canvas-pro";
import {
  applyLightThemeToDocument,
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

const PADDED_CAPTURE_SELECTOR =
  ".pf-v6-c-card__title, .pf-v6-c-card__header, .pf-v6-c-card__body";
const CARD_CAPTURE_SELECTOR = ".pf-v6-c-card";
const TRANSPARENT_FILLS = new Set(["", "transparent", "rgba(0, 0, 0, 0)"]);
/** PatternFly light-theme chrome. html2canvas inlines live computed SVG styles. */
const LIGHT_EXPORT_BACKGROUND = t_color_white.value;
const LIGHT_EXPORT_BORDER = t_color_gray_20.value;
const LIGHT_EXPORT_TEXT = t_global_text_color_regular.value;

function queryCards(root: HTMLElement): HTMLElement[] {
  const cards = Array.from(
    root.querySelectorAll<HTMLElement>(CARD_CAPTURE_SELECTOR),
  );
  if (root.matches(CARD_CAPTURE_SELECTOR)) {
    cards.unshift(root);
  }
  return cards;
}

function resolvedFill(color: string): string {
  return TRANSPARENT_FILLS.has(color) ? "#ffffff" : color;
}

function applyComputedPadding(source: HTMLElement, dest: HTMLElement): void {
  const computed = window.getComputedStyle(source);
  dest.style.paddingTop = computed.paddingTop;
  dest.style.paddingRight = computed.paddingRight;
  dest.style.paddingBottom = computed.paddingBottom;
  dest.style.paddingLeft = computed.paddingLeft;
}

function readCardBorder(source: HTMLElement): {
  width: string;
  style: string;
  color: string;
} | null {
  if (source.style.borderWidth && source.style.borderStyle) {
    return {
      width: source.style.borderWidth,
      style: source.style.borderStyle,
      color: source.style.borderColor,
    };
  }
  const computed = window.getComputedStyle(source);
  const before = window.getComputedStyle(source, "::before");
  const width =
    before.borderTopWidth && before.borderTopWidth !== "0px"
      ? before.borderTopWidth
      : computed.borderTopWidth;
  const style =
    before.borderTopStyle && before.borderTopStyle !== "none"
      ? before.borderTopStyle
      : computed.borderTopStyle;
  const color =
    before.borderTopColor && before.borderTopColor !== "rgba(0, 0, 0, 0)"
      ? before.borderTopColor
      : computed.borderTopColor;
  if (width === "0px" || style === "none") {
    return null;
  }
  return { width, style, color };
}

function applyCardChrome(
  source: HTMLElement,
  dest: HTMLElement,
  colors: "computed" | "light",
): void {
  const computed = window.getComputedStyle(source);
  dest.style.borderRadius = computed.borderRadius;
  dest.style.overflow = "hidden";
  dest.style.backgroundColor =
    colors === "light"
      ? LIGHT_EXPORT_BACKGROUND
      : resolvedFill(computed.backgroundColor);
  const border = readCardBorder(source);
  if (border) {
    dest.style.borderWidth = border.width;
    dest.style.borderStyle = border.style;
    dest.style.borderColor =
      colors === "light" ? LIGHT_EXPORT_BORDER : border.color;
  }
}

function applyLightThemeSvgText(root: HTMLElement): void {
  for (const node of root.querySelectorAll("text, tspan")) {
    if (!(node instanceof SVGElement)) {
      continue;
    }
    node.style.fill = LIGHT_EXPORT_TEXT;
    node.style.color = LIGHT_EXPORT_TEXT;
  }
}

function hideCardBeforePseudo(): () => void {
  const style = document.createElement("style");
  style.setAttribute("data-chart-export-hide-before", "");
  style.textContent = `
[${CHART_EXPORT_CAPTURING_ATTR}] .pf-v6-c-card::before,
[${CHART_EXPORT_CAPTURING_ATTR}].pf-v6-c-card::before {
  border: none !important;
  box-shadow: none !important;
}
`;
  document.head.append(style);
  return () => {
    style.remove();
  };
}

function copyComputedPadding(node: HTMLElement): {
  paddingTop: string;
  paddingRight: string;
  paddingBottom: string;
  paddingLeft: string;
} {
  const previous = {
    paddingTop: node.style.paddingTop,
    paddingRight: node.style.paddingRight,
    paddingBottom: node.style.paddingBottom,
    paddingLeft: node.style.paddingLeft,
  };
  applyComputedPadding(node, node);
  return previous;
}

function copyCardChrome(node: HTMLElement): {
  borderRadius: string;
  backgroundColor: string;
  overflow: string;
  overflowPriority: string;
  borderWidth: string;
  borderStyle: string;
  borderColor: string;
  minHeight: string;
  height: string;
  maxHeight: string;
} {
  const previous = {
    borderRadius: node.style.borderRadius,
    backgroundColor: node.style.backgroundColor,
    overflow: node.style.getPropertyValue("overflow"),
    overflowPriority: node.style.getPropertyPriority("overflow"),
    borderWidth: node.style.borderWidth,
    borderStyle: node.style.borderStyle,
    borderColor: node.style.borderColor,
    minHeight: node.style.minHeight,
    height: node.style.height,
    maxHeight: node.style.maxHeight,
  };
  applyCardChrome(node, node, "computed");
  node.style.minHeight = "0px";
  node.style.height = "auto";
  node.style.maxHeight = "none";
  return previous;
}

function applyComputedStylesToClone(
  sourceRoot: HTMLElement,
  clonedRoot: HTMLElement,
): void {
  const sourceCards = queryCards(sourceRoot);
  const cloneCards = queryCards(clonedRoot);
  sourceCards.forEach((source, index) => {
    const dest = cloneCards[index];
    if (dest) {
      applyCardChrome(source, dest, "light");
    }
  });

  const sources = sourceRoot.querySelectorAll<HTMLElement>(
    PADDED_CAPTURE_SELECTOR,
  );
  const dests = clonedRoot.querySelectorAll<HTMLElement>(
    PADDED_CAPTURE_SELECTOR,
  );
  sources.forEach((source, index) => {
    const dest = dests[index];
    if (dest) {
      applyComputedPadding(source, dest);
    }
  });
}

function prepareCaptureLayout(element: HTMLElement): () => void {
  const expandNodes = [
    element,
    ...Array.from(
      element.querySelectorAll<HTMLElement>(
        `[${CHART_EXPORT_SCROLL_ATTR}], .pf-v6-c-card__body`,
      ),
    ),
  ];
  const cards = queryCards(element);
  const paddedNodes = Array.from(
    element.querySelectorAll<HTMLElement>(PADDED_CAPTURE_SELECTOR),
  );
  const previousExpand = expandNodes.map((node) => ({
    node,
    overflow: node.style.getPropertyValue("overflow"),
    overflowPriority: node.style.getPropertyPriority("overflow"),
    maxHeight: node.style.maxHeight,
    height: node.style.height,
  }));
  const previousChrome = cards.map((node) => ({
    node,
    ...copyCardChrome(node),
  }));
  const previousPadding = paddedNodes.map((node) => ({
    node,
    ...copyComputedPadding(node),
  }));

  for (const node of expandNodes) {
    node.style.setProperty("overflow", "visible", "important");
    node.style.maxHeight = "none";
    node.style.height = "auto";
  }

  return () => {
    for (const entry of previousExpand) {
      if (entry.overflow) {
        entry.node.style.setProperty(
          "overflow",
          entry.overflow,
          entry.overflowPriority,
        );
      } else {
        entry.node.style.removeProperty("overflow");
      }
      entry.node.style.maxHeight = entry.maxHeight;
      entry.node.style.height = entry.height;
    }
    for (const entry of previousChrome) {
      entry.node.style.borderRadius = entry.borderRadius;
      entry.node.style.backgroundColor = entry.backgroundColor;
      if (entry.overflow) {
        entry.node.style.setProperty(
          "overflow",
          entry.overflow,
          entry.overflowPriority,
        );
      } else {
        entry.node.style.removeProperty("overflow");
      }
      entry.node.style.borderWidth = entry.borderWidth;
      entry.node.style.borderStyle = entry.borderStyle;
      entry.node.style.borderColor = entry.borderColor;
      entry.node.style.minHeight = entry.minHeight;
      entry.node.style.height = entry.height;
      entry.node.style.maxHeight = entry.maxHeight;
    }
    for (const entry of previousPadding) {
      entry.node.style.paddingTop = entry.paddingTop;
      entry.node.style.paddingRight = entry.paddingRight;
      entry.node.style.paddingBottom = entry.paddingBottom;
      entry.node.style.paddingLeft = entry.paddingLeft;
    }
  };
}

export async function captureChartElement(
  element: HTMLElement,
): Promise<HTMLCanvasElement> {
  const restoreHidden = revealHiddenChartAncestors(element);
  const restoreLayout = prepareCaptureLayout(element);
  element.setAttribute(CHART_EXPORT_CAPTURING_ATTR, "");
  const restoreCardBefore = hideCardBeforePseudo();

  try {
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve());
    });
    if (element.getBoundingClientRect().width < 1) {
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve());
      });
    }
    return html2canvas(element, {
      useCORS: true,
      backgroundColor: LIGHT_EXPORT_BACKGROUND,
      logging: false,
      scale: CHART_CAPTURE_SCALE,
      imageTimeout: 0,
      ignoreElements: (node) =>
        node instanceof Element &&
        shouldIgnoreChartExportElement(node, element),
      onclone: (clonedDoc, clonedElement) => {
        applyLightThemeToDocument(clonedDoc);
        applyComputedStylesToClone(element, clonedElement);
        applyLightThemeSvgText(clonedElement);
      },
    });
  } finally {
    restoreCardBefore();
    element.removeAttribute(CHART_EXPORT_CAPTURING_ATTR);
    restoreLayout();
    restoreHidden();
  }
}
