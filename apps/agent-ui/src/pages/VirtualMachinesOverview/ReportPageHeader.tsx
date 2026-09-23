import {
  ReportExportMenu,
  type ReportExportOption,
} from "@openshift-migration-advisor/shared-components";
import {
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
