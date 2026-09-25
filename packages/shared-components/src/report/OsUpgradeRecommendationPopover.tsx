import { css } from "@emotion/css";
import { Button, Flex, FlexItem, Popover } from "@patternfly/react-core";
import { InfoCircleIcon } from "@patternfly/react-icons";
import type { FC } from "react";
import { chartExportHideProps } from "./chartExport.js";

const upgradeRecommendationPopoverCloseButton = css`
  .pf-v6-c-popover__close .pf-v6-c-button.pf-m-plain,
  .pf-v6-c-popover__close .pf-v6-c-button.pf-m-plain:hover {
    color: var(--pf-t--global--text--color--regular);
  }
`;

const infoButtonStyle = css`
  padding: 0;
  vertical-align: middle;
`;

interface OsUpgradeRecommendationPopoverProps {
  upgradeRecommendation: string;
}

export const OsUpgradeRecommendationPopover: FC<
  OsUpgradeRecommendationPopoverProps
> = ({ upgradeRecommendation }) => (
  <Popover
    className={upgradeRecommendationPopoverCloseButton}
    position="bottom"
    headerContent="Upgrade to get support"
    bodyContent={<div>{upgradeRecommendation}</div>}
  >
    <Button
      type="button"
      aria-label="Open operating system upgrade information"
      variant="plain"
      className={infoButtonStyle}
    >
      <InfoCircleIcon color="var(--pf-t--global--icon--color--status--info--default)" />
    </Button>
  </Popover>
);

OsUpgradeRecommendationPopover.displayName = "OsUpgradeRecommendationPopover";

interface OsNameCellProps {
  osName: string;
  upgradeRecommendation?: string;
}

export const OsNameCell: FC<OsNameCellProps> = ({
  osName,
  upgradeRecommendation,
}) => {
  const hasUpgradeRecommendation =
    upgradeRecommendation && upgradeRecommendation.trim() !== "";

  if (!hasUpgradeRecommendation) {
    return <>{osName}</>;
  }

  return (
    <Flex
      alignItems={{ default: "alignItemsCenter" }}
      spaceItems={{ default: "spaceItemsXs" }}
      flexWrap={{ default: "nowrap" }}
    >
      <FlexItem>{osName}</FlexItem>
      <FlexItem shrink={{ default: "shrink" }} {...chartExportHideProps}>
        <OsUpgradeRecommendationPopover
          upgradeRecommendation={upgradeRecommendation}
        />
      </FlexItem>
    </Flex>
  );
};

OsNameCell.displayName = "OsNameCell";
