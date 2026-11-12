import { css } from "@emotion/css";
import { Badge } from "@patternfly/react-core";
import type { FC } from "react";

import PopoverIcon from "../../../PopoverIcon.js";
import {
  getComplexityBadgeStyle,
  getComplexityLabel,
} from "./complexityConstants.js";

const COMPLEXITY_TIER_SCORES = [1, 2, 3, 4, 0] as const;

const COMPLEXITY_TIER_DESCRIPTIONS: Record<number, string> = {
  1: "Modern, natively supported operating systems (e.g., RHEL 8/9) paired with smaller disk sizes under 10 TB. These workloads present the lowest risk and fastest turnaround.",
  2: "Typically features modern operating systems with moderate disk sizes (10–20 TB), or slightly older but well-documented operating systems with small disk sizes.",
  3: "Workloads with larger disk sizes (20–50 TB) that require longer data transfer times, or legacy operating systems that require specific configuration adjustments.",
  4: "Massive disk sizes (50+ TB) requiring extended migration windows, or heavily outdated/unsupported operating systems that require complex manual intervention.",
  0: "The operating system is not recognized by the built-in migration list. Because the planner cannot verify OS compatibility, a reliable complexity and risk assessment cannot be generated.",
};

const tierListStyle = css`
  list-style: none;
  padding: 0;
  margin: var(--pf-t--global--spacer--200) 0 0;
  display: flex;
  flex-direction: column;
  gap: var(--pf-t--global--spacer--300);
`;

const tierItemStyle = css`
  display: flex;
  gap: var(--pf-t--global--spacer--200);
  align-items: flex-start;
`;

const tierBadgeStyle = css`
  flex-shrink: 0;
`;

const tierDefinitionsTitleStyle = css`
  font-weight: var(--pf-t--global--font--weight--body--bold);
  margin-top: var(--pf-t--global--spacer--200);
`;

const MigrationComplexityHelpBody: FC = () => (
  <div>
    <p>
      Complexity is determined by combining a virtual machine&apos;s Operating
      System support tier and its total Disk Size.
    </p>
    <div className={tierDefinitionsTitleStyle}>
      Complexity Tier Definitions:
    </div>
    <ul className={tierListStyle}>
      {COMPLEXITY_TIER_SCORES.map((score) => (
        <li key={score} className={tierItemStyle}>
          <Badge
            className={tierBadgeStyle}
            style={getComplexityBadgeStyle(score)}
          >
            {getComplexityLabel(score)}
          </Badge>
          <span>{COMPLEXITY_TIER_DESCRIPTIONS[score]}</span>
        </li>
      ))}
    </ul>
  </div>
);

export const MigrationComplexityHelpPopover: FC = () => (
  <PopoverIcon
    noVerticalAlign
    maxWidth="40rem"
    headerContent="How is migration complexity calculated?"
    bodyContent={<MigrationComplexityHelpBody />}
    buttonOuiaId="migration-complexity-help"
    aria-label="Migration complexity help"
  />
);

MigrationComplexityHelpPopover.displayName = "MigrationComplexityHelpPopover";
