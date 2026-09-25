import {
  createContext,
  type RefCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  type ChartExportMeta,
  chartPngFilename,
  type RegisteredChart,
} from "./chartExport.js";

export type ChartExportFormat = "pdf" | "png" | "html";

export type ChartExportApi = {
  downloadChart: (id: string) => Promise<void>;
  downloadAll: () => Promise<void>;
  downloadPdf: (documentTitle: string) => Promise<void>;
  downloadHtml: (documentTitle: string) => Promise<void>;
  downloadingChartId: string | null;
  exportingFormat: ChartExportFormat | null;
  exportLoadingLabel: string | null;
  isExportingAll: boolean;
  isBusy: boolean;
  exportError: string | null;
  clearExportError: () => void;
};

export type ChartExportRegistry = {
  register: (chart: RegisteredChart) => () => void;
};

export const ChartExportRegistryContext =
  createContext<ChartExportRegistry | null>(null);
export const ChartExportApiContext = createContext<ChartExportApi | null>(null);

export function useChartExport(): ChartExportApi | null {
  return useContext(ChartExportApiContext);
}

export function useRegisterChart({
  id,
  title,
  filename,
}: ChartExportMeta): RefCallback<HTMLElement> {
  const registry = useContext(ChartExportRegistryContext);
  const [element, setElement] = useState<HTMLElement | null>(null);
  const resolvedFilename = filename ?? chartPngFilename(title, id);

  useEffect(() => {
    if (!registry || !element) {
      return;
    }
    return registry.register({
      id,
      title,
      filename: resolvedFilename,
      element,
    });
  }, [element, id, registry, resolvedFilename, title]);

  return setElement;
}
