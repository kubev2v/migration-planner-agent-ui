import { Label, Tooltip } from "@patternfly/react-core";
import type { FC } from "react";
import {
  getSupportTierBadgeColor,
  getSupportTierBadgeInlineStyle,
  getSupportTierDefinition,
  getSupportTierLegendLabel,
  type SupportTier,
} from "./osSupportTier.js";

interface SupportTierBadgeProps {
  tier: SupportTier;
}

export const SupportTierBadge: FC<SupportTierBadgeProps> = ({ tier }) => (
  <Tooltip content={getSupportTierDefinition(tier)}>
    <span>
      <Label
        color={getSupportTierBadgeColor(tier)}
        isCompact
        style={getSupportTierBadgeInlineStyle(tier)}
      >
        {getSupportTierLegendLabel(tier)}
      </Label>
    </span>
  </Tooltip>
);

SupportTierBadge.displayName = "SupportTierBadge";
