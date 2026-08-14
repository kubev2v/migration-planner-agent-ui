import {
  Button,
  Content,
  ContentVariants,
  Flex,
  FlexItem,
} from "@patternfly/react-core";
import { ExportIcon } from "@patternfly/react-icons";
import type React from "react";
import { RunNewReportButton } from "../../common/report/RunNewReportButton";

interface ReportPageHeaderProps {
  showExport?: boolean;
  onExportClick?: () => void;
}

export const ReportPageHeader: React.FC<ReportPageHeaderProps> = ({
  showExport = false,
  onExportClick,
}) => {
  const canExport = showExport && Boolean(onExportClick);

  return (
    <Flex justifyContent={{ default: "justifyContentSpaceBetween" }}>
      <FlexItem>
        <Content component={ContentVariants.h1}>
          Virtual machines overview
        </Content>
      </FlexItem>
      <Flex alignItems={{ default: "alignItemsCenter" }}>
        <RunNewReportButton />
        {canExport && (
          <FlexItem>
            <Button
              variant="link"
              onClick={onExportClick}
              icon={<ExportIcon />}
            >
              Export
            </Button>
          </FlexItem>
        )}
      </Flex>
    </Flex>
  );
};

ReportPageHeader.displayName = "ReportPageHeader";
