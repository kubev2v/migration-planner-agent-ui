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
        <FlexItem>
          <InputGroup>
            {canExport && (
              <InputGroupItem>
                <ExportButton onClick={onExportClick} />
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
