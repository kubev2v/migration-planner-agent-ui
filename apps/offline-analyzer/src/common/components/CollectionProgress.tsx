import { Content } from "@patternfly/react-core";
import type React from "react";

interface CollectionProgressProps {
  percentage: number;
  statusText: string;
}

export const CollectionProgress: React.FC<CollectionProgressProps> = ({
  percentage,
  statusText,
}) => {
  return (
    <Content component="small">
      {percentage}% done. {statusText}
    </Content>
  );
};

CollectionProgress.displayName = "CollectionProgress";
