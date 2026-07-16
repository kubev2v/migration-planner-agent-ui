import {
  Bullseye,
  EmptyState,
  EmptyStateVariant,
} from "@patternfly/react-core";
import { SearchIcon } from "@patternfly/react-icons";
import type React from "react";

interface VmDetailListSearchEmptyStateProps {
  titleText: string;
}

export const VmDetailListSearchEmptyState: React.FC<
  VmDetailListSearchEmptyStateProps
> = ({ titleText }) => (
  <Bullseye style={{ padding: "32px 0" }}>
    <EmptyState
      headingLevel="h3"
      titleText={titleText}
      icon={SearchIcon}
      variant={EmptyStateVariant.sm}
    />
  </Bullseye>
);

VmDetailListSearchEmptyState.displayName = "VmDetailListSearchEmptyState";
