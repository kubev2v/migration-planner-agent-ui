import { SearchIcon } from "@patternfly/react-icons";
import type React from "react";
import { AppEmptyState } from "../../../../common/components";

interface VmDetailListSearchEmptyStateProps {
  titleText: string;
}

export const VmDetailListSearchEmptyState: React.FC<
  VmDetailListSearchEmptyStateProps
> = ({ titleText }) => (
  <AppEmptyState titleText={titleText} icon={SearchIcon} />
);

VmDetailListSearchEmptyState.displayName = "VmDetailListSearchEmptyState";
