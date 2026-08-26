import { Button, Content, Flex, FlexItem } from "@patternfly/react-core";
import { SyncAltIcon } from "@patternfly/react-icons";
import type React from "react";
import { formatReportRunDate } from "../../pages/ReportComparison/comparisonFormatting";
import { useListCollectionsQuery } from "../../store/api/comparisonEndpoints";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  openModal,
  selectIsCollecting,
} from "../../store/slices/collectionLifecycleSlice";

export const RunNewReportButton: React.FC = () => {
  const dispatch = useAppDispatch();
  const isCollecting = useAppSelector(selectIsCollecting);
  const { data: collections } = useListCollectionsQuery();

  const latestCollection = collections?.[0];
  if (!latestCollection) return null;
  return (
    <Flex alignItems={{ default: "alignItemsCenter" }}>
      {latestCollection.createdAt && (
        <FlexItem>
          <Content component="p">
            Latest run: {formatReportRunDate(latestCollection.createdAt)}
          </Content>
        </FlexItem>
      )}
      <FlexItem>
        <Button
          variant="secondary"
          onClick={() => dispatch(openModal())}
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
