import { Content } from "@patternfly/react-core";
import type React from "react";

interface HeaderProps {
  totalVMs?: number;
  totalClusters?: number;
  isConnected?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  totalVMs = 0,
  totalClusters = 0,
}) => {
  return (
    <Content component="p">
      Detected <strong>{totalVMs.toLocaleString()} VMs</strong> in{" "}
      <strong>
        {totalClusters} {totalClusters === 1 ? "cluster" : "clusters"}
      </strong>
      .
    </Content>
  );
};

Header.displayName = "Header";
