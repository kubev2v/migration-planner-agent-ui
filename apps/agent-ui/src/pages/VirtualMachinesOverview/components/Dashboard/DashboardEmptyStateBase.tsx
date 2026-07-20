import {
  EmptyState,
  EmptyStateBody,
  EmptyStateVariant,
} from "@patternfly/react-core";
import { SearchIcon } from "@patternfly/react-icons";
import type { SVGIconProps } from "@patternfly/react-icons/dist/js/createIcon";
import type React from "react";

export interface DashboardEmptyStateBaseProps {
  title: string;
  body: string;
  icon?: React.ComponentType<SVGIconProps>;
}

export const DashboardEmptyStateBase: React.FC<
  DashboardEmptyStateBaseProps
> = ({ title, body, icon: IconComponent = SearchIcon }) => (
  <EmptyState
    headingLevel="h4"
    icon={IconComponent}
    titleText={title}
    variant={EmptyStateVariant.sm}
  >
    <EmptyStateBody>{body}</EmptyStateBody>
  </EmptyState>
);

DashboardEmptyStateBase.displayName = "DashboardEmptyStateBase";
