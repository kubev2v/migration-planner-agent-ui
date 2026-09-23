import { Button, Flex, FlexItem } from "@patternfly/react-core";
import { DownloadIcon } from "@patternfly/react-icons";
import { createContext, type ReactNode, useContext } from "react";
import type { ExportChartSpec } from "./captureExportCharts";
import { singleChartFilename } from "./chartExportCapture";

export type ChartDownloadApi = {
  downloadChart: (spec: ExportChartSpec) => Promise<void>;
  downloadingChartId: string | null;
  isBusy: boolean;
};

const ChartDownloadContext = createContext<ChartDownloadApi | null>(null);

export function ChartDownloadProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: ChartDownloadApi;
}) {
  return (
    <ChartDownloadContext.Provider value={value}>
      {children}
    </ChartDownloadContext.Provider>
  );
}

export function useChartDownload(): ChartDownloadApi | null {
  return useContext(ChartDownloadContext);
}

export function ChartHeaderActions({ children }: { children: ReactNode }) {
  return (
    <FlexItem>
      <Flex
        alignItems={{ default: "alignItemsCenter" }}
        spaceItems={{ default: "spaceItemsSm" }}
      >
        {children}
      </Flex>
    </FlexItem>
  );
}

export function ChartDownloadButton({
  chartId,
  title,
  getNode,
}: {
  chartId: string;
  title: string;
  getNode: () => ReactNode;
}) {
  const download = useChartDownload();
  if (!download) {
    return null;
  }

  return (
    <Button
      variant="plain"
      icon={<DownloadIcon />}
      aria-label={`Download ${title} as PNG`}
      isLoading={download.downloadingChartId === chartId}
      isDisabled={download.isBusy}
      onClick={() => {
        void download.downloadChart({
          id: chartId,
          title,
          filename: singleChartFilename(title),
          node: getNode(),
        });
      }}
    />
  );
}
