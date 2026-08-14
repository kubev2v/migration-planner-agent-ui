import { Button, Content, Flex, FlexItem } from "@patternfly/react-core";
import { SyncAltIcon } from "@patternfly/react-icons";
import type React from "react";
import { useEffect } from "react";
import { formatReportRunDate } from "../../pages/ReportComparison/comparisonFormatting";
import { useReportsContext } from "./ReportsContext";

export const RunNewReportButton: React.FC = () => {
  const {
    latestCollectionDate,
    isCollecting,
    hasCollectionData,
    refetchCollections,
    openModal,
  } = useReportsContext();

  useEffect(() => {
    void refetchCollections();
  }, [refetchCollections]);

  if (!hasCollectionData) return null;
  return (
    <Flex alignItems={{ default: "alignItemsCenter" }}>
      {latestCollectionDate && (
        <FlexItem>
          <Content component="p">
            Latest run: {formatReportRunDate(latestCollectionDate)}
          </Content>
        </FlexItem>
      )}
      <FlexItem>
        <Button
          variant="secondary"
          onClick={openModal}
          icon={<SyncAltIcon />}
          isDisabled={isCollecting}
        >
          Run new report
        </Button>
      </FlexItem>
    </Flex>
  );
};

RunNewReportButton.displayName = "RunNewReportButton";
