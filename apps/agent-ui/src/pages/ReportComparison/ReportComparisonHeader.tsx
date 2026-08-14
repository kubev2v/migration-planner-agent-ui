import {
  Button,
  Content,
  ContentVariants,
  Flex,
  FlexItem,
} from "@patternfly/react-core";
import { ExportIcon } from "@patternfly/react-icons";
import type React from "react";
import { RunReport } from "../../common/report/RunReport";

interface ReportComparisonHeaderProps {
  showExport?: boolean;
  onExportClick?: () => void;
  isExporting?: boolean;
  description?: React.ReactNode;
}

export const ReportComparisonHeader: React.FC<ReportComparisonHeaderProps> = ({
  showExport = false,
  onExportClick,
  isExporting = false,
  description,
}) => {
  const canExport = showExport && Boolean(onExportClick);

  return (
    <Flex justifyContent={{ default: "justifyContentSpaceBetween" }}>
      <FlexItem>
        <Content component={ContentVariants.h1}>Report comparison</Content>
        {description ? <Content component="p">{description}</Content> : null}
      </FlexItem>
      <Flex alignItems={{ default: "alignItemsCenter" }}>
        <RunReport />
        {canExport ? (
          <FlexItem>
            <Button
              variant="link"
              onClick={onExportClick}
              icon={<ExportIcon />}
              isLoading={isExporting}
              isDisabled={isExporting}
            >
              Export report as ZIP
            </Button>
          </FlexItem>
        ) : null}
      </Flex>
    </Flex>
  );
};

ReportComparisonHeader.displayName = "ReportComparisonHeader";
