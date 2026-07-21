import { css } from "@emotion/css";
import { Content, Flex, FlexItem, Icon } from "@patternfly/react-core";
import { InfoCircleIcon } from "@patternfly/react-icons";
import type React from "react";

const noticeStyle = css`
  margin-bottom: var(--pf-t--global--spacer--200);
`;

export const OsUpgradeNotice: React.FC = () => (
  <Flex
    alignItems={{ default: "alignItemsCenter" }}
    spaceItems={{ default: "spaceItemsSm" }}
    className={noticeStyle}
  >
    <FlexItem>
      <Icon status="info">
        <InfoCircleIcon />
      </Icon>
    </FlexItem>
    <FlexItem>
      <Content component="p" style={{ fontWeight: 500 }}>
        Some operating systems may need upgrades before migration
      </Content>
    </FlexItem>
  </Flex>
);

OsUpgradeNotice.displayName = "OsUpgradeNotice";
