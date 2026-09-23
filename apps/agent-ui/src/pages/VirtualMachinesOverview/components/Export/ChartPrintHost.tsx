import { css } from "@emotion/css";
import {
  forwardRef,
  type ReactNode,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { createPortal, flushSync } from "react-dom";
import {
  captureElementToCanvas,
  prepareExportContainer,
} from "./chartExportCapture";

const printHost = css`
  position: fixed;
  left: -9999px;
  top: 0;
  z-index: -1;
  pointer-events: none;
`;

const printSurface = css`
  width: 1100px;
  padding: 24px;
  background-color: var(--pf-t--global--background--color--primary--default);

  .pf-v6-c-card {
    box-shadow: none !important;
    max-height: none !important;
    overflow: visible !important;
  }

  .pf-v6-c-card__body {
    overflow: visible !important;
    max-height: none !important;
  }
`;

export interface ChartPrintHostHandle {
  capture: (node: ReactNode) => Promise<HTMLCanvasElement>;
  clear: () => void;
}

export const ChartPrintHost = forwardRef<ChartPrintHostHandle>(
  function ChartPrintHost(_, ref) {
    const [node, setNode] = useState<ReactNode>(null);
    const surfaceRef = useRef<HTMLDivElement>(null);
    const [host] = useState(() => {
      const element = document.createElement("div");
      element.id = "chart-print-host";
      element.className = printHost;
      element.setAttribute("aria-hidden", "true");
      return element;
    });

    useEffect(() => {
      document.body.appendChild(host);
      return () => {
        host.remove();
      };
    }, [host]);

    useImperativeHandle(ref, () => ({
      async capture(chartNode: ReactNode) {
        flushSync(() => {
          setNode(chartNode);
        });
        const surface = surfaceRef.current;
        if (!surface) {
          throw new Error("The chart print host is not ready.");
        }
        await prepareExportContainer(surface);
        return captureElementToCanvas(surface);
      },
      clear() {
        flushSync(() => {
          setNode(null);
        });
      },
    }));

    return createPortal(
      <div ref={surfaceRef} className={printSurface} data-chart-print-host="">
        {node}
      </div>,
      host,
    );
  },
);

ChartPrintHost.displayName = "ChartPrintHost";
