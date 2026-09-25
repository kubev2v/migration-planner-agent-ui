import { Button, Flex, FlexItem } from "@patternfly/react-core";
import { DownloadIcon } from "@patternfly/react-icons";
import type { FC, ReactNode } from "react";
import { chartExportHideProps } from "./chartExport.js";
import { useChartExport } from "./chartExportContext.js";

export const ChartDownloadButton: FC<{
  chartId: string;
  title?: string;
}> = ({ chartId, title }) => {
  const exportApi = useChartExport();
  if (!exportApi) {
    return null;
  }

  const label = title ? `Download ${title} as PNG` : "Download chart as PNG";

  return (
    <Button
      variant="plain"
      icon={<DownloadIcon />}
      aria-label={label}
      isLoading={exportApi.downloadingChartId === chartId}
      isDisabled={exportApi.isBusy}
      onClick={() => {
        void exportApi.downloadChart(chartId);
      }}
    />
  );
};

ChartDownloadButton.displayName = "ChartDownloadButton";

export const ChartHeaderActions: FC<{
  chartId: string;
  title?: string;
  children?: ReactNode;
}> = ({ chartId, title, children }) => {
  const exportApi = useChartExport();
  if (!exportApi && !children) {
    return null;
  }

  return (
    <FlexItem {...chartExportHideProps}>
      <Flex
        alignItems={{ default: "alignItemsCenter" }}
        spaceItems={{ default: "spaceItemsSm" }}
      >
        {children}
        {exportApi ? (
          <ChartDownloadButton chartId={chartId} title={title} />
        ) : null}
      </Flex>
    </FlexItem>
  );
};

ChartHeaderActions.displayName = "ChartHeaderActions";
