import { Label } from "@patternfly/react-core";
import { CheckCircleIcon, TimesCircleIcon } from "@patternfly/react-icons";
import type { FC } from "react";
import type { FeatureStatus } from "./infrastructureSummaryModel.js";

export interface FeatureStatusBadgeProps {
  status: FeatureStatus;
}

export const FeatureStatusBadge: FC<FeatureStatusBadgeProps> = ({ status }) => {
  if (status === "unknown") {
    return <span>—</span>;
  }

  if (status === "enabled") {
    return (
      <Label color="green" isCompact icon={<CheckCircleIcon />}>
        Enabled
      </Label>
    );
  }

  return (
    <Label color="grey" isCompact icon={<TimesCircleIcon />}>
      Disabled
    </Label>
  );
};

FeatureStatusBadge.displayName = "FeatureStatusBadge";
