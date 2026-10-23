import { css } from "@emotion/css";
import { Label } from "@patternfly/react-core";
import { CheckCircleIcon, TimesCircleIcon } from "@patternfly/react-icons";
import type { FC } from "react";
import type { FeatureStatus } from "./infrastructureSummaryModel.js";

/** Outline labels use a lighter icon token than body text; match text for contrast. */
const disabledFeatureLabelClass = css`
  --pf-v6-c-label__icon--Color: var(--pf-v6-c-label--Color);
`;

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
    <Label
      className={disabledFeatureLabelClass}
      variant="outline"
      isCompact
      icon={<TimesCircleIcon />}
    >
      Disabled
    </Label>
  );
};

FeatureStatusBadge.displayName = "FeatureStatusBadge";
