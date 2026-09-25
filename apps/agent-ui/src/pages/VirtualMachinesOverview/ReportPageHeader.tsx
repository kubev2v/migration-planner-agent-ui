import {
  ReportExportMenu,
  type ReportExportOption,
  useChartExport,
} from "@openshift-migration-advisor/shared-components";
import {
  Alert,
  AlertActionCloseButton,
  Content,
  ContentVariants,
  Flex,
  FlexItem,
  InputGroup,
  InputGroupItem,
} from "@patternfly/react-core";
import type React from "react";
import { DeleteCollectedDataButton } from "../../common/report/DeleteCollectedDataButton";
import { ExportButton } from "../../common/report/ExportButton";
import { RunNewReportButton } from "../../common/report/RunNewReportButton";
import { buildOverviewExportOptions } from "./reportExportOptions";

interface ReportPageHeaderProps {
  showExport?: boolean;
  onExportClick?: () => void;
  exportOptions?: ReportExportOption[];
  isExporting?: boolean;
  exportLoadingLabel?: string | null;
}

export const ReportPageHeader: React.FC<ReportPageHeaderProps> = ({
  showExport = false,
  onExportClick,
  exportOptions,
  isExporting = false,
  exportLoadingLabel = null,
}) => {
  const hasExportMenu = Boolean(showExport && exportOptions?.length);
  const canExport = hasExportMenu || (showExport && Boolean(onExportClick));

  return (
    <Flex justifyContent={{ default: "justifyContentSpaceBetween" }}>
      <FlexItem>
        <Content component={ContentVariants.h1}>
          Virtual machines overview
        </Content>
      </FlexItem>
      <Flex alignItems={{ default: "alignItemsCenter" }}>
        <RunNewReportButton />
        <FlexItem>
          <InputGroup>
            {canExport && (
              <InputGroupItem>
                {hasExportMenu && exportOptions ? (
                  <ReportExportMenu
                    options={exportOptions}
                    isLoading={isExporting}
                    loadingLabel={exportLoadingLabel}
                  />
                ) : (
                  <ExportButton onClick={onExportClick} />
                )}
              </InputGroupItem>
            )}
            <InputGroupItem>
              <DeleteCollectedDataButton />
            </InputGroupItem>
          </InputGroup>
        </FlexItem>
      </Flex>
    </Flex>
  );
};

ReportPageHeader.displayName = "ReportPageHeader";

interface OverviewReportHeaderProps {
  showExport?: boolean;
  onExportInventory?: () => void;
  documentTitle: string;
  enableHtml?: boolean;
}

export const OverviewReportHeader: React.FC<OverviewReportHeaderProps> = ({
  showExport = false,
  onExportInventory,
  documentTitle,
  enableHtml = true,
}) => {
  const charts = useChartExport();
  const exportOptions = buildOverviewExportOptions({
    onExportPdf: charts
      ? () => {
          void charts.downloadPdf(documentTitle);
        }
      : undefined,
    onExportPng: charts
      ? () => {
          void charts.downloadAll();
        }
      : undefined,
    onExportHtml:
      charts && enableHtml
        ? () => {
            void charts.downloadHtml(documentTitle);
          }
        : undefined,
    onExportInventory: showExport ? onExportInventory : undefined,
  });

  return (
    <>
      <ReportPageHeader
        showExport={showExport || exportOptions.length > 0}
        exportOptions={exportOptions}
        isExporting={Boolean(charts?.isBusy)}
        exportLoadingLabel={charts?.exportLoadingLabel}
      />
      {charts?.exportError ? (
        <Alert
          variant="danger"
          title="Export failed"
          isInline
          actionClose={
            <AlertActionCloseButton onClose={charts.clearExportError} />
          }
        >
          {charts.exportError}
        </Alert>
      ) : null}
    </>
  );
};

OverviewReportHeader.displayName = "OverviewReportHeader";
